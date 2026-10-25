import { CanalAlerte, TypeAlerte, StatutAlerte, TypeEvenement } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { WhatsAppService } from '../whatsapp/whatsappService'
import { redigerMessageEvenement } from '../ai/audienceMessage'
import { lirePreferences, enHeuresCalmes, heureMaroc, Preferences, CleEvenement } from './preferences'
import { logger } from '../../utils/logger'
import { joursCalendaires, dernierJourOuvrable } from '../../utils/dateMaroc'

const whatsapp = new WhatsAppService()

const MAX_TENTATIVES = 3
const MAX_TENTATIVES_URGENT = 12 // délai ≤ 48 h : on réessaie pendant 1 h (job toutes les 5 min) avant d'abandonner WhatsApp
const JOUR_MS = 86_400_000
// Jours CALENDAIRES (heure du Maroc) jusqu'au dernier jour : 0 = aujourd'hui.
// Avant : Math.ceil sur des millisecondes → « 1 jour » le matin du dernier jour, et J-0 jamais atteint.
const joursRestants = (d: Date) => joursCalendaires(d)
// Pour les rappels « à agir » : si le dernier jour tombe un week-end ou un jour férié fixe,
// on prévient par rapport au dernier jour ouvrable précédent (prudence).
const joursAvantAction = (d: Date) => joursCalendaires(dernierJourOuvrable(d))

/**
 * Rappel à envoyer pour un délai à j jours : le plus petit seuil choisi qui est ≥ j.
 * « عليكم » : J-2, J-1 et J-0 sont toujours inclus. Adversaire : un seul rappel à J-2.
 */
export function seuilRappel(j: number, rappels: number[], camp: 'AGIR' | 'SURVEILLER'): number | undefined {
  const seuils = camp === 'AGIR' ? [...new Set([...rappels, 2, 1, 0])] : [2]
  return seuils.filter((r) => r >= j).sort((a, b) => a - b)[0]
}

/** Quelle ligne de la matrice des préférences s'applique à un événement mahakim. */
function cleEvenement(t: TypeEvenement | null): CleEvenement {
  if (t === 'JUGEMENT_RENDU' || t === 'ORDONNANCE_RENDUE') return 'jugement'
  if (t === 'NOTIFICATION_PARTIE' || t === 'SIGNIFICATION') return 'nouveauDelai'
  return 'audience'
}

async function nomTribunal(code: string): Promise<string> {
  const t = await prisma.tribunal.findUnique({ where: { code }, select: { nomAr: true } })
  return t?.nomAr ?? code
}

/**
 * Alertes MalafiPro (design V2) :
 * - chaque alerte existe en IN_APP (page « التنبيهات ») ; WhatsApp en plus selon les préférences ;
 * - les délais de l'adversaire (SURVEILLER) suivent la ligne « آجال الخصم » ;
 * - pas de WhatsApp pendant les heures calmes, sauf délai à agir sous 48 h.
 */
export class AlertService {
  private cachePrefs = new Map<string, Preferences>()
  private inactifs = new Set<string>() // vidé avec cachePrefs à chaque passage

