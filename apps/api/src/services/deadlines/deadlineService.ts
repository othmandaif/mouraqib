import { TypeDelai, NatureJugement, RoleClient, CampDelai, TypeProcedure } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { calculerDelais, campPour, delaiApplicable, TYPES_AVEC_DELAIS } from './delaiRules'
import { logger } from '../../utils/logger'
import { finDeJourMaroc, finDeDelai, joursCalendaires } from '../../utils/dateMaroc'
import { redisConnection } from '../../jobs/queues'


/**
 * Procédure à appliquer : un dossier reste « civil » tant que l'IA ne l'a pas reclassé. Si l'acte
 * ou l'objet mentionne le référé, on applique les délais du référé (15 j), plus courts : prudence.
 */
export function procedurePour(texteActe: string, dossier: { typeProcedure: TypeProcedure; titreAffaire?: string | null }): TypeProcedure {
  if (dossier.typeProcedure === TypeProcedure.REFERE) return TypeProcedure.REFERE
  return /استعجال|مستعجل/.test(`${texteActe} ${dossier.titreAffaire ?? ''}`) ? TypeProcedure.REFERE : dossier.typeProcedure
}

// Liste des délais : seulement ce que les cartes affichent (un grand cabinet en a plusieurs milliers)
const INCLUDE_LISTE = {
  id: true, typeDelai: true, description: true, descriptionAr: true, dateDepart: true, dateLimite: true,
  estCritique: true, estComplete: true, estExpire: true, completeAt: true, rappelAt: true, camp: true, dossierId: true,
  dossier: { select: { id: true, numeroDossier: true, tribunal: true, titreAffaire: true, roleClient: true } },
  evenement: { select: { id: true, typeEvenement: true, natureJugement: true } },
} as const

/** Compte, ou comptes du cabinet (dossiers partagés), propriétaires des dossiers visibles. */
type Proprietaires = string | string[]
const proprietaires = (u: Proprietaires) => (typeof u === 'string' ? u : { in: u })

export class DeadlineService {
  async genererEcheances(): Promise<string[]> {
    const evenements = await prisma.evenement.findMany({
      where: {
        typeEvenement: { in: TYPES_AVEC_DELAIS },
        estTraite: true,
        echeancesGenerees: { none: {} },
      },
      include: { dossier: true },
    })

    logger.info(`Génération des échéances pour ${evenements.length} événements`)
    const creees: string[] = []

    for (const ev of evenements) {
      if (!ev.typeEvenement) continue

      // Avant : dateAudience (prochaine audience, souvent FUTURE) servait de départ aux recours → limite trop tardive
      const delais = calculerDelais(ev.typeEvenement, procedurePour(ev.texteArabe, ev.dossier), ev.datePublicationGreffe, ev.dateAudience)
        .filter((d) => delaiApplicable(d.typeDelai, ev.natureJugement))

      for (const d of delais) {
        const e = await prisma.echeance.create({
          data: {
            dossierId: ev.dossierId,
            evenementId: ev.id,
            typeDelai: d.typeDelai,
            description: d.description,
            descriptionAr: d.descriptionAr,
            dateDepart: d.dateDepart,
            dateLimite: d.dateLimite,
            estCritique: d.estCritique,
            estExpire: d.dateLimite < new Date(),
            camp: campPour(d.typeDelai, ev.dossier.roleClient) as CampDelai,
          },
        })
        creees.push(e.id)
      }
    }
    return creees
  }

  /**
   * Une seule fois (drapeau Redis) : les délais ouverts créés avant la correction couraient jusqu'à
   * minuit le MATIN du dernier jour. On les porte à 23:59:59 heure du Maroc. Idempotent.
   */
  async normaliserLimites(): Promise<void> {
    const drapeau = 'migration:fin-de-jour-v1'
    if (await redisConnection.get(drapeau)) return
    const ouvertes = await prisma.echeance.findMany({ where: { estComplete: false }, select: { id: true, dateLimite: true } })
    let n = 0
    for (const e of ouvertes) {
      const fin = finDeJourMaroc(e.dateLimite)
      if (fin.getTime() === e.dateLimite.getTime()) continue
      await prisma.echeance.update({ where: { id: e.id }, data: { dateLimite: fin, estExpire: fin < new Date() } })
      n++
    }
    await redisConnection.set(drapeau, new Date().toISOString())
    logger.info(`Limites de délais recalées sur la fin de journée (Maroc) : ${n}`)
  }

  async mettreAJourStatuts(): Promise<void> {
    const now = new Date()
    const dans7Jours = new Date(now.getTime() + 7 * 86_400_000)

    await prisma.echeance.updateMany({
      where: { dateLimite: { lt: now }, estExpire: false, estComplete: false },
      data: { estExpire: true },
    })

    await prisma.echeance.updateMany({
      where: {
        dateLimite: { gte: now, lt: dans7Jours },
        estCritique: false,
        estComplete: false,
        estExpire: false,
      },
      data: { estCritique: true },
    })
  }

