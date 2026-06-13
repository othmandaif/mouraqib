import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const alertes = await prisma.alerte.findMany({
    where: { userId: req.userId! },
    include: {
      dossier: { select: { numeroDossier: true, tribunal: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  res.json(alertes)
})

router.get('/preferences', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { whatsappNumero: true, whatsappVerifie: true },
  })
  res.json(user)
})

export default router
