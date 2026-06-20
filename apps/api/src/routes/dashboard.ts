import { Router, Response } from 'express'
import { PrismaClient, Prisma } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

const DAY_MS = 86_400_000

/** Construit le filtre Prisma sur les dossiers à partir des query params. */
function construireFiltre(userId: string, q: any): Prisma.DossierWhereInput {
  const where: Prisma.DossierWhereInput = { userId }
  const and: Prisma.DossierWhereInput[] = []

  if (q.tribunal) and.push({ tribunal: String(q.tribunal) })
  if (q.typeProcedure) and.push({ typeProcedure: String(q.typeProcedure) as any })
  if (q.statut) and.push({ statutIA: String(q.statut) as any })
  // Année : le numéro de dossier commence par "AAAA/"
  if (q.annee && /^\d{4}$/.test(String(q.annee))) {
    and.push({ numeroDossier: { startsWith: `${q.annee}/` } })
  }
  // Ville : fragment contenu dans le nom du tribunal (ex: "بالدار البيضاء")
  if (q.ville) and.push({ tribunal: { contains: String(q.ville) } })

  if (and.length) where.AND = and
  return where
}

/* ── Options de filtres (pour remplir les menus déroulants) ── */
// GET /dashboard/filtres
router.get('/filtres', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const dossiers = await prisma.dossier.findMany({
    where: { userId },
    select: { tribunal: true, numeroDossier: true, typeProcedure: true, statutIA: true },
  })

  const tribunaux = Array.from(new Set(dossiers.map((d) => d.tribunal).filter(Boolean))).sort()
  const annees = Array.from(new Set(dossiers.map((d) => d.numeroDossier.split('/')[0]).filter((a) => /^\d{4}$/.test(a)))).sort().reverse()
  const types = Array.from(new Set(dossiers.map((d) => d.typeProcedure).filter(Boolean)))
  const statuts = Array.from(new Set(dossiers.map((d) => d.statutIA).filter(Boolean)))
  // Villes : on extrait un fragment lisible du nom du tribunal (après "ب" généralement).
  const villes = Array.from(new Set(
    dossiers.map((d) => {
      const m = d.tribunal.match(/(?:ب|بال)(\S+)$/)
      return m ? m[1] : null
    }).filter(Boolean) as string[],
  )).sort()

  res.json({ tribunaux, annees, types, statuts, villes })
})