  /** statut : 'actives' (défaut) | 'completees' (faits des 30 derniers jours) | 'expirees' (adversaire expiré récemment) */
  async getEcheancesUtilisateur(userId: Proprietaires, statut: 'actives' | 'completees' | 'expirees' = 'actives') {
    if (statut === 'completees') {
      return prisma.echeance.findMany({
        where: { dossier: { userId: proprietaires(userId) }, estComplete: true, completeAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
        select: INCLUDE_LISTE,
        orderBy: { completeAt: 'desc' },
        take: 20,
      })
    }
    if (statut === 'expirees') {
      return prisma.echeance.findMany({
        where: { dossier: { userId: proprietaires(userId) }, estExpire: true, estComplete: false, dateLimite: { gte: new Date(Date.now() - 30 * 86_400_000) } },
        select: INCLUDE_LISTE,
        orderBy: { dateLimite: 'desc' },
        take: 20,
      })
    }
    return prisma.echeance.findMany({
      where: { dossier: { userId: proprietaires(userId) }, estExpire: false, estComplete: false },
      select: INCLUDE_LISTE,
      orderBy: { dateLimite: 'asc' },
    })
  }

  private async trouver(echeanceId: string, userId: Proprietaires) {
    const echeance = await prisma.echeance.findFirst({ where: { id: echeanceId, dossier: { userId: proprietaires(userId) } } })
    if (!echeance) throw Object.assign(new Error('Échéance non trouvée'), { status: 404 })
    return echeance
  }

  async marquerComplete(echeanceId: string, userId: Proprietaires): Promise<void> {
    await this.trouver(echeanceId, userId)
    await prisma.echeance.update({ where: { id: echeanceId }, data: { estComplete: true, completeAt: new Date() } })
  }

  /** « إلغاء الإنجاز » */
  async rouvrir(echeanceId: string, userId: Proprietaires): Promise<void> {
    const e = await this.trouver(echeanceId, userId)
    await prisma.echeance.update({
      where: { id: echeanceId },
      data: { estComplete: false, completeAt: null, estExpire: e.dateLimite < new Date() },
    })
  }

  async changerCamp(echeanceId: string, userId: Proprietaires, camp: CampDelai): Promise<void> {
    await this.trouver(echeanceId, userId)
    await prisma.echeance.update({ where: { id: echeanceId }, data: { camp } })
  }

  /** « ذكّروني يوم … » : une alerte sera créée ce jour-là. */
  async programmerRappel(echeanceId: string, userId: Proprietaires, date: Date): Promise<void> {
    await this.trouver(echeanceId, userId)
    await prisma.echeance.update({ where: { id: echeanceId }, data: { rappelAt: date } })
  }

  /** Après changement du rôle du client : recalcule le camp des délais encore ouverts. */
  async recalculerCamps(dossierId: string, roleClient: RoleClient): Promise<void> {
    const ouvertes = await prisma.echeance.findMany({ where: { dossierId, estComplete: false }, select: { id: true, typeDelai: true } })
    for (const e of ouvertes) {
      await prisma.echeance.update({ where: { id: e.id }, data: { camp: campPour(e.typeDelai, roleClient) as CampDelai } })
    }
  }

  /**
   * Réponse de l'avocat à « طبيعة الحكم » : حضوري supprime le délai d'opposition non fait,
   * غيابي le recrée s'il manque.
   */
  async appliquerNature(evenementId: string, userId: Proprietaires, nature: NatureJugement): Promise<void> {
    const ev = await prisma.evenement.findFirst({ where: { id: evenementId, dossier: { userId: proprietaires(userId) } }, include: { dossier: true } })
    if (!ev) throw Object.assign(new Error('Événement non trouvé'), { status: 404 })
    await prisma.evenement.update({ where: { id: ev.id }, data: { natureJugement: nature } })

    if (nature === NatureJugement.CONTRADICTOIRE) {
      await prisma.echeance.deleteMany({ where: { evenementId: ev.id, typeDelai: TypeDelai.OPPOSITION, estComplete: false } })
      return
    }
    if (!ev.typeEvenement) return
    const existe = await prisma.echeance.findFirst({ where: { evenementId: ev.id, typeDelai: TypeDelai.OPPOSITION } })
    if (existe) return
    const opp = calculerDelais(ev.typeEvenement, procedurePour(ev.texteArabe, ev.dossier), ev.datePublicationGreffe, ev.dateAudience).find((d) => d.typeDelai === TypeDelai.OPPOSITION)
    if (!opp) return
    await prisma.echeance.create({
      data: {
        dossierId: ev.dossierId, evenementId: ev.id, typeDelai: opp.typeDelai, description: opp.description,
        descriptionAr: opp.descriptionAr, dateDepart: opp.dateDepart, dateLimite: opp.dateLimite, estCritique: opp.estCritique,
        estExpire: opp.dateLimite < new Date(), camp: campPour(opp.typeDelai, ev.dossier.roleClient) as CampDelai,
      },
    })
  }

  /**
   * L'IA vient de reclasser le dossier en référé : les délais d'appel ouverts calculés sur 30 j
   * (procédure civile) sont ramenés à 15 j. On ne raccourcit jamais un délai déjà plus court.
   */
  async passerEnRefere(dossierId: string): Promise<number> {
    const ouverts = await prisma.echeance.findMany({
      where: { dossierId, typeDelai: TypeDelai.APPEL, estComplete: false, evenement: { typeEvenement: 'JUGEMENT_RENDU' } },
      select: { id: true, dateDepart: true, dateLimite: true },
    })
    let n = 0
    for (const e of ouverts) {
      const limite = finDeDelai(e.dateDepart, 15)
      if (limite >= e.dateLimite) continue
      await prisma.echeance.update({
        where: { id: e.id },
        data: {
          dateLimite: limite, estExpire: limite < new Date(), estCritique: joursCalendaires(limite) <= 4,
          description: "Délai d'appel en référé — 15 jours", descriptionAr: 'أجل الاستئناف في الأمور المستعجلة - 15 يوماً',
        },
      })
      n++
    }
    if (n) logger.info(`Dossier ${dossierId} reclassé en référé : ${n} délai(s) d'appel ramené(s) à 15 jours`)
    return n
  }
}
