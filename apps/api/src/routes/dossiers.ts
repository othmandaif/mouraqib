import { Router, Response } from 'express'
import { z } from 'zod'
import { Prisma, TypeProcedure } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { requireAuth, sansSecretaire, AuthRequest } from '../middleware/auth'
import { limiter } from '../middleware/securite'
import { verifierAjoutDossier } from '../middleware/subscription'
import { scraperQueue, nlpQueue, searchQueue, deadlineQueue, redisConnection, searchResultKey } from '../jobs/queues'
import { findTribunalCode, TRIBUNAUX_COMPLETS } from '../services/scraper/mahakimScraper'
import { logger } from '../utils/logger'
import { DeadlineService } from '../services/deadlines/deadlineService'
import { actesSuggeres } from '../services/documents/packDossier'
import { lireProfil } from '../services/facturation/profil'
import { adversaireDuDossier } from './clients'

const router = Router()
const deadlineService = new DeadlineService()

const EvenementInputSchema = z.object({
  texteArabe: z.string().min(1).max(5000),
  dateAudience: z.string().max(40).optional().nullable(),
  datePublication: z.string().max(40),
  rawHtml: z.string().max(20_000).optional().nullable(),
})
const dateLisible = (v?: string | null) => !!v && !Number.isNaN(Date.parse(v))

// Numéros tels que les affiche mahakim : chiffres seulement ; année plausible
const anneeValide = (a: string) => { const n = Number(a); return n >= 1990 && n <= new Date().getFullYear() + 1 }
const champsNumero = {
  anneeDossier: z.string().regex(/^\d{4}$/, 'Format année invalide (ex: 2024)').refine(anneeValide, 'Année invalide'),
  codeRole: z.string().regex(/^\d{1,6}$/, 'Code rôle invalide'),
  numeroDossier: z.string().regex(/^\d{1,8}$/, 'Numéro dossier invalide'),
}

const AddDossierSchema = z.object({
  ...champsNumero,
  courAppel: z.string().min(2).max(120),
  tribunalPrimaire: z.string().max(120).optional(),
  titreAffaire: z.string().max(300).optional(),
  // Valeurs du schéma Prisma (l'ancienne liste acceptait INJONCTION/APPEL/CASSATION → erreur 500)
  typeProcedure: z.nativeEnum(TypeProcedure).optional(),
  evenements: z.array(EvenementInputSchema).max(500).optional(),
  // Copie brute de la fiche mahakim : bornée (100 Ko) pour ne pas gonfler la base
  rawData: z.any().optional().refine((v) => v === undefined || JSON.stringify(v).length <= 100_000, 'Données brutes trop volumineuses'),
  roleClient: z.enum(['DEMANDEUR', 'DEFENDEUR', 'INCONNU']).optional(),
})

const RechercheSchema = z.object({
  ...champsNumero,
  courAppel: z.string().min(2).max(120),
  tribunalPrimaire: z.string().max(120).optional(),
})


/** Champs de la liste : sans rawData ni analyse IA (plusieurs Ko par dossier, inutiles dans un tableau). */
const CHAMPS_LISTE = {
  id: true, numeroDossier: true, tribunal: true, typeProcedure: true, titreAffaire: true,
  roleClient: true, statutIA: true, derniereVerif: true, updatedAt: true,
} satisfies Prisma.DossierSelect

/**
 * Liste des dossiers avec, pour chacun, le dernier acte, le prochain délai ouvert et la prochaine audience.
 * Un « DISTINCT ON » par information : une ligne par dossier lue dans l'index, au lieu de charger tous les
 * actes de tous les dossiers (5 000 dossiers × 5 actes = 25 000 lignes) pour n'en garder qu'un.
 */