/* ── Vue agrégée du tableau de bord (avec filtres) ── */
// GET /dashboard/overview?tribunal=&annee=&typeProcedure=&statut=&ville=
router.get('/overview', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const now = new Date()
  const today0 = new Date(now); today0.setHours(0, 0, 0, 0)
  const semaineAgo = new Date(today0.getTime() - 6 * DAY_MS)

  // Filtre dossiers (sans le critère estActif, qu'on combine ensuite).
  const baseFiltre = construireFiltre(userId, req.query)
  const filtreActif: Prisma.DossierWhereInput = { AND: [baseFiltre, { estActif: true }] }
  const filtreArchive: Prisma.DossierWhereInput = { AND: [baseFiltre, { estActif: false }] }
  // Filtre événements/échéances : via la relation dossier.
  const evtWhere: Prisma.EvenementWhereInput = { dossier: baseFiltre }
  const echWhere: Prisma.EcheanceWhereInput = { dossier: baseFiltre }

  const [dossiersActifs, dossiersArchives] = await Promise.all([
    prisma.dossier.count({ where: filtreActif }),
    prisma.dossier.count({ where: filtreArchive }),
  ])

  const delaisCritiques = await prisma.echeance.count({
    where: { ...echWhere, estComplete: false, estExpire: false, estCritique: true },
  })

  const [evtAujourdhui, evtSemaine, evtSemainePrec] = await Promise.all([
    prisma.evenement.count({ where: { ...evtWhere, datePublicationGreffe: { gte: today0 } } }),
    prisma.evenement.count({ where: { ...evtWhere, datePublicationGreffe: { gte: semaineAgo } } }),
    prisma.evenement.count({ where: { ...evtWhere, datePublicationGreffe: { gte: new Date(semaineAgo.getTime() - 7 * DAY_MS), lt: semaineAgo } } }),
  ])

  // Heatmap 7 jours
  const evtsRecents = await prisma.evenement.findMany({
    where: { ...evtWhere, datePublicationGreffe: { gte: semaineAgo } },
    select: { datePublicationGreffe: true },
  })
  const heatmap = Array(7).fill(0)
  for (const e of evtsRecents) {
    const d = new Date(e.datePublicationGreffe); d.setHours(0, 0, 0, 0)
    const idx = Math.round((d.getTime() - semaineAgo.getTime()) / DAY_MS)
    if (idx >= 0 && idx <= 6) heatmap[idx]++
  }

  // Types de procédures (dossiers filtrés actifs)
  const parProcedure = await prisma.dossier.groupBy({
    by: ['typeProcedure'],
    where: filtreActif,
    _count: { _all: true },
  })
  const procedures = parProcedure
    .map((p) => ({ type: p.typeProcedure, count: p._count._all }))
    .sort((a, b) => b.count - a.count)

  const renvoisCetteSemaine = await prisma.evenement.count({
    where: {
      ...evtWhere,
      datePublicationGreffe: { gte: semaineAgo },
      typeEvenement: { in: ['RENVOI_SIMPLE', 'RENVOI_EXPERT', 'RENVOI_NOTIFICATION'] as any },
    },
  })

  const [delaisTotal, delaisComplets, delaisExpires] = await Promise.all([
    prisma.echeance.count({ where: echWhere }),
    prisma.echeance.count({ where: { ...echWhere, estComplete: true } }),
    prisma.echeance.count({ where: { ...echWhere, estExpire: true, estComplete: false } }),
  ])
  const pct = (n: number) => (delaisTotal > 0 ? Math.round((n / delaisTotal) * 100) : 0)

  const evolutionEvt = evtSemainePrec > 0
    ? Math.round(((evtSemaine - evtSemainePrec) / evtSemainePrec) * 1000) / 10
    : null

  // Statut IA
  const parStatut = await prisma.dossier.groupBy({
    by: ['statutIA'],
    where: filtreActif,
    _count: { _all: true },
  })
  const statutMap: Record<string, number> = { OUVERT: 0, EN_DELIBERE: 0, CLOS: 0, INCONNU: 0 }
  for (const s of parStatut) statutMap[s.statutIA] = s._count._all
  const statutsIA = { ouvert: statutMap.OUVERT, enDelibere: statutMap.EN_DELIBERE, clos: statutMap.CLOS, inconnu: statutMap.INCONNU }

  // KPIs calculés
  const seuilDormant = new Date(today0.getTime() - 90 * DAY_MS)
  const tousActifs = await prisma.dossier.findMany({
    where: filtreActif,
    select: { tribunal: true, evenements: { orderBy: { datePublicationGreffe: 'desc' }, take: 1, select: { datePublicationGreffe: true } } },
  })
  const dossiersDormants = tousActifs.filter((d) => {
    const dernier = d.evenements[0]?.datePublicationGreffe
    return !dernier || new Date(dernier) < seuilDormant
  }).length

  const dans7j = new Date(today0.getTime() + 7 * DAY_MS)
  const audiencesSemaine = await prisma.evenement.count({
    where: { ...evtWhere, dateAudience: { gte: today0, lte: dans7j } },
  })
  const delaisExpiresCount = await prisma.echeance.count({
    where: { ...echWhere, estExpire: true, estComplete: false },
  })

  const parTribunalRaw = await prisma.dossier.groupBy({
    by: ['tribunal'],
    where: filtreActif,
    _count: { _all: true },
  })
  const parTribunal = parTribunalRaw
    .map((t) => ({ tribunal: t.tribunal, count: t._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  res.json({
    kpi: {
      dossiersActifs, dossiersArchives, delaisCritiques,
      evenementsAujourdhui: evtAujourdhui, renvoisCetteSemaine,
      dossiersDormants, audiencesSemaine, delaisExpires: delaisExpiresCount,
    },
    statutsIA,
    parTribunal,
    evenements: { semaine: evtSemaine, evolutionPct: evolutionEvt, heatmap },
    procedures,
    delais: { total: delaisTotal, completsPct: pct(delaisComplets), expiresPct: pct(delaisExpires), actifs: dossiersActifs },
    statutFichiers: {
      actifs: dossiersActifs, archives: dossiersArchives,
      actifsPct: dossiersActifs + dossiersArchives > 0 ? Math.round((dossiersActifs / (dossiersActifs + dossiersArchives)) * 100) : 100,
      archivesPct: dossiersActifs + dossiersArchives > 0 ? Math.round((dossiersArchives / (dossiersActifs + dossiersArchives)) * 100) : 0,
    },
  })
})

export default router