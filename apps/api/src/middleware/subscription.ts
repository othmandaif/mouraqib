import { Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from './auth'

const prisma = new PrismaClient()

const PLAN_LIMITS: Record<string, number> = {
  GRATUIT: 3,
  STARTER: 25,
  PRO: 100,
  CABINET: 500,
}

export async function checkDossierLimit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const userId = req.userId!

  const abonnement = await prisma.abonnement.findFirst({
    where: { userId, statut: 'ACTIF' },
    orderBy: { dateDebut: 'desc' },
  })

  const plan = abonnement?.plan ?? 'GRATUIT'
  const maxDossiers = abonnement?.maxDossiers ?? PLAN_LIMITS[plan] ?? 3

  const count = await prisma.dossier.count({ where: { userId, estActif: true } })

  if (count >= maxDossiers) {
    res.status(403).json({
      error: 'Limite de dossiers atteinte',
      plan,
      maxDossiers,
      dossierActuels: count,
    })
    return
  }

  next()
}

export async function requireActiveSubscription(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const userId = req.userId!

  const abonnement = await prisma.abonnement.findFirst({
    where: { userId, statut: 'ACTIF' },
  })

  if (!abonnement) {
    res.status(403).json({ error: 'Abonnement actif requis' })
    return
  }

  next()
}
