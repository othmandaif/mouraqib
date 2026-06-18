import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { scraperQueue, nlpQueue } from '../jobs/queues'
import { MahakimScraper, findTribunalCode } from '../services/scraper/mahakimScraper'
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

router.get('/ping', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), version: 2 })
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

router.post('/rechercher', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('*** ROUTE /rechercher APPELEE ***', new Date().toISOString())
  const parse = RechercheSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() })
    return
  }

  const { anneeDossier, codeRole, numeroDossier, courAppel, tribunalPrimaire } = parse.data
  const numComplet = `${anneeDossier}/${codeRole}/${numeroDossier}`

  try {
    const scraper = new MahakimScraper()
    await scraper.init()
    const data = await scraper.scrapeDossier(numComplet, courAppel, tribunalPrimaire)
    await scraper.close()

    if (!data) {
      logger.warn(`Aucune donnée trouvée pour ${numComplet}`)
      res.json({ trouve: false, titreAffaire: null, evenements: [], infosCarte: null, parties: [], expertises: [], recours: [], dossiersLies: [] })
      return
    }

    logger.info(`Recherche réussie pour ${numComplet}: ${data.evenements.length} événements, ${data.parties.length} parties`)
    res.json({
      trouve: true,
      titreAffaire: data.titreAffaire ?? null,
      evenements: data.evenements,
      infosCarte: data.infosCarte,
      parties: data.parties,
      expertises: data.expertises,
      recours: data.recours,
      dossiersLies: data.dossiersLies,
    })
  } catch (error) {
    logger.error(`Erreur dans /rechercher pour ${numComplet}:`, error)
    res.json({ trouve: false, titreAffaire: null, evenements: [], infosCarte: null, parties: [], expertises: [], recours: [], dossiersLies: [] })
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
