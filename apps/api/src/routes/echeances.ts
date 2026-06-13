import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { DeadlineService } from '../services/deadlines/deadlineService'

const router = Router()
const prisma = new PrismaClient()
const deadlineService = new DeadlineService()

router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const echeances = await deadlineService.getEcheancesUtilisateur(req.userId!)
  res.json(echeances)
})

router.get('/critiques', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const echeances = await prisma.echeance.findMany({
    where: {
      dossier: { userId: req.userId! },
      estCritique: true,
      estComplete: false,
      estExpire: false,
    },
    include: {
      dossier: { select: { numeroDossier: true, tribunal: true, titreAffaire: true } },
    },
    orderBy: { dateLimite: 'asc' },
  })
  res.json(echeances)
})

router.patch('/:id/complete', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deadlineService.marquerComplete(req.params.id, req.userId!)
    res.json({ message: 'Échéance marquée complète' })
  } catch (error: any) {
    res.status(404).json({ error: error.message })
  }
})

export default router
