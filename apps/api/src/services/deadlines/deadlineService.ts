import { PrismaClient } from '@prisma/client'
import { calculerDelais } from './delaiRules'
import { logger } from '../../utils/logger'

const prisma = new PrismaClient()

export class DeadlineService {
  async genererEcheances(): Promise<void> {
    const evenements = await prisma.evenement.findMany({
      where: {
        typeEvenement: { not: null },
        estTraite: true,
        echeancesGenerees: { none: {} },
      },
      include: { dossier: true },
    })

    logger.info(`Génération des échéances pour ${evenements.length} événements`)

    for (const ev of evenements) {
      if (!ev.typeEvenement) continue

      const dateRef = ev.dateAudience ?? ev.datePublicationGreffe
      const delais = calculerDelais(ev.typeEvenement, ev.dossier.typeProcedure, dateRef)

      for (const d of delais) {
        await prisma.echeance.create({
          data: {
            dossierId: ev.dossierId,
            evenementId: ev.id,
            typeDelai: d.typeDelai,
            description: d.description,
            descriptionAr: d.descriptionAr,
            dateDepart: dateRef,
            dateLimite: d.dateLimite,
            estCritique: d.estCritique,
            estExpire: d.dateLimite < new Date(),
          },
        })
      }
    }
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

  async getEcheancesUtilisateur(userId: string) {
    return prisma.echeance.findMany({
      where: {
        dossier: { userId },
        estExpire: false,
        estComplete: false,
      },
      include: {
        dossier: { select: { numeroDossier: true, tribunal: true, titreAffaire: true } },
        evenement: { select: { texteArabe: true, typeEvenement: true } },
      },
      orderBy: { dateLimite: 'asc' },
    })
  }

  async marquerComplete(echeanceId: string, userId: string): Promise<void> {
    const echeance = await prisma.echeance.findFirst({
      where: { id: echeanceId, dossier: { userId } },
    })
    if (!echeance) throw new Error('Échéance non trouvée')

    await prisma.echeance.update({
      where: { id: echeanceId },
      data: { estComplete: true },
    })
  }
}
