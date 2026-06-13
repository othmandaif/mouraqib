import { Router, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { checkDossierLimit } from '../middleware/subscription'
import { scraperQueue, nlpQueue } from '../jobs/queues'
import { MahakimAuth } from '../services/scraper/mahakimAuth'

const router = Router()
const prisma = new PrismaClient()
const mahakimAuth = new MahakimAuth()

const AddDossierSchema = z.object({
  numeroDossier: z.string().min(3),
  tribunal: z.string().min(2),
  titreAffaire: z.string().optional(),
  typeProcedure: z.enum(['ORDINAIRE', 'REFERE', 'INJONCTION', 'APPEL', 'CASSATION']).optional(),
  mahakim_login: z.string().optional(),
  mahakim_password: z.string().optional(),
})

router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossiers = await prisma.dossier.findMany({
    where: { userId: req.userId!, estActif: true },
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

router.post('/', requireAuth, checkDossierLimit, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = AddDossierSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() })
    return
  }

  const { numeroDossier, tribunal, titreAffaire, typeProcedure, mahakim_login, mahakim_password } = parse.data

  const existing = await prisma.dossier.findFirst({
    where: { numeroDossier, tribunal, userId: req.userId! },
  })
  if (existing) {
    res.status(409).json({ error: 'Dossier déjà ajouté' })
    return
  }

  const dossier = await prisma.dossier.create({
    data: {
      numeroDossier,
      tribunal,
      titreAffaire,
      typeProcedure: typeProcedure as any ?? 'ORDINAIRE',
      userId: req.userId!,
    },
  })

  if (mahakim_login && mahakim_password) {
    await mahakimAuth.storeCredentials(req.userId!, mahakim_login, mahakim_password)
  }

  await scraperQueue.add('scrape-dossier', { dossierId: dossier.id, userId: req.userId! }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })

  res.status(201).json(dossier)
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

  await prisma.dossier.update({
    where: { id: req.params.id },
    data: { estActif: false },
  })

  res.json({ message: 'Dossier désactivé' })
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
