import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/stats', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const hier = new Date(Date.now() - 86_400_000)
  const semaineDerniere = new Date(Date.now() - 7 * 86_400_000)

  const [totalDossiers, delaisCritiques, evenementsAujourdhui, renvoisCetteSemaine] = await Promise.all([
    prisma.dossier.count({ where: { userId, estActif: true } }),
    prisma.echeance.count({
      where: { dossier: { userId }, estCritique: true, estComplete: false, estExpire: false },
    }),
    prisma.evenement.count({
      where: { dossier: { userId }, createdAt: { gte: hier } },
    }),
    prisma.evenement.count({
      where: {
        dossier: { userId },
        typeEvenement: { in: ['RENVOI_SIMPLE', 'RENVOI_EXPERT', 'RENVOI_NOTIFICATION'] as any },
        createdAt: { gte: semaineDerniere },
      },
    }),
  ])

  res.json({ totalDossiers, delaisCritiques, evenementsAujourdhui, renvoisCetteSemaine })
})

export default router
