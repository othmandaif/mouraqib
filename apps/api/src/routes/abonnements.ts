import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/current', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const abonnement = await prisma.abonnement.findFirst({
    where: { userId: req.userId!, statut: 'ACTIF' },
    orderBy: { dateDebut: 'desc' },
  })

  const dossierCount = await prisma.dossier.count({
    where: { userId: req.userId!, estActif: true },
  })

  res.json({ abonnement, dossierCount })
})

router.get('/plans', (_req, res: Response): void => {
  res.json([
    { plan: 'GRATUIT', prix: 0, maxDossiers: 3, features: ['3 dossiers', 'Alertes WhatsApp'] },
    { plan: 'STARTER', prix: 149, maxDossiers: 25, features: ['25 dossiers', 'Alertes WhatsApp', 'Digest quotidien'] },
    { plan: 'PRO', prix: 349, maxDossiers: 100, features: ['100 dossiers', 'Alertes WhatsApp', 'Digest quotidien', 'Export PDF'] },
    { plan: 'CABINET', prix: 799, maxDossiers: 500, features: ['500 dossiers', 'Multi-avocats', 'API accès', 'Support prioritaire'] },
  ])
})

export default router
