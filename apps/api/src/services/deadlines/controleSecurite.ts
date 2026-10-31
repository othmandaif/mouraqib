import { CanalAlerte, StatutAlerte, TypeAlerte } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { redisConnection } from '../../jobs/queues'
import { logger } from '../../utils/logger'
import { joursCalendaires } from '../../utils/dateMaroc'
import { AlertService } from '../alerts/alertService'
import { etatMahakim } from '../scraper/santeMahakim'
import { scraperQueue } from '../../jobs/queues'

const H = 3_600_000
const alertService = new AlertService()

/** Chaque worker signale qu'il tourne ; le contrôle de sécurité vérifie que personne ne s'est arrêté. */
export async function battement(nom: 'scraper' | 'nlp' | 'alerts' | 'deadlines'): Promise<void> {
  await redisConnection.set(`heartbeat:${nom}`, String(Date.now())).catch(() => {})
}

// Âge maximal normal de chaque battement (fréquence du job + marge)
const SEUILS = { scraper: 5 * H, nlp: 1.5 * H, alerts: 0.5 * H, deadlines: 2 * H } as const
// « تعذّرت مزامنة » à l'avocat : au-delà de 2 fois l'intervalle des dossiers dormants (24 h). À 26 h, le moindre
// retard du robot sur les dormants envoyait l'alerte à des centaines d'avocats sans raison.
const ALERTE_SYNC_MS = Number(process.env.SYNC_ALERTE_H ?? 48) * H
const PAR_MINUTE = Number(process.env.SCRAPER_PAR_MINUTE ?? 20)

export interface RapportSante {
  ok: boolean
  generesLe: string
  workers: { nom: string; dernierPassage: string | null; enRetard: boolean }[]
  dossiersNonSynchronises: number
  mahakim: { panneDepuis: string | null; echecsConsecutifs: number; enPause: boolean }
  /** Dossiers en file de synchronisation et temps pour la vider au débit autorisé (SCRAPER_PAR_MINUTE). */
  fileSynchro: { enAttente: number; parMinute: number; heuresPourVider: number }
  evenementsEnAttente: number
  evenementsAVerifier: number
  alertesWhatsappEchouees24h: number
  delaisUrgentsSansWhatsapp: { userId: string; nom: string; telephone: string | null; delais: number }[]
}

/**
 * Filet de sécurité « aucun délai raté », lancé chaque heure avec le job des délais :
 * 1. dossiers que mahakim n'a pas mis à jour depuis 26 h → alerte « تعذّرت مزامنة » à l'avocat ;
 * 2. événements que ni les règles ni l'IA n'ont su classer → l'avocat est invité à trancher ;
 * 3. rapport pour l'administrateur (workers arrêtés, WhatsApp en échec, avocats à appeler).
 */
