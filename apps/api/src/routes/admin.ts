import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth'
import { NLPService } from '../services/nlp/nlpService'
import { scraperQueue, nlpQueue, alertQueue, deadlineQueue } from '../jobs/queues'

const router = Router()
const prisma = new PrismaClient()
const nlpService = new NLPService()

router.use(requireAuth, requireRole('ADMIN'))

// Statistiques globales
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  const [users, dossiers, evenements, echeances, alertes] = await Promise.all([
    prisma.user.count(),
    prisma.dossier.count({ where: { estActif: true } }),
    prisma.evenement.count(),
    prisma.echeance.count({ where: { estComplete: false, estExpire: false } }),
    prisma.alerte.count({ where: { statut: 'EN_ATTENTE' } }),
  ])

  const nlpStats = await nlpService.getStats()

  res.json({ users, dossiers, evenements, echeances, alertesPending: alertes, nlpStats })
})

// Liste des utilisateurs
router.get('/users', async (_req: AuthRequest, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, nom: true, prenom: true, role: true,
      whatsappVerifie: true, createdAt: true,
      abonnements: { where: { statut: 'ACTIF' }, select: { plan: true }, take: 1 },
      _count: { select: { dossiers: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)
})

// Forcer scraping global
router.post('/scrape', async (_req: AuthRequest, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    where: { abonnements: { some: { statut: 'ACTIF' } } },
    select: { id: true },
  })

  for (const user of users) {
    await scraperQueue.add('scrape-all', { userId: user.id }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
    })
  }

  res.json({ message: `Scraping lancé pour ${users.length} utilisateurs` })
})

// Forcer NLP
router.post('/nlp', async (_req: AuthRequest, res: Response): Promise<void> => {
  await nlpQueue.add('process-pending', {})
  res.json({ message: 'NLP lancé' })
})

// Statut des queues
router.get('/queues', async (_req: AuthRequest, res: Response): Promise<void> => {
  const [scraperCounts, nlpCounts, alertCounts, deadlineCounts] = await Promise.all([
    scraperQueue.getJobCounts(),
    nlpQueue.getJobCounts(),
    alertQueue.getJobCounts(),
    deadlineQueue.getJobCounts(),
  ])

  res.json({
    scraper: scraperCounts,
    nlp: nlpCounts,
    alerts: alertCounts,
    deadlines: deadlineCounts,
  })
})

// Changer le plan d'un utilisateur (test/support)
router.post('/users/:id/plan', async (req: AuthRequest, res: Response): Promise<void> => {
  const { plan, maxDossiers } = req.body

  await prisma.abonnement.updateMany({
    where: { userId: req.params.id, statut: 'ACTIF' },
    data: { statut: 'ANNULE' },
  })

  await prisma.abonnement.create({
    data: {
      userId: req.params.id,
      plan,
      statut: 'ACTIF',
      maxDossiers: maxDossiers ?? 100,
      dateDebut: new Date(),
      dateFin: new Date(Date.now() + 365 * 86_400_000),
    },
  })

  res.json({ message: `Plan ${plan} activé pour ${req.params.id}` })
})

export default router
