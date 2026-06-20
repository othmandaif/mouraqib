import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { scraperQueue, nlpQueue, searchQueue, redisConnection, searchResultKey } from '../jobs/queues'
import { findTribunalCode } from '../services/scraper/mahakimScraper'
import { MahakimAuth } from '../services/scraper/mahakimAuth'
import { logger } from '../utils/logger'

const router = Router()
const prisma = new PrismaClient()
const mahakimAuth = new MahakimAuth()

const EvenementInputSchema = z.object({
  texteArabe: z.string().min(1),
  dateAudience: z.string().optional().nullable(),
  datePublication: z.string(),
  rawHtml: z.string().optional().nullable(),
})

const AddDossierSchema = z.object({
  anneeDossier: z.string().regex(/^\d{4}$/, 'Format année invalide (ex: 2024)'),
  codeRole: z.string().min(1, 'Code rôle requis'),
  numeroDossier: z.string().min(1, 'Numéro dossier requis'),
  courAppel: z.string().min(2),
  tribunalPrimaire: z.string().optional(),
  titreAffaire: z.string().optional(),
  typeProcedure: z.enum(['CIVILE', 'REFERE', 'INJONCTION', 'APPEL', 'CASSATION']).optional(),
  mahakim_login: z.string().optional(),
  mahakim_password: z.string().optional(),
  evenements: z.array(EvenementInputSchema).optional(),
  rawData: z.any().optional(),
})

const RechercheSchema = z.object({
  anneeDossier: z.string().regex(/^\d{4}$/, 'Format année invalide'),
  codeRole: z.string().min(1, 'Code rôle requis'),
  numeroDossier: z.string().min(1, 'Numéro dossier requis'),
  courAppel: z.string().min(2),
  tribunalPrimaire: z.string().optional(),
})


// PATCH /api/v1/dossiers/:id/archiver   → estActif = false
router.patch('/:id/archiver', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossier = await prisma.dossier.findFirst({ where: { id: req.params.id, userId: req.userId! } })
  if (!dossier) { res.status(404).json({ error: 'Dossier non trouvé' }); return }
  await prisma.dossier.update({ where: { id: dossier.id }, data: { estActif: false } })
  res.json({ ok: true, estActif: false })
})

// PATCH /api/v1/dossiers/:id/restaurer  → estActif = true
router.patch('/:id/restaurer', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossier = await prisma.dossier.findFirst({ where: { id: req.params.id, userId: req.userId! } })
  if (!dossier) { res.status(404).json({ error: 'Dossier non trouvé' }); return }
  await prisma.dossier.update({ where: { id: dossier.id }, data: { estActif: true } })
  res.json({ ok: true, estActif: true })
})
 
// GET /api/v1/dossiers/archives  → liste des dossiers archivés
router.get('/archives', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossiers = await prisma.dossier.findMany({
    where: { userId: req.userId!, estActif: false },
    include: {
      echeances: { where: { estExpire: false, estComplete: false }, orderBy: { dateLimite: 'asc' }, take: 3 },
      evenements: { orderBy: { datePublicationGreffe: 'desc' }, take: 1 },
      _count: { select: { evenements: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(dossiers)
})
 
router.get('/ping', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), version: 3 })
})

router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { q, tribunal } = req.query
  const where: any = { userId: req.userId!, estActif: true }

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

  const dossiers = await prisma.dossier.findMany({
    where,
    include: {
      _count: { select: { evenements: true, echeances: true } },
      echeances: {
        where: { estCritique: true, estComplete: false, estExpire: false },
        select: { id: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(dossiers)
})

/**
 * Recherche live ASYNCHRONE.
 * Au lieu d'attendre le scraping (qui peut dépasser le timeout d'un proxy → 500/504),
 * on met un job dans la file `search` et on renvoie immédiatement un jobId.
 * Le front interroge ensuite GET /rechercher/:jobId jusqu'à obtenir le résultat.
 */
router.post('/rechercher', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
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

    logger.info(`Recherche live mise en file (job ${job.id}) pour ${anneeDossier}/${codeRole}/${numeroDossier}`)
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

router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parse = AddDossierSchema.safeParse(req.body)
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten() })
      return
    }

    const { anneeDossier, codeRole, numeroDossier, courAppel, tribunalPrimaire, titreAffaire, typeProcedure, mahakim_login, mahakim_password, evenements, rawData } = parse.data
    const numComplet = `${anneeDossier}/${codeRole}/${numeroDossier}`

    const tribunal = findTribunalCode(courAppel, tribunalPrimaire) ?? courAppel
    const estCourAppel = !tribunalPrimaire

    const existing = await prisma.dossier.findFirst({
      where: { anneeDossier, codeRole, numeroDossier, tribunal, userId: req.userId!, estActif: true },
    })
    if (existing) {
      res.status(409).json({ error: 'Dossier déjà ajouté' })
      return
    }

    const dossier = await prisma.$transaction(async (tx) => {
      const d = await tx.dossier.create({
        data: {
          numeroDossier: numComplet,
          anneeDossier,
          codeRole,
          tribunal,
          estCourAppel,
          titreAffaire,
          typeProcedure: typeProcedure as any ?? 'CIVILE',
          userId: req.userId!,
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
            estNouvel: true,
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

    if (mahakim_login && mahakim_password) {
      await mahakimAuth.storeCredentials(req.userId!, mahakim_login, mahakim_password)
    }

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
    where: { id: req.params.id, userId: req.userId! },
    include: {
      evenements: { orderBy: { datePublicationGreffe: 'desc' }, take: 50 },
      echeances: { where: { estComplete: false }, orderBy: { dateLimite: 'asc' } },
    },
  })

  if (!dossier) {
    res.status(404).json({ error: 'Dossier non trouvé' })
    return
  }

  res.json(dossier)
})

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossier = await prisma.dossier.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  })

  if (!dossier) {
    res.status(404).json({ error: 'Dossier non trouvé' })
    return
  }

  await prisma.dossier.delete({ where: { id: req.params.id } })

  res.json({ message: 'Dossier supprimé' })
})

router.post('/:id/scraper', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossier = await prisma.dossier.findFirst({
    where: { id: req.params.id, userId: req.userId! },
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

router.get('/:id/evenements', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossier = await prisma.dossier.findFirst({
    where: { id: req.params.id, userId: req.userId! },
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