/** @param agir false = simple lecture (écran admin), true = crée aussi les alertes (job horaire). */
export async function controleSecurite(agir = true): Promise<RapportSante> {
  const maintenant = Date.now()

  // 1. Dossiers non synchronisés
  const whereNonSync = {
    estActif: true,
    OR: [
      { derniereVerif: { lt: new Date(maintenant - ALERTE_SYNC_MS) } },
      { derniereVerif: null, createdAt: { lt: new Date(maintenant - 6 * H) } },
    ],
  }
  const [nonSync, nbNonSync, mahakim, file] = await Promise.all([
    prisma.dossier.findMany({ where: whereNonSync, select: { id: true }, take: 500 }),
    prisma.dossier.count({ where: whereNonSync }),
    etatMahakim(),
    scraperQueue.getJobCounts('waiting', 'prioritized', 'active', 'delayed').catch(() => ({} as Record<string, number>)),
  ])
  // mahakim en panne : ce n'est pas le dossier de l'avocat qui pose problème, l'administrateur est prévenu (rapport)
  if (agir && !mahakim.panneDepuis) for (const d of nonSync) await alertService.alerterEchecSync(d.id) // dédoublonné sur 24 h
  const enAttente = Object.values(file).reduce((s, n) => s + (n ?? 0), 0)
  const fileSynchro = { enAttente, parMinute: PAR_MINUTE, heuresPourVider: Math.round((enAttente / PAR_MINUTE / 60) * 10) / 10 }

  // 2. Événements à vérifier (classement impossible) : une alerte par événement, une seule fois
  const aVerifier = !agir ? [] : await prisma.evenement.findMany({
    where: { sousType: 'A_VERIFIER', alertes: { none: { message: 'verif:classification' } } },
    select: { id: true, dossierId: true, dossier: { select: { userId: true } } },
    take: 200,
  })
  for (const ev of aVerifier) {
    await prisma.alerte.create({
      data: {
        userId: ev.dossier.userId, dossierId: ev.dossierId, evenementId: ev.id, canal: CanalAlerte.IN_APP,
        typeAlerte: TypeAlerte.NOUVEL_EVENEMENT, message: 'verif:classification', statut: StatutAlerte.ENVOYEE, envoyeAt: new Date(),
      },
    })
  }

  // 3. Rapport administrateur
  const workers = await Promise.all((Object.keys(SEUILS) as (keyof typeof SEUILS)[]).map(async (nom) => {
    const v = await redisConnection.get(`heartbeat:${nom}`).catch(() => null)
    const t = v ? Number(v) : null
    return { nom, dernierPassage: t ? new Date(t).toISOString() : null, enRetard: !t || maintenant - t > SEUILS[nom] }
  }))
  const [evenementsEnAttente, evenementsAVerifier, alertesWhatsappEchouees24h, urgents] = await Promise.all([
    prisma.evenement.count({ where: { estTraite: false, createdAt: { lt: new Date(maintenant - 2 * H) } } }),
    prisma.evenement.count({ where: { sousType: 'A_VERIFIER' } }),
    prisma.alerte.count({ where: { canal: CanalAlerte.WHATSAPP, statut: StatutAlerte.ECHEC, createdAt: { gte: new Date(maintenant - 24 * H) } } }),
    prisma.echeance.findMany({
      where: { camp: 'AGIR', estComplete: false, estExpire: false, dateLimite: { lte: new Date(maintenant + 3 * 24 * H) } },
      select: { dateLimite: true, dossier: { select: { user: { select: { id: true, nom: true, prenom: true, telephone: true, whatsappVerifie: true } } } } },
    }),
  ])
  // Avocats avec un délai ≤ 48 h qui ne reçoivent pas WhatsApp : le commercial doit les appeler
  const parAvocat = new Map<string, RapportSante['delaisUrgentsSansWhatsapp'][number]>()
  for (const e of urgents) {
    const u = e.dossier.user
    if (u.whatsappVerifie || joursCalendaires(e.dateLimite) > 2) continue
    const x = parAvocat.get(u.id) ?? { userId: u.id, nom: `${u.prenom} ${u.nom}`, telephone: u.telephone, delais: 0 }
    x.delais++
    parAvocat.set(u.id, x)
  }

  const rapport: RapportSante = {
    // Robot en retard de plus de 2 h sur sa file = capacité insuffisante (relever SCRAPER_PAR_MINUTE, voir scraperWorker.ts)
    ok: workers.every((w) => !w.enRetard) && evenementsEnAttente === 0 && parAvocat.size === 0 && !mahakim.panneDepuis && fileSynchro.heuresPourVider <= 2,
    generesLe: new Date().toISOString(),
    workers,
    dossiersNonSynchronises: nbNonSync,
    mahakim,
    fileSynchro,
    evenementsEnAttente,
    evenementsAVerifier,
    alertesWhatsappEchouees24h,
    delaisUrgentsSansWhatsapp: [...parAvocat.values()],
  }
  if (agir && !rapport.ok) logger.warn(`Contrôle de sécurité : ${JSON.stringify({ ...rapport, delaisUrgentsSansWhatsapp: parAvocat.size })}`)
  return rapport
}