  private async prefs(userId: string): Promise<Preferences> {
    if (!this.cachePrefs.has(userId)) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true, statut: true } })
      this.cachePrefs.set(userId, lirePreferences(u?.preferences))
      if (u && u.statut !== 'ACTIF') this.inactifs.add(userId); else this.inactifs.delete(userId)
    }
    return this.cachePrefs.get(userId)!
  }

  /** Crée l'alerte in-app (déjà « envoyée ») et, si demandé, l'alerte WhatsApp en file. */
  private async creer(params: {
    userId: string; dossierId?: string; evenementId?: string; echeanceId?: string
    typeAlerte: TypeAlerte; message: string; messageAr?: string | null; cle: CleEvenement; whatsappOk: boolean
  }): Promise<void> {
    const p = await this.prefs(params.userId)
    if (this.inactifs.has(params.userId)) return // compte désactivé : aucune alerte
    const ligne = p.matrice[params.cle]
    const base = {
      userId: params.userId, dossierId: params.dossierId, evenementId: params.evenementId, echeanceId: params.echeanceId,
      typeAlerte: params.typeAlerte, message: params.message, messageAr: params.messageAr ?? undefined,
    }
    if (ligne.app) {
      await prisma.alerte.create({ data: { ...base, canal: CanalAlerte.IN_APP, statut: StatutAlerte.ENVOYEE, envoyeAt: new Date() } })
    }
    if (ligne.whatsapp && params.whatsappOk) {
      await prisma.alerte.create({ data: { ...base, canal: CanalAlerte.WHATSAPP, statut: StatutAlerte.EN_ATTENTE } })
    }
  }

  /**
   * Envoie toute la file WhatsApp par lots de 100 (curseur), dans la limite de 4 min par passage.
   * Avant : 50 alertes max toutes les 5 min, et celles retenues par les heures calmes bloquaient
   * toujours les mêmes 50 places (les autres n'étaient jamais envoyées).
   */
  async envoyerAlertesEnAttente(): Promise<void> {
    this.cachePrefs.clear()
    const debut = Date.now()
    let curseur: string | undefined
    while (Date.now() - debut < 4 * 60_000) {
      const lot = await this.lireLotWhatsapp(curseur)
      if (!lot.length) break
      curseur = lot[lot.length - 1].id
      await this.envoyerLot(lot)
    }
  }

  private lireLotWhatsapp(curseur?: string) {
    return prisma.alerte.findMany({
      where: {
        canal: CanalAlerte.WHATSAPP,
        // ECHEC = abandon définitif ; les urgentes restent EN_ATTENTE jusqu'à MAX_TENTATIVES_URGENT
        statut: StatutAlerte.EN_ATTENTE,
        tentatives: { lt: MAX_TENTATIVES_URGENT },
        user: { statut: 'ACTIF' },
      },
      include: {
        user: { select: { whatsappNumero: true, telephone: true, whatsappVerifie: true } },
        dossier: { select: { numeroDossier: true, tribunal: true } },
        echeance: { select: { descriptionAr: true, description: true, dateLimite: true, camp: true } },
        evenement: { select: { typeEvenement: true, texteArabe: true, dateAudience: true } },
      },
      orderBy: { id: 'asc' },
      take: 100,
      ...(curseur ? { cursor: { id: curseur }, skip: 1 } : {}),
    })
  }

  private async envoyerLot(alertes: Awaited<ReturnType<AlertService['lireLotWhatsapp']>>): Promise<void> {
    for (const alerte of alertes) {
      const telephone = alerte.user.whatsappNumero ?? alerte.user.telephone
      if (!telephone || !alerte.user.whatsappVerifie) {
        await this.marquerEchec(alerte.id, 'Pas de numéro WhatsApp vérifié')
        continue
      }

      const urgent48h = !!alerte.echeance && alerte.echeance.camp === 'AGIR' && joursAvantAction(alerte.echeance.dateLimite) <= 2
      if (!urgent48h && enHeuresCalmes(await this.prefs(alerte.userId))) continue // repartira après les heures calmes

      try {
        let ok = false
        if (alerte.typeAlerte === TypeAlerte.NOUVEL_EVENEMENT && alerte.evenement && alerte.dossier) {
          ok = await whatsapp.envoyerAlerteEvenement({
            telephone,
            numeroDossier: alerte.dossier.numeroDossier,
            tribunal: await nomTribunal(alerte.dossier.tribunal),
            texteEvenement: alerte.evenement.texteArabe,
            typeEvenement: alerte.evenement.typeEvenement ?? 'AUTRE',
            dateAudience: alerte.evenement.dateAudience,
          })
        } else if (alerte.typeAlerte === TypeAlerte.NOUVEAU_DELAI && alerte.echeance && alerte.dossier) {
          ok = await whatsapp.envoyerNouveauDelai({
            telephone,
            numeroDossier: alerte.dossier.numeroDossier,
            description: alerte.echeance.descriptionAr ?? alerte.echeance.description,
            dateLimite: alerte.echeance.dateLimite,
          })
        } else if (alerte.echeance && alerte.dossier) {
          ok = await whatsapp.envoyerAlerteDelai({
            telephone,
            numeroDossier: alerte.dossier.numeroDossier,
            description: alerte.echeance.descriptionAr ?? alerte.echeance.description,
            joursRestants: joursRestants(alerte.echeance.dateLimite),
            dateLimite: alerte.echeance.dateLimite,
          })
        } else if (alerte.messageAr) {
          ok = await whatsapp.envoyerTexte(telephone, alerte.messageAr)
        }

        if (ok) {
          await prisma.alerte.update({
            where: { id: alerte.id },
            data: { statut: StatutAlerte.ENVOYEE, envoyeAt: new Date(), tentatives: { increment: 1 } },
          })
        } else {
          await this.marquerEchec(alerte.id, 'Envoi retourné false', urgent48h)
        }
      } catch (error: any) {
        logger.error(`Erreur envoi alerte ${alerte.id}:`, error)
        await this.marquerEchec(alerte.id, error.message, urgent48h)
      }
    }
  }

  async traiterNouveauxEvenements(): Promise<void> {
    this.cachePrefs.clear()
    const evenements = await prisma.evenement.findMany({
      where: { estNouvel: true, estTraite: true },
      include: { dossier: { include: { user: { select: { id: true, whatsappNumero: true, whatsappVerifie: true } } } } },
    })

    logger.info(`${evenements.length} nouveaux événements à notifier`)

    for (const ev of evenements) {
      const user = ev.dossier.user
      // Texte rédigé par l'IA pour la page des alertes (le WhatsApp, lui, suit un modèle sans noms).
      const messageAr = await redigerMessageEvenement({
        numeroDossier: ev.dossier.numeroDossier,
        tribunal: ev.dossier.tribunal,
        texteArabe: ev.texteArabe,
        dateAudience: ev.dateAudience,
        titreAffaire: ev.dossier.titreAffaire,
        typeEvenement: ev.typeEvenement ?? undefined,
      })
      await this.creer({
        userId: user.id, dossierId: ev.dossierId, evenementId: ev.id, typeAlerte: TypeAlerte.NOUVEL_EVENEMENT,
        message: ev.texteArabe.substring(0, 200), messageAr, cle: cleEvenement(ev.typeEvenement),
        whatsappOk: !!user.whatsappNumero && user.whatsappVerifie,
      })
      await prisma.evenement.update({ where: { id: ev.id }, data: { estNouvel: false } })
    }
  }

  /** Après génération : « بدأ أجل … » pour chaque délai nouvellement ouvert. */
  async alerterNouveauxDelais(echeanceIds: string[]): Promise<void> {
    if (!echeanceIds.length) return
    this.cachePrefs.clear()
    const echeances = await prisma.echeance.findMany({
      where: { id: { in: echeanceIds }, estExpire: false },
      include: { dossier: { include: { user: { select: { id: true, whatsappNumero: true, whatsappVerifie: true } } } } },
    })
    for (const e of echeances) {
      const u = e.dossier.user
      await this.creer({
        userId: u.id, dossierId: e.dossierId, echeanceId: e.id, typeAlerte: TypeAlerte.NOUVEAU_DELAI,
        message: `nouveau:${e.descriptionAr ?? e.description}`, cle: e.camp === 'SURVEILLER' ? 'surveiller' : 'nouveauDelai',
        whatsappOk: !!u.whatsappNumero && u.whatsappVerifie,
      })
    }
  }

  /**
   * Rappels avant échéance (Paramètres › التذكير قبل آخر أجل) + rappels « ذكّروني يوم … ».
   * Dédoublonné par (échéance, message « rappel:J-n »).
   */
  async genererAlertesDelaisCritiques(): Promise<void> {
    this.cachePrefs.clear()
    const echeances = await prisma.echeance.findMany({
      where: { estComplete: false, estExpire: false, dateLimite: { lte: new Date(Date.now() + 31 * JOUR_MS) } },
      select: {
        id: true, dossierId: true, dateLimite: true, camp: true,
        dossier: { select: { user: { select: { id: true, whatsappNumero: true, whatsappVerifie: true } } } },
      },
    })
    // Rappels déjà créés et annonces récentes, lus en 2 requêtes au lieu de 2 par délai
    const ids = echeances.map((e) => e.id)
    const [dejaCrees, annonces] = ids.length ? await Promise.all([
      prisma.alerte.findMany({ where: { echeanceId: { in: ids }, message: { startsWith: 'rappel:J-' } }, select: { echeanceId: true, message: true } }),
      prisma.alerte.findMany({ where: { echeanceId: { in: ids }, typeAlerte: TypeAlerte.NOUVEAU_DELAI, createdAt: { gte: new Date(Date.now() - JOUR_MS) } }, select: { echeanceId: true } }),
    ]) : [[], []]
    const rappelsFaits = new Set(dejaCrees.map((a) => `${a.echeanceId}|${a.message}`))
    const annoncesRecentes = new Set(annonces.map((a) => a.echeanceId))

    for (const e of echeances) {
      const u = e.dossier.user
      const p = await this.prefs(u.id)
      const j = Math.max(0, e.camp === 'AGIR' ? joursAvantAction(e.dateLimite) : joursRestants(e.dateLimite))
      const whatsappOk = !!u.whatsappNumero && u.whatsappVerifie

      // Seuil franchi = le plus petit rappel choisi qui est ≥ j (J-2, J-1, J-0 toujours inclus pour « عليكم »).
      // On rattrape ainsi un rappel manqué (serveur arrêté, délai créé tard) au lieu de l'ignorer.
      const seuil = seuilRappel(j, p.rappels, e.camp)
      if (seuil !== undefined) {
        const cle = `rappel:J-${seuil}`
        const deja = rappelsFaits.has(`${e.id}|${cle}`)
        // Délai qui vient d'être annoncé (« بدأ أجل ») : pas de second message le même jour, sauf à ≤ 48 h
        const annonceRecente = seuil > 2 && annoncesRecentes.has(e.id)
        if (!deja && !annonceRecente) {
          await this.creer({
            userId: u.id, dossierId: e.dossierId, echeanceId: e.id,
            typeAlerte: j <= 1 ? TypeAlerte.DELAI_APPROCHE_1J : j <= 3 ? TypeAlerte.DELAI_APPROCHE_3J : j <= 7 ? TypeAlerte.DELAI_APPROCHE_7J : TypeAlerte.DELAI_CRITIQUE,
            message: cle,
            cle: e.camp === 'SURVEILLER' ? 'surveiller' : j <= 2 ? 'delai48h' : 'nouveauDelai',
            whatsappOk,
          })
        }
      }

    }

    // « ذكّروني يوم … » : requête à part. Dans la boucle ci-dessus, un rappel posé sur un délai à plus de
    // 31 jours ou déjà expiré (délai de l'adversaire à surveiller, par ex.) ne partait jamais.
    const persos = await prisma.echeance.findMany({
      where: { estComplete: false, rappelAt: { lte: new Date() } },
      select: { id: true, dossierId: true, camp: true, dossier: { select: { user: { select: { id: true, whatsappNumero: true, whatsappVerifie: true } } } } },
    })
    for (const e of persos) {
      const u = e.dossier.user
      // rappelAt remis à null d'abord : si deux passages se chevauchent, un seul envoie
      const r = await prisma.echeance.updateMany({ where: { id: e.id, rappelAt: { not: null } }, data: { rappelAt: null } })
      if (!r.count) continue
      await this.creer({
        userId: u.id, dossierId: e.dossierId, echeanceId: e.id, typeAlerte: TypeAlerte.RAPPEL_DELAI,
        message: 'rappel:perso', cle: e.camp === 'SURVEILLER' ? 'surveiller' : 'nouveauDelai',
        whatsappOk: !!u.whatsappNumero && u.whatsappVerifie,
      })
    }
  }

  /** Signale un dossier que mahakim n'a pas pu synchroniser (après toutes les tentatives). */
  async alerterEchecSync(dossierId: string): Promise<void> {
    const d = await prisma.dossier.findUnique({ where: { id: dossierId }, select: { userId: true } })
    if (!d) return
    const recent = await prisma.alerte.findFirst({
      where: { dossierId, typeAlerte: TypeAlerte.RAPPORT_SYNC, createdAt: { gte: new Date(Date.now() - JOUR_MS) } },
    })
    if (recent) return
    await prisma.alerte.create({
      data: { userId: d.userId, dossierId, canal: CanalAlerte.IN_APP, typeAlerte: TypeAlerte.RAPPORT_SYNC, message: 'sync:echec', statut: StatutAlerte.ENVOYEE, envoyeAt: new Date() },
    })
  }

  /**
   * Résumé du matin : le job tourne chaque heure, chaque avocat le reçoit à l'heure choisie
   * (jours ouvrables seulement), une seule fois par jour.
   */
  async envoyerDigestQuotidien(): Promise<void> {
    this.cachePrefs.clear()
    const maintenant = new Date()
    const jourMaroc = new Date(maintenant.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' })).getDay()
    if (jourMaroc === 0 || jourMaroc === 6) return
    const heure = heureMaroc(maintenant).slice(0, 2)

    const users = await prisma.user.findMany({
      where: { whatsappVerifie: true, whatsappNumero: { not: null }, suppressionDemandeeAt: null, statut: 'ACTIF' },
      select: { id: true, nom: true, whatsappNumero: true, preferences: true },
    })

    const debutJour = new Date(maintenant.getTime() - 20 * 3_600_000)
    const hier = new Date(maintenant.getTime() - JOUR_MS)
    const finJour = new Date(maintenant.getTime() + 18 * 3_600_000)

    for (const user of users) {
      const p = lirePreferences(user.preferences)
      if (!p.digestActif || p.digestHeure.slice(0, 2) !== heure) continue
      const dejaEnvoye = await prisma.alerte.findFirst({ where: { userId: user.id, typeAlerte: TypeAlerte.DIGEST_QUOTIDIEN, createdAt: { gte: debutJour } } })
      if (dejaEnvoye) continue

      const [dossiersBouges, echeancesCritiques, renvois, audiencesDuJour] = await Promise.all([
        prisma.dossier.count({ where: { userId: user.id, evenements: { some: { createdAt: { gte: hier } } } } }),
        prisma.echeance.findMany({
          where: { dossier: { userId: user.id }, camp: 'AGIR', estCritique: true, estComplete: false, estExpire: false },
          select: { dossier: { select: { numeroDossier: true } }, description: true, descriptionAr: true, dateLimite: true },
          orderBy: { dateLimite: 'asc' },
          take: 10,
        }),
        prisma.evenement.findMany({
          where: { dossier: { userId: user.id }, typeEvenement: { in: ['RENVOI_SIMPLE', 'RENVOI_EXPERT', 'RENVOI_NOTIFICATION'] }, createdAt: { gte: hier } },
          select: { dossier: { select: { numeroDossier: true, tribunal: true } } },
        }),
        prisma.evenement.count({ where: { dossier: { userId: user.id }, dateAudience: { gte: maintenant, lt: finJour } } }),
      ])

      const ok = await whatsapp.envoyerDigestQuotidien({
        telephone: user.whatsappNumero!,
        nomAvocat: user.nom,
        nbDossiersBouges: dossiersBouges,
        echeancesCritiques: echeancesCritiques.map((e) => ({
          numeroDossier: e.dossier.numeroDossier,
          description: e.descriptionAr ?? e.description,
          joursRestants: joursRestants(e.dateLimite),
        })),
        renvoisDetectes: renvois.map((r) => ({ numeroDossier: r.dossier.numeroDossier, tribunal: r.dossier.tribunal })),
        audiencesDuJour,
      })
      await prisma.alerte.create({
        data: {
          userId: user.id, canal: CanalAlerte.WHATSAPP, typeAlerte: TypeAlerte.DIGEST_QUOTIDIEN,
          message: `digest:${echeancesCritiques.length}:${audiencesDuJour}`,
          statut: ok ? StatutAlerte.ENVOYEE : StatutAlerte.ECHEC, envoyeAt: ok ? new Date() : undefined, tentatives: 1,
        },
      })
    }
  }

  private async marquerEchec(alerteId: string, raison: string, urgent = false): Promise<void> {
    const alerte = await prisma.alerte.findUnique({ where: { id: alerteId } })
    if (!alerte) return

    const newTentatives = alerte.tentatives + 1
    await prisma.alerte.update({
      where: { id: alerteId },
      data: {
        statut: newTentatives >= (urgent ? MAX_TENTATIVES_URGENT : MAX_TENTATIVES) ? StatutAlerte.ECHEC : StatutAlerte.EN_ATTENTE,
        tentatives: newTentatives,
        erreur: raison,
      },
    })
  }
}
