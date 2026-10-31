import { prisma } from '../../utils/prisma'
import { cleSync, enAttenteApresEchec } from './santeMahakim'
import { scraperQueue } from '../../jobs/queues'
import { logger } from '../../utils/logger'

const H = 3_600_000
const J = 24 * H

// Fréquence de vérification selon l'enjeu (variables d'environnement facultatives, en heures)
const INTERVALLE = {
  chaud: Number(process.env.SCRAPE_CHAUD_H ?? 2) * H, // délai à agir ≤ 10 j, jugement récent, audience proche
  normal: Number(process.env.SCRAPE_NORMAL_H ?? 6) * H,
  dormant: Number(process.env.SCRAPE_DORMANT_H ?? 24) * H, // rien de neuf depuis 90 jours
}
const PRIORITE = { chaud: 1, normal: 5, dormant: 10 } as const // BullMQ : plus petit = plus urgent
// Mis en file par passage (30 min) : au moins 1,5 fois ce que le robot lit en 30 min. Un plafond fixe de 3 000
// bridait la synchronisation à 100 dossiers/min même quand SCRAPER_PAR_MINUTE autorisait plus.
const MAX_PAR_PASSAGE = Number(process.env.SCRAPE_MAX_PAR_PASSAGE ?? Math.max(3000, Number(process.env.SCRAPER_PAR_MINUTE ?? 20) * 45))

type Niveau = keyof typeof INTERVALLE

/**
 * Planificateur de scraping (toutes les 30 min) — remplace le « tout scraper toutes les 4 h »
 * qui ne tenait pas avec des milliers de dossiers :
 * - un job PAR dossier (reprise fine en cas d'erreur, plusieurs workers possibles) ;
 * - un dossier suivi par plusieurs avocats n'est lu qu'une fois ;
 * - les dossiers à enjeu passent en premier et plus souvent, les dormants une fois par jour ;
 * - un même dossier n'est jamais mis deux fois en file dans la même fenêtre (jobId).
 * @param force passage du soir : tout dossier non vérifié depuis 6 h, quel que soit son niveau.
 */
export async function planifierScraping({ force = false, userId }: { force?: boolean; userId?: string } = {}): Promise<number> {
  const maintenant = Date.now()
  const dossiers = await prisma.dossier.findMany({
    // Comptes désactivés ou en attente : plus de synchronisation (coût mahakim et WhatsApp)
    where: { estActif: true, user: { statut: 'ACTIF' }, ...(userId ? { userId } : {}) },
    select: { id: true, numeroDossier: true, tribunal: true, derniereVerif: true, createdAt: true },
  })
  if (!dossiers.length) return 0
  const ids = dossiers.map((d) => d.id)

  const [delaisProches, jugementsRecents, audiencesProches, actifs90j] = await Promise.all([
    prisma.echeance.findMany({ where: { dossierId: { in: ids }, estComplete: false, estExpire: false, dateLimite: { lte: new Date(maintenant + 10 * J) } }, select: { dossierId: true }, distinct: ['dossierId'] }),
    prisma.evenement.findMany({ where: { dossierId: { in: ids }, typeEvenement: { in: ['JUGEMENT_RENDU', 'ORDONNANCE_RENDUE'] }, datePublicationGreffe: { gte: new Date(maintenant - 60 * J) } }, select: { dossierId: true }, distinct: ['dossierId'] }),
    prisma.evenement.findMany({ where: { dossierId: { in: ids }, dateAudience: { gte: new Date(maintenant - J), lte: new Date(maintenant + 7 * J) } }, select: { dossierId: true }, distinct: ['dossierId'] }),
    prisma.evenement.findMany({ where: { dossierId: { in: ids }, createdAt: { gte: new Date(maintenant - 90 * J) } }, select: { dossierId: true }, distinct: ['dossierId'] }),
  ])
  const chauds = new Set([...delaisProches, ...jugementsRecents, ...audiencesProches].map((x) => x.dossierId))
  const vivants = new Set(actifs90j.map((x) => x.dossierId))
  const niveau = (d: { id: string; createdAt: Date }): Niveau =>
    chauds.has(d.id) ? 'chaud' : vivants.has(d.id) || maintenant - d.createdAt.getTime() < 90 * J ? 'normal' : 'dormant'

  // Regroupement des dossiers identiques (plusieurs avocats) : niveau le plus urgent, vérification la plus ancienne
  const groupes = new Map<string, { id: string; niveau: Niveau; verif: number }>()
  const rang: Record<Niveau, number> = { chaud: 0, normal: 1, dormant: 2 }
  for (const d of dossiers) {
    const cle = `${d.numeroDossier}|${d.tribunal}`
    const n = niveau(d)
    const verif = d.derniereVerif?.getTime() ?? 0
    const g = groupes.get(cle)
    if (!g) groupes.set(cle, { id: d.id, niveau: n, verif })
    else {
      if (rang[n] < rang[g.niveau]) g.niveau = n
      if (verif < g.verif) { g.verif = verif; g.id = d.id }
    }
  }

  const dus = [...groupes.entries()]
    .filter(([, g]) => maintenant - g.verif >= (force ? Math.min(INTERVALLE[g.niveau], 6 * H) : INTERVALLE[g.niveau]))
  // Dossiers en échec récent (introuvable, panne) : attente croissante, sinon jamais vérifiés ils passaient
  // en tête de chaque planification et prenaient la place des autres.
  const cles = new Map(dus.map(([cle]) => [cle, cleSync(...(cle.split('|') as [string, string]))]))
  const enAttente = await enAttenteApresEchec([...cles.values()])
  const aPlanifier = dus
    .filter(([cle]) => !enAttente.has(cles.get(cle)!))
    .sort((a, b) => rang[a[1].niveau] - rang[b[1].niveau] || a[1].verif - b[1].verif)
    .slice(0, MAX_PAR_PASSAGE)

  // Par paquets pour ne pas saturer Redis
  for (let i = 0; i < aPlanifier.length; i += 500) {
    await scraperQueue.addBulk(aPlanifier.slice(i, i + 500).map(([cle, g]) => ({
      name: 'scrape-dossier',
      data: { dossierId: g.id, planifie: true },
      opts: {
        // Un seul job par dossier tant qu'il attend : avant, l'identifiant changeait toutes les 30 min et, quand le
        // robot avait du retard, chaque passage remettait les mêmes dossiers en file (lectures en double, file sans fin).
        jobId: `scrape-${cles.get(cle)!.slice(0, 16)}`,
        priority: PRIORITE[g.niveau],
        // Pas de nouvel essai immédiat : un échec met le dossier en attente (santeMahakim), le passage suivant le reprendra
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: { age: 3600 },
      },
    })))
  }
  logger.info(`Planification scraping${force ? ' (passage du soir)' : ''} : ${aPlanifier.length} dossiers sur ${groupes.size} uniques`)
  return aPlanifier.length
}
