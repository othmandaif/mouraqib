import { Router, Response } from 'express'
import { prisma } from '../utils/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { z } from 'zod'

const router = Router()

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
  // Agenda partagé par le cabinet : dossiers, délais et rendez-vous de toute l'équipe
  const userId = { in: req.equipe! }
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

/**
 * GET /calendrier/mois?annee=2026&mois=10  (mois 1–12)
 * Grille mensuelle : audiences (passées et à venir) + délais (camp agir/surveiller), ouverts ou faits.
 */
router.get('/mois', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  // Agenda partagé par le cabinet : dossiers, délais et rendez-vous de toute l'équipe
  const userId = { in: req.equipe! }
  const now = new Date()
  const annee = Number.parseInt(String(req.query.annee ?? now.getFullYear()), 10)
  const mois = Number.parseInt(String(req.query.mois ?? now.getMonth() + 1), 10)
  if (!Number.isInteger(annee) || !Number.isInteger(mois) || mois < 1 || mois > 12) {
    res.status(400).json({ error: 'annee/mois invalides' })
    return
  }
  // Grille lundi → dimanche qui couvre tout le mois
  const premier = new Date(annee, mois - 1, 1)
  const debut = startOfWeek(premier)
  const fin = new Date(startOfWeek(new Date(annee, mois, 0)).getTime() + 7 * DAY_MS)

  // Cartes « الجلسة القادمة » et « أقرب أجل » : à partir de maintenant, quel que soit le mois affiché
  const DOSSIER = { select: { id: true, numeroDossier: true, tribunal: true, titreAffaire: true } }
  const [audiences, echeances, rendezVous, prochaineAudience, prochainDelai] = await Promise.all([
    prisma.evenement.findMany({
      where: { dossier: { userId, estActif: true }, dateAudience: { gte: debut, lt: fin } },
      select: { id: true, texteArabe: true, dateAudience: true, dossier: { select: { id: true, numeroDossier: true, tribunal: true, titreAffaire: true } } },
      orderBy: { dateAudience: 'asc' },
    }),
    prisma.echeance.findMany({
      where: { dossier: { userId }, dateLimite: { gte: debut, lt: fin } },
      select: { id: true, descriptionAr: true, description: true, typeDelai: true, dateLimite: true, camp: true, estComplete: true, estExpire: true,
        dossier: { select: { id: true, numeroDossier: true, tribunal: true, titreAffaire: true } } },
      orderBy: { dateLimite: 'asc' },
    }),
    prisma.rendezVous.findMany({
      where: { userId, debut: { gte: debut, lt: fin } },
      select: { id: true, titre: true, lieu: true, debut: true, dossier: { select: { id: true, numeroDossier: true, titreAffaire: true } } },
      orderBy: { debut: 'asc' },
    }),
    prisma.evenement.findFirst({
      where: { dossier: { userId, estActif: true }, dateAudience: { gte: new Date(now.getTime() - 12 * 3_600_000) } },
      select: { id: true, dateAudience: true, dossier: DOSSIER },
      orderBy: { dateAudience: 'asc' },
    }),
    prisma.echeance.findFirst({
      where: { dossier: { userId }, camp: 'AGIR', estComplete: false, estExpire: false, dateLimite: { gte: now } },
      select: { id: true, descriptionAr: true, description: true, dateLimite: true, dossier: DOSSIER },
      orderBy: { dateLimite: 'asc' },
    }),
  ])

  res.json({
    debut: debut.toISOString(),
    fin: fin.toISOString(),
    rendezVous: rendezVous.map((r) => ({ ...r, date: r.debut.toISOString() })),
    audiences: audiences.map((a) => ({ id: a.id, date: a.dateAudience!.toISOString(), titre: a.texteArabe, dossier: a.dossier })),
    echeances: echeances.map((e) => ({ ...e, date: e.dateLimite.toISOString(), titre: e.descriptionAr ?? e.description })),
    prochains: {
      audience: prochaineAudience ? { id: prochaineAudience.id, date: prochaineAudience.dateAudience!.toISOString(), dossier: prochaineAudience.dossier } : null,
      delai: prochainDelai ? { id: prochainDelai.id, date: prochainDelai.dateLimite.toISOString(), titre: prochainDelai.descriptionAr ?? prochainDelai.description, dossier: prochainDelai.dossier } : null,
    },
  })
})

/* ─── Rendez-vous saisis par l'avocat ─── */

const RdvSchema = z.object({
  titre: z.string().min(2).max(200),
  lieu: z.string().max(200).optional(),
  debut: z.string().datetime(),
  dossierId: z.string().optional(),
})

router.post('/rendez-vous', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = RdvSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  if (parse.data.dossierId) {
    const d = await prisma.dossier.findFirst({ where: { id: parse.data.dossierId, userId: { in: req.equipe! } }, select: { id: true } })
    if (!d) { res.status(404).json({ error: 'Dossier non trouvé' }); return }
  }
  const rdv = await prisma.rendezVous.create({ data: { ...parse.data, debut: new Date(parse.data.debut), userId: req.userId! } })
  res.status(201).json(rdv)
})

router.delete('/rendez-vous/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await prisma.rendezVous.deleteMany({ where: { id: req.params.id, userId: { in: req.equipe! } } })
  if (!r.count) { res.status(404).json({ error: 'Rendez-vous introuvable' }); return }
  res.json({ ok: true, supprimes: r.count })
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