async function listeDossiers(where: Prisma.DossierWhereInput) {
  const dossiers = await prisma.dossier.findMany({ where, select: CHAMPS_LISTE, orderBy: { updatedAt: 'desc' } })
  if (!dossiers.length) return []
  const ids = dossiers.map((d) => d.id)
  const [derniers, prochaines, audiences] = await Promise.all([
    prisma.$queryRaw<{ dossierId: string; texteArabe: string; datePublicationGreffe: Date }[]>`
      SELECT DISTINCT ON ("dossierId") "dossierId", "texteArabe", "datePublicationGreffe"
      FROM "Evenement" WHERE "dossierId" = ANY(${ids}) ORDER BY "dossierId", "datePublicationGreffe" DESC`,
    prisma.$queryRaw<{ id: string; dossierId: string; typeDelai: string; descriptionAr: string | null; description: string; dateLimite: Date; camp: string }[]>`
      SELECT DISTINCT ON ("dossierId") id, "dossierId", "typeDelai", "descriptionAr", description, "dateLimite", camp
      FROM "Echeance" WHERE "dossierId" = ANY(${ids}) AND NOT "estComplete" AND NOT "estExpire"
      ORDER BY "dossierId", "dateLimite" ASC, camp, id`, // à date égale : le délai « عليكم » d'abord
    prisma.$queryRaw<{ dossierId: string; dateAudience: Date; texteArabe: string }[]>`
      SELECT DISTINCT ON ("dossierId") "dossierId", "dateAudience", "texteArabe"
      FROM "Evenement" WHERE "dossierId" = ANY(${ids}) AND "dateAudience" >= ${new Date()}
      ORDER BY "dossierId", "dateAudience" ASC`,
  ])
  const parDossier = <T extends { dossierId: string }>(l: T[]) => new Map(l.map((x) => [x.dossierId, x]))
  const dernierDe = parDossier(derniers), prochaineDe = parDossier(prochaines), audienceDe = parDossier(audiences)
  return dossiers.map((d) => {
    const e = dernierDe.get(d.id)
    return {
      ...d,
      dernierEvenement: e ? { texteArabe: e.texteArabe, datePublicationGreffe: e.datePublicationGreffe } : null,
      prochaineEcheance: prochaineDe.get(d.id) ?? null,
      prochaineAudience: audienceDe.get(d.id) ?? null,
    }
  })
}

// PATCH /api/v1/dossiers/:id/archiver   → estActif = false
router.patch('/:id/archiver', requireAuth, sansSecretaire, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossier = await prisma.dossier.findFirst({ where: { id: req.params.id, userId: { in: req.equipe! } } })
  if (!dossier) { res.status(404).json({ error: 'Dossier non trouvé' }); return }
  await prisma.dossier.update({ where: { id: dossier.id }, data: { estActif: false } })
  res.json({ ok: true, estActif: false })
})

// PATCH /api/v1/dossiers/:id/restaurer  → estActif = true
// Restaurer = reprendre le suivi : même contrôle que l'ajout (limite de dossiers, abonnement expiré)
router.patch('/:id/restaurer', requireAuth, verifierAjoutDossier, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossier = await prisma.dossier.findFirst({ where: { id: req.params.id, userId: { in: req.equipe! } } })
  if (!dossier) { res.status(404).json({ error: 'Dossier non trouvé' }); return }
  await prisma.dossier.update({ where: { id: dossier.id }, data: { estActif: true } })
  res.json({ ok: true, estActif: true })
})
 
// GET /api/v1/dossiers/archives  → liste des dossiers archivés
router.get('/archives', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json(await listeDossiers({ userId: { in: req.equipe! }, estActif: false }))
})

/**
 * Liste paginée (page Dossiers, tableau de bord, recherche Ctrl K) : filtres, tri et onglets calculés en base.
 * Un grand cabinet (plusieurs milliers de dossiers) ne reçoit que la page affichée, avec les compteurs des onglets.
 * GET /dossiers/liste?onglet=tous|agir|surveiller|semaine|dormants|archives&q=&tribunal=&procedure=&tri=urgence|recent
 *   &page=1&taille=50&ids=a,b&avecActe=1
 */
