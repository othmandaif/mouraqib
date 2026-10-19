import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

const DAY_MS = 86_400_000

/**
 * Renvoie le lundi 00:00 de la semaine contenant `ref`, décalé de `weekOffset` semaines.
 * (Semaine lundi → dimanche. Pour samedi → vendredi, voir la note en bas du fichier.)
 */
function startOfWeek(ref: Date, weekOffset = 0): Date {
  const d = new Date(ref)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = dimanche, 1 = lundi, ...
  const diffToMonday = (day + 6) % 7 // lundi=0, mardi=1, ... dimanche=6
  d.setDate(d.getDate() - diffToMonday + weekOffset * 7)
  return d
}

/**
 * GET /calendrier/semaine?offset=0
 * Renvoie les AUDIENCES À VENIR + les ÉCHÉANCES de la semaine demandée.
 * offset : 0 = semaine courante, 1 = suivante, -1 = précédente.
 */
router.get('/semaine', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const offset = Number.parseInt(String(req.query.offset ?? '0'), 10) || 0

  const debut = startOfWeek(new Date(), offset)
  const fin = new Date(debut.getTime() + 7 * DAY_MS) // exclusif
  const maintenant = new Date()

  // 1) Audiences : événements avec une dateAudience dans la semaine.
  //    "À venir" = dateAudience >= maintenant (on ne montre pas les audiences déjà passées).
  const evenements = await prisma.evenement.findMany({
    where: {
      dossier: { userId, estActif: true },
      dateAudience: { gte: maintenant < debut ? debut : maintenant, lt: fin },
    },
    select: {
      id: true,
      texteArabe: true,
      dateAudience: true,
      dossier: { select: { id: true, numeroDossier: true, tribunal: true, titreAffaire: true } },
    },
    orderBy: { dateAudience: 'asc' },
  })

  // 2) Échéances : délais non complétés/non expirés tombant dans la semaine.
  const echeances = await prisma.echeance.findMany({
    where: {
      dossier: { userId },
      estComplete: false,
      estExpire: false,
      dateLimite: { gte: debut, lt: fin },
    },
    select: {
      id: true,
      description: true,
      typeDelai: true,
      dateLimite: true,
      estCritique: true,
      dossier: { select: { id: true, numeroDossier: true, tribunal: true, titreAffaire: true } },
    },
    orderBy: { dateLimite: 'asc' },
  })

  // On normalise en "items" homogènes que le front placera dans la grille.
  const items = [
    ...evenements
      .filter((e) => e.dateAudience) // sécurité
      .map((e) => ({
        id: `aud-${e.id}`,
        type: 'audience' as const,
        date: e.dateAudience!.toISOString(),
        titre: e.texteArabe,
        numeroDossier: e.dossier.numeroDossier,
        tribunal: e.dossier.tribunal,
        titreAffaire: e.dossier.titreAffaire ?? null,
        dossierId: e.dossier.id,
        critique: false,
      })),
    ...echeances.map((d) => ({
      id: `ech-${d.id}`,
      type: 'echeance' as const,
      date: d.dateLimite.toISOString(),
      titre: d.description || d.typeDelai,
      numeroDossier: d.dossier.numeroDossier,
      tribunal: d.dossier.tribunal,
      titreAffaire: d.dossier.titreAffaire ?? null,
      dossierId: d.dossier.id,
      critique: d.estCritique,
    })),
  ]

  res.json({
    debut: debut.toISOString(),
    fin: fin.toISOString(),
    offset,
    items,
  })
})

export default router

/*
 * Note — semaine marocaine :
 * Au Maroc la semaine de travail va souvent du lundi au vendredi (audiences en semaine).
 * Si vous préférez une grille samedi → vendredi, remplacez `diffToMonday` par :
 *   const diffToSaturday = (day + 1) % 7   // samedi=0 ... vendredi=6
 *   d.setDate(d.getDate() - diffToSaturday + weekOffset * 7)
 * et adaptez le nombre de colonnes côté front.
 */