const ListeSchema = z.object({
  onglet: z.enum(['tous', 'agir', 'surveiller', 'semaine', 'dormants', 'archives']).default('tous'),
  q: z.string().trim().max(100).optional(),
  tribunal: z.string().max(120).optional(),
  procedure: z.nativeEnum(TypeProcedure).optional(),
  tri: z.enum(['urgence', 'recent']).default('urgence'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  taille: z.coerce.number().int().min(1).max(100).default(50),
  ids: z.string().max(2000).optional(),
  avecActe: z.enum(['0', '1']).optional(),
})

// Conditions des onglets, sur les colonnes calculées de « base » (mêmes règles que l'ancien filtre du navigateur)
const ONGLET_SQL = {
  tous: Prisma.sql`TRUE`,
  archives: Prisma.sql`TRUE`,
  agir: Prisma.sql`pe_camp = 'AGIR' AND pe_type <> 'AUTRE'`,
  surveiller: Prisma.sql`pe_camp = 'SURVEILLER'`,
  semaine: Prisma.sql`pa_date < now() + interval '7 days'`,
  dormants: Prisma.sql`COALESCE(de_date, "updatedAt") <= now() - interval '90 days'`,
}

/** Dossiers visibles + prochain délai, prochaine audience et dernier acte (une ligne lue par index pour chacun). */
function baseDossiers(conds: Prisma.Sql[]) {
  return Prisma.sql`
    SELECT d.id, d."numeroDossier", d.tribunal, d."typeProcedure", d."titreAffaire", d."roleClient", d."statutIA",
      d."derniereVerif", d."updatedAt", t."nomAr" AS tribunal_ar,
      pe.id AS pe_id, pe."typeDelai"::text AS pe_type, pe."descriptionAr" AS pe_desc_ar, pe.description AS pe_desc,
      pe."dateLimite" AS pe_date, pe.camp::text AS pe_camp,
      pa."dateAudience" AS pa_date, de."texteArabe" AS de_texte, de."datePublicationGreffe" AS de_date
    FROM "Dossier" d
    LEFT JOIN "Tribunal" t ON t.code = d.tribunal
    LEFT JOIN LATERAL (SELECT e.id, e."typeDelai", e."descriptionAr", e.description, e."dateLimite", e.camp FROM "Echeance" e
      WHERE e."dossierId" = d.id AND NOT e."estComplete" AND NOT e."estExpire" ORDER BY e."dateLimite", e.camp, e.id LIMIT 1) pe ON TRUE
    LEFT JOIN LATERAL (SELECT v."dateAudience" FROM "Evenement" v
      WHERE v."dossierId" = d.id AND v."dateAudience" >= now() ORDER BY v."dateAudience" LIMIT 1) pa ON TRUE
    LEFT JOIN LATERAL (SELECT v."texteArabe", v."datePublicationGreffe" FROM "Evenement" v
      WHERE v."dossierId" = d.id ORDER BY v."datePublicationGreffe" DESC LIMIT 1) de ON TRUE
    WHERE ${Prisma.join(conds, ' AND ')}`
}

// Recherche tolérante à l'arabe, comme la recherche Ctrl K : sans tachkil ni tatweel, أ/إ/آ → ا, ة → ه, ى → ي ;
// chaque mot doit apparaître (dans le numéro, le titre ou le tribunal).
const normaliserArabe = (t: string) => t.toLowerCase().replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
const motsRecherche = (q: string) => normaliserArabe(q).split(/\s+/).filter(Boolean).slice(0, 6)
const normSql = (col: Prisma.Sql) =>
  Prisma.sql`translate(regexp_replace(lower(coalesce(${col}, '')), '[\u064B-\u0652\u0640]', '', 'g'), 'أإآةى', 'اااهي')`

type Compteurs = { c_tous: bigint; c_agir: bigint; c_surveiller: bigint; c_semaine: bigint; c_dormants: bigint }
type LigneListe = {
  id: string; numeroDossier: string; tribunal: string; typeProcedure: string; titreAffaire: string | null; roleClient: string
  statutIA: string; derniereVerif: Date | null; updatedAt: Date; pe_id: string | null; pe_type: string | null; pe_desc_ar: string | null
  pe_desc: string | null; pe_date: Date | null; pe_camp: string | null; pa_date: Date | null; de_texte: string | null; de_date: Date | null; total: bigint
}

router.get('/liste', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = ListeSchema.safeParse(req.query)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const { onglet, q, tribunal, procedure, tri, page, taille, ids, avecActe } = parse.data
  const equipe = req.equipe!
  const archivesOnglet = onglet === 'archives'
  const conds: Prisma.Sql[] = [Prisma.sql`d."userId" = ANY(${equipe})`, Prisma.sql`d."estActif" = ${!archivesOnglet}`]
  // Filtres de la page (sur les colonnes de « base ») ; les compteurs des onglets les ignorent, comme avant
  const filtres: Prisma.Sql[] = [ONGLET_SQL[onglet]]
  if (avecActe === '1') filtres.push(Prisma.sql`de_date IS NOT NULL`)
  const liste = ids?.split(',').filter(Boolean).slice(0, 50)
  if (liste?.length) filtres.push(Prisma.sql`id = ANY(${liste})`)
  if (tribunal) filtres.push(Prisma.sql`tribunal = ${tribunal}`)
  if (procedure) filtres.push(Prisma.sql`"typeProcedure" = ${procedure}::"TypeProcedure"`)
  if (q && (/^\d+$/.test(q) || motsRecherche(q).length)) {
    const motif = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    // Chiffres seuls : code ou numéro (« 202 » ne doit pas trouver tous les dossiers de 2026), ou l'année complète
    filtres.push(/^\d+$/.test(q)
      ? Prisma.sql`(split_part("numeroDossier", '/', 2) LIKE ${motif} OR split_part("numeroDossier", '/', 3) LIKE ${motif}
          OR (length(${q}) = 4 AND split_part("numeroDossier", '/', 1) = ${q})
          OR (position('/' in "numeroDossier") = 0 AND "numeroDossier" LIKE ${motif}))`
      : Prisma.join(motsRecherche(q).map((m) => {
        const mot = `%${m.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
        return Prisma.sql`(${normSql(Prisma.sql`"numeroDossier"`)} LIKE ${mot} OR ${normSql(Prisma.sql`"titreAffaire"`)} LIKE ${mot}
          OR ${normSql(Prisma.sql`tribunal`)} LIKE ${mot} OR ${normSql(Prisma.sql`tribunal_ar`)} LIKE ${mot})`
      }), ' AND '))
  }
  const ordre = tri === 'recent'
    ? Prisma.sql`COALESCE(de_date, "updatedAt") DESC, id`
    : Prisma.sql`(pe_date IS NULL), pe_date, (pa_date IS NULL), pa_date, id`

  // Une seule passe sur les dossiers : les compteurs des onglets sont calculés (fenêtres) avant les filtres de la page
  const COMPTEURS = Prisma.sql`count(*) OVER () AS c_tous, count(*) FILTER (WHERE ${ONGLET_SQL.agir}) OVER () AS c_agir,
    count(*) FILTER (WHERE ${ONGLET_SQL.surveiller}) OVER () AS c_surveiller, count(*) FILTER (WHERE ${ONGLET_SQL.semaine}) OVER () AS c_semaine,
    count(*) FILTER (WHERE ${ONGLET_SQL.dormants}) OVER () AS c_dormants`
  const compterActifs = () => prisma.$queryRaw<Compteurs[]>`SELECT ${COMPTEURS} FROM (${baseDossiers([Prisma.sql`d."userId" = ANY(${equipe})`, Prisma.sql`d."estActif" = TRUE`])}) b LIMIT 1`
  const [lignes, archives, options, compteursArchives] = await Promise.all([
    prisma.$queryRaw<(LigneListe & Compteurs)[]>`
      SELECT *, count(*) OVER () AS total FROM (SELECT b.*, ${COMPTEURS} FROM (${baseDossiers(conds)}) b) x
      WHERE ${Prisma.join(filtres, ' AND ')} ORDER BY ${ordre} LIMIT ${taille} OFFSET ${(page - 1) * taille}`,
    prisma.dossier.count({ where: { userId: { in: equipe }, estActif: false } }),
    prisma.dossier.groupBy({ by: ['tribunal', 'typeProcedure'], where: { userId: { in: equipe }, estActif: true } }),
    // Onglet « المؤرشفة » : la passe porte sur les archives, les compteurs des dossiers suivis sont lus à part
    archivesOnglet ? compterActifs() : Promise.resolve(null),
  ])
  // Page vide (recherche sans résultat, page au-delà de la fin) : pas de ligne pour porter les compteurs
  const compteurs = archivesOnglet ? compteursArchives : lignes.length ? lignes : await compterActifs()
  const c = compteurs?.[0]
  res.json({
    total: Number(lignes[0]?.total ?? 0), page, taille,
    compteurs: { tous: Number(c?.c_tous ?? 0), agir: Number(c?.c_agir ?? 0), surveiller: Number(c?.c_surveiller ?? 0), semaine: Number(c?.c_semaine ?? 0), dormants: Number(c?.c_dormants ?? 0), archives },
    tribunaux: [...new Set(options.map((o) => o.tribunal))],
    procedures: [...new Set(options.map((o) => o.typeProcedure))],
    items: lignes.map((l) => ({
      id: l.id, numeroDossier: l.numeroDossier, tribunal: l.tribunal, typeProcedure: l.typeProcedure, titreAffaire: l.titreAffaire,
      roleClient: l.roleClient, statutIA: l.statutIA, derniereVerif: l.derniereVerif, updatedAt: l.updatedAt,
      dernierEvenement: l.de_date ? { texteArabe: l.de_texte, datePublicationGreffe: l.de_date } : null,
      prochaineEcheance: l.pe_id ? { id: l.pe_id, typeDelai: l.pe_type, descriptionAr: l.pe_desc_ar, description: l.pe_desc, dateLimite: l.pe_date, camp: l.pe_camp } : null,
      prochaineAudience: l.pa_date ? { dateAudience: l.pa_date } : null,
    })),
  })
})

router.get('/ping', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), version: 3 })
})

router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { q, tribunal } = req.query
  const where: Prisma.DossierWhereInput = { userId: { in: req.equipe! }, estActif: true }

  if (q && typeof q === 'string') {
    where.OR = [
      { numeroDossier: { contains: q, mode: 'insensitive' } },
      { titreAffaire: { contains: q, mode: 'insensitive' } },
      { anneeDossier: { contains: q } },
      { codeRole: { contains: q } },
    ]
  }
  if (tribunal && typeof tribunal === 'string') {
    where.tribunal = { contains: tribunal, mode: 'insensitive' }
  }

  res.json(await listeDossiers(where))
})

// Statut de synchronisation mahakim (Paramètres › الربط بمحاكم)
router.get('/sync-statut', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const agg = await prisma.dossier.aggregate({
    where: { userId: { in: req.equipe! }, estActif: true },
    _count: { _all: true },
    _max: { derniereVerif: true },
  })
  const derniere = agg._max.derniereVerif
  res.json({
    actifs: agg._count._all,
    derniereVerif: derniere,
    // Plus de passage fixe toutes les 4 h : le planificateur choisit 2 h / 6 h / 24 h selon chaque dossier.
    // On n'affiche donc pas une heure inventée (champ gardé pour la compatibilité du front).
    prochaineVerif: null,
  })
})

// « مزامنة الآن » / « تحديث من محاكم » pour plusieurs dossiers (ids absents = tous les actifs)
router.post('/scraper-lot', requireAuth, limiter('sync-lot', 6, 3600), async (req: AuthRequest, res: Response): Promise<void> => {
  const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]).filter((x): x is string => typeof x === 'string') : null
  const dossiers = await prisma.dossier.findMany({
    where: { userId: { in: req.equipe! }, estActif: true, ...(ids ? { id: { in: ids } } : {}) },
    select: { id: true },
  })
  // Un seul aller-retour Redis ; priorité 3 : sans priorité, BullMQ passait ces centaines de jobs avant les
  // dossiers « chauds » du planificateur. jobId par 10 min : un double clic ne double pas la file.
  const fenetre = Math.floor(Date.now() / 600_000)
  for (let i = 0; i < dossiers.length; i += 500) {
    await scraperQueue.addBulk(dossiers.slice(i, i + 500).map((d) => ({
      name: 'scrape-dossier',
      data: { dossierId: d.id, userId: req.userId! },
      opts: { jobId: `lot-${d.id}-${fenetre}`, priority: 3, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    })))
  }
  res.json({ ok: true, lances: dossiers.length })
})

// Archivage groupé
router.post('/archiver-lot', requireAuth, sansSecretaire, async (req: AuthRequest, res: Response): Promise<void> => {
  const ids = Array.isArray(req.body?.ids) ? (req.body.ids as unknown[]).filter((x): x is string => typeof x === 'string') : []
  const r = await prisma.dossier.updateMany({ where: { userId: { in: req.equipe! }, id: { in: ids } }, data: { estActif: false } })
  res.json({ ok: true, archives: r.count })
})

/**
 * Recherche live ASYNCHRONE.
 * Au lieu d'attendre le scraping (qui peut dépasser le timeout d'un proxy → 500/504),
 * on met un job dans la file `search` et on renvoie immédiatement un jobId.
 * Le front interroge ensuite GET /rechercher/:jobId jusqu'à obtenir le résultat.
 */
router.post('/rechercher', requireAuth, limiter('recherche', 20, 600), async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = RechercheSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() })
    return
  }

  const { anneeDossier, codeRole, numeroDossier, courAppel, tribunalPrimaire } = parse.data

  try {
    const job = await searchQueue.add(
      'search-live',
      { anneeDossier, codeRole, numeroDossier, courAppel, tribunalPrimaire },
      {
        attempts: 2,
        backoff: { type: 'fixed', delay: 2000 },
        removeOnComplete: { age: 600 }, // garde 10 min pour le polling
        removeOnFail: { age: 600 },
      },
    )

    // Les numéros de job se suivent : on note le propriétaire pour qu'un autre compte ne lise pas le résultat
    await redisConnection.set(`search:owner:${job.id}`, req.userId!, 'EX', 900)
    logger.info(`Recherche live mise en file (job ${job.id})`)
    // 202 Accepted : le travail est accepté mais pas terminé
    res.status(202).json({ jobId: job.id, statut: 'en_cours' })
  } catch (error) {
    logger.error('Erreur mise en file de la recherche:', error)
    res.status(500).json({ error: 'Impossible de lancer la recherche' })
  }
})

/**
 * Polling du résultat d'une recherche live.
 * Réponses possibles :
 *  - { statut: 'en_cours' }  → le front réessaie
 *  - { statut: 'pret', resultat: {...} } → le front affiche
 *  - { statut: 'echec' } → erreur scraping
 */
router.get('/rechercher/:jobId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { jobId } = req.params

  try {
    if ((await redisConnection.get(`search:owner:${jobId}`)) !== req.userId) {
      res.status(404).json({ statut: 'introuvable', error: 'Recherche introuvable ou expirée' })
      return
    }
    // 1) Le résultat est-il déjà stocké dans Redis ?
    const cached = await redisConnection.get(searchResultKey(jobId))
    if (cached) {
      res.json({ statut: 'pret', resultat: JSON.parse(cached) })
      return
    }

    // 2) Sinon, regarder l'état du job dans la file
    const job = await searchQueue.getJob(jobId)
    if (!job) {
      res.status(404).json({ statut: 'introuvable', error: 'Recherche introuvable ou expirée' })
      return
    }

    const state = await job.getState()
    if (state === 'completed') {
      // Le job est fini mais le cache a expiré : on renvoie le returnvalue si dispo
      const result = job.returnvalue
      res.json(result ? { statut: 'pret', resultat: result } : { statut: 'echec' })
    } else if (state === 'failed') {
      res.json({ statut: 'echec', error: job.failedReason ?? 'Échec de la recherche' })
    } else {
      // waiting, active, delayed...
      res.json({ statut: 'en_cours' })
    }
  } catch (error) {
    logger.error(`Erreur polling recherche ${jobId}:`, error)
    res.status(500).json({ statut: 'echec', error: 'Erreur lors de la vérification' })
  }
})

router.post('/', requireAuth, verifierAjoutDossier, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parse = AddDossierSchema.safeParse(req.body)
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() })
      return
    }

    const { anneeDossier, codeRole, numeroDossier, courAppel, tribunalPrimaire, titreAffaire, typeProcedure, rawData, roleClient } = parse.data
    // Un acte dont la date est illisible (format inattendu sur mahakim) est ignoré : il ne doit pas empêcher
    // l'ajout du dossier. La synchronisation suivante le relira.
    const evenements = parse.data.evenements
      ?.filter((ev) => dateLisible(ev.datePublication))
      .map((ev) => ({ ...ev, dateAudience: dateLisible(ev.dateAudience) ? ev.dateAudience : null }))
    const numComplet = `${anneeDossier}/${codeRole}/${numeroDossier}`

    const tribunal = findTribunalCode(courAppel, tribunalPrimaire) ?? courAppel
    const estCourAppel = !tribunalPrimaire

    // Même dossier déjà suivi par soi ou par un membre du cabinet (le numéro est stocké complet : « 2026/1201/55 »)
    const existing = await prisma.dossier.findFirst({
      where: { anneeDossier, codeRole, numeroDossier: numComplet, tribunal, userId: { in: req.equipe! } },
      select: { id: true, estActif: true },
    })
    if (existing?.estActif) {
      res.status(409).json({ error: 'Dossier déjà ajouté' })
      return
    }
    if (existing) {
      // Dossier archivé puis ré-ajouté : on le réactive (la contrainte d'unicité refusait la création → 409)
      const restaure = await prisma.dossier.update({
        where: { id: existing.id },
        data: { estActif: true, ...(titreAffaire ? { titreAffaire } : {}), ...(typeProcedure ? { typeProcedure } : {}), ...(roleClient ? { roleClient } : {}) },
        include: { evenements: { orderBy: { datePublicationGreffe: 'desc' } } },
      })
      await scraperQueue.add('scrape-dossier', { dossierId: existing.id, userId: req.userId! }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
      res.status(200).json(restaure)
      return
    }

    const dossier = await prisma.$transaction(async (tx) => {
      // Deux membres du cabinet qui ajoutent le même dossier au même instant : la contrainte d'unicité est par
      // compte, elle ne les départage pas. Un verrou par (cabinet, numéro, tribunal) sérialise ces ajouts.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${req.cabinetId ?? req.userId}|${numComplet}|${tribunal}`}))`
      const doublon = await tx.dossier.findFirst({ where: { numeroDossier: numComplet, tribunal, userId: { in: req.equipe! } }, select: { id: true } })
      if (doublon) throw Object.assign(new Error('Dossier déjà ajouté'), { code: 'P2002' })
      const d = await tx.dossier.create({
        data: {
          numeroDossier: numComplet,
          anneeDossier,
          codeRole,
          tribunal,
          estCourAppel,
          titreAffaire,
          typeProcedure: typeProcedure ?? TypeProcedure.CIVILE,
          roleClient: roleClient ?? 'INCONNU',
          userId: req.userId!,
          cabinetId: req.cabinetId ?? null,
          derniereVerif: evenements ? new Date() : undefined,
          rawData: rawData ?? undefined,
        },
      })

      if (evenements && evenements.length > 0) {
        await tx.evenement.createMany({
          data: evenements.map((ev) => ({
            dossierId: d.id,
            texteArabe: ev.texteArabe,
            dateAudience: ev.dateAudience ? new Date(ev.dateAudience) : null,
            datePublicationGreffe: new Date(ev.datePublication),
            raw: ev.rawHtml ? { html: ev.rawHtml } : undefined,
            estNouvel: false, // historique au moment de l'ajout : pas d'alerte « مستجد » par acte ancien
            estTraite: false,
          })),
        })
      }

      return tx.dossier.findUnique({
        where: { id: d.id },
        include: {
          evenements: { orderBy: { datePublicationGreffe: 'desc' } },
        },
      })
    })

    if (!evenements || evenements.length === 0) {
      await scraperQueue.add('scrape-dossier', { dossierId: dossier!.id, userId: req.userId! }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      })
    } else {
      await nlpQueue.add('process-pending', {}, { delay: 2000 })
    }

    res.status(201).json(dossier)
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'Dossier déjà ajouté' })
    } else {
      logger.error('Erreur création dossier:', error)
      res.status(500).json({ error: 'Erreur lors de la création du dossier' })
    }
  }
})

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossier = await prisma.dossier.findFirst({
    where: { id: req.params.id, userId: { in: req.equipe! } },
    include: {
      evenements: { orderBy: { datePublicationGreffe: 'desc' }, take: 50 },
      echeances: { where: { estComplete: false }, orderBy: { dateLimite: 'asc' } },
      documents: { select: { id: true, titre: true, statut: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 10 },
      conversations: { select: { id: true, titre: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 10 },
      client: { select: { id: true, nom: true, type: true, telephone: true } },
    },
  })

  if (!dossier) {
    res.status(404).json({ error: 'Dossier non trouvé' })
    return
  }

  res.json(dossier)
})

const PatchDossierSchema = z.object({
  roleClient: z.enum(['DEMANDEUR', 'DEFENDEUR', 'INCONNU']).optional(),
  titreAffaire: z.string().max(300).optional(),
  // CRM
  clientId: z.string().max(40).nullable().optional(),
  partieAdverse: z.string().trim().max(300).nullable().optional(),
  honorairesConvenusCentimes: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
})

// Modifier le rôle du client (recalcule عليكم / على الخصم) ou le titre
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = PatchDossierSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const dossier = await prisma.dossier.findFirst({ where: { id: req.params.id, userId: { in: req.equipe! } } })
  if (!dossier) { res.status(404).json({ error: 'Dossier non trouvé' }); return }
  if (parse.data.clientId && !(await prisma.client.findFirst({ where: { id: parse.data.clientId, userId: { in: req.equipe! } }, select: { id: true } }))) {
    res.status(404).json({ error: 'Client non trouvé' }); return
  }
  const updated = await prisma.dossier.update({ where: { id: dossier.id }, data: parse.data })
  if (parse.data.roleClient && parse.data.roleClient !== dossier.roleClient) {
    await deadlineService.recalculerCamps(dossier.id, parse.data.roleClient)
  }
  res.json(updated)
})

const NatureSchema = z.object({ nature: z.enum(['CONTRADICTOIRE', 'DEFAUT']) })

// « طبيعة الحكم » : حضوري / غيابي
router.patch('/:id/evenements/:evId/nature', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = NatureSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  try {
    await deadlineService.appliquerNature(req.params.evId, req.equipe!, parse.data.nature)
    res.json({ ok: true })
  } catch (e: any) {
    res.status(404).json({ error: e.message })
  }
})

// « إجراء يحتاج مراجعتكم » : l'avocat dit ce qu'est l'acte que ni les règles ni l'IA n'ont su classer
const TypeCorrigeSchema = z.object({ typeEvenement: z.enum(['JUGEMENT_RENDU', 'ORDONNANCE_RENDUE', 'NOTIFICATION_PARTIE', 'AUTRE']) })

router.patch('/:id/evenements/:evId/type', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = TypeCorrigeSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const ev = await prisma.evenement.findFirst({ where: { id: req.params.evId, dossierId: req.params.id, dossier: { userId: { in: req.equipe! } } } })
  if (!ev) { res.status(404).json({ error: 'Événement non trouvé' }); return }
  await prisma.echeance.deleteMany({ where: { evenementId: ev.id, estComplete: false } })
  await prisma.evenement.update({ where: { id: ev.id }, data: { typeEvenement: parse.data.typeEvenement, sousType: 'CORRIGE_AVOCAT', confiance: 1, estTraite: true } })
  await deadlineQueue.add('generate-deadlines', {}) // délais + alerte « بدأ أجل » dans la minute
  res.json({ ok: true })
})

router.delete('/:id', requireAuth, sansSecretaire, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossier = await prisma.dossier.findFirst({
    where: { id: req.params.id, userId: { in: req.equipe! } },
  })

  if (!dossier) {
    res.status(404).json({ error: 'Dossier non trouvé' })
    return
  }

  await prisma.dossier.delete({ where: { id: req.params.id } })

  res.json({ message: 'Dossier supprimé' })
})

router.post('/:id/scraper', requireAuth, limiter('sync-dossier', 30, 3600), async (req: AuthRequest, res: Response): Promise<void> => {
  const dossier = await prisma.dossier.findFirst({
    where: { id: req.params.id, userId: { in: req.equipe! } },
  })

  if (!dossier) {
    res.status(404).json({ error: 'Dossier non trouvé' })
    return
  }

  await scraperQueue.add('scrape-dossier', { dossierId: dossier.id, userId: req.userId! }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })

  res.json({ message: 'Scraping lancé' })
})

// « تحضير ملف العمل » : toutes les données utiles aux documents du dossier + actes de procédure suggérés
router.get('/:id/pack', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const d = await prisma.dossier.findFirst({
    where: { id: req.params.id, userId: { in: req.equipe! } },
    include: {
      client: true,
      evenements: { orderBy: { datePublicationGreffe: 'desc' }, take: 30, select: { texteArabe: true, typeEvenement: true, dateAudience: true, datePublicationGreffe: true } },
      echeances: { where: { estComplete: false, estExpire: false }, orderBy: { dateLimite: 'asc' }, select: { descriptionAr: true, description: true, dateLimite: true, camp: true } },
      factures: { where: { statut: { not: 'BROUILLON' } }, orderBy: { dateEmission: 'desc' }, select: { id: true, numero: true, type: true, statut: true, dateEmission: true, totalTtcCentimes: true } },
      reglements: { orderBy: { date: 'desc' }, select: { id: true, montantCentimes: true, date: true, mode: true, reference: true, factureId: true } },
    },
  })
  if (!d) { res.status(404).json({ error: 'Dossier non trouvé' }); return }
  const [tribunal, avocat, profil] = await Promise.all([
    prisma.tribunal.findUnique({ where: { code: d.tribunal }, select: { nomAr: true, ville: true } }),
    prisma.user.findUnique({ where: { id: req.userId! }, select: { nom: true, prenom: true, barreau: true, telephone: true, email: true } }),
    lireProfil(req.cabinetId ?? req.userId!, req.userId!),
  ])
  const [parties, ...reste] = (d.titreAffaire ?? '').split(/\s+[—-]\s+/)
  const [demandeur, defendeur] = parties.split(/\s+ضد\s+/)
  const nomClient = d.client?.nom || (d.roleClient === 'DEMANDEUR' ? demandeur?.trim() : d.roleClient === 'DEFENDEUR' ? defendeur?.trim() : '') || ''
  const nomAdversaire = adversaireDuDossier(d)
  const jug = d.evenements.find((e) => e.typeEvenement === 'JUGEMENT_RENDU' || e.typeEvenement === 'ORDONNANCE_RENDUE')
  // Codes créés à l'ajout (TPI_CASA_CIVIL…) absents du référentiel : nom pris dans la liste des cours du scraper
  const tribunalAr = tribunal?.nomAr
    ?? TRIBUNAUX_COMPLETS.flatMap((c) => [{ code: c.code, nomAr: c.nomAr }, ...c.tribunauxPrimaires]).find((t) => t.code === d.tribunal)?.nomAr
    ?? d.tribunal
  const prochaineAudience = d.evenements.filter((e) => e.dateAudience && e.dateAudience >= new Date()).map((e) => e.dateAudience!).sort((a, b) => a.getTime() - b.getTime())[0] ?? null
  res.json({
    dossier: {
      id: d.id, numeroDossier: d.numeroDossier, tribunal: d.tribunal, tribunalAr, ville: tribunal?.ville ?? null, estCourAppel: d.estCourAppel,
      typeProcedure: d.typeProcedure, titreAffaire: d.titreAffaire, objet: reste.join(' — ').trim(), roleClient: d.roleClient,
      honorairesConvenusCentimes: d.honorairesConvenusCentimes, createdAt: d.createdAt, prochaineAudience,
    },
    client: d.client, nomClient, nomAdversaire, avocat, profil,
    evenements: d.evenements, echeances: d.echeances, factures: d.factures, reglements: d.reglements,
    jugement: jug ? { texte: jug.texteArabe, date: jug.datePublicationGreffe } : null,
    actesIA: actesSuggeres({
      estCourAppel: d.estCourAppel, typeProcedure: d.typeProcedure, roleClient: d.roleClient, numeroDossier: d.numeroDossier, tribunalAr,
      nomClient, nomAdversaire, objet: reste.join(' — ').trim(), nbEvenements: d.evenements.length,
      jugement: jug ? { texte: jug.texteArabe, date: jug.datePublicationGreffe } : null,
    }),
  })
})

router.get('/:id/evenements', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossier = await prisma.dossier.findFirst({
    where: { id: req.params.id, userId: { in: req.equipe! } },
  })

  if (!dossier) {
    res.status(404).json({ error: 'Dossier non trouvé' })
    return
  }

  const evenements = await prisma.evenement.findMany({
    where: { dossierId: req.params.id },
    orderBy: { datePublicationGreffe: 'desc' },
  })

  res.json(evenements)
})


export default router