import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { generateCMIPaymentForm, verifyCMICallback, PLAN_TARIFS } from '../services/payment/cmiPayment'
import { logger } from '../utils/logger'

const router = Router()
const prisma = new PrismaClient()

const PLAN_CONFIG: Record<string, { maxDossiers: number }> = {
  SOLO: { maxDossiers: 100 },
  PRO: { maxDossiers: -1 },
  CABINET: { maxDossiers: 500 },
}

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

router.get('/plans', (_req: Request, res: Response): void => {
  res.json([
    { plan: 'GRATUIT', prix: 0, maxDossiers: 3, features: ['3 dossiers', 'Alertes WhatsApp'] },
    { plan: 'SOLO', prix: 190, maxDossiers: 100, features: ['100 dossiers', 'Alertes WhatsApp', 'Digest quotidien'] },
    { plan: 'PRO', prix: 390, maxDossiers: -1, features: ['Illimité', 'Alertes WhatsApp', 'Digest quotidien', 'API accès'] },
    { plan: 'CABINET', prix: 790, maxDossiers: 500, features: ['500 dossiers', 'Multi-avocats', 'API accès', 'Support prioritaire'] },
  ])
})

router.post('/checkout', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { plan } = req.body
  const montant = PLAN_TARIFS[plan]

  if (!montant) {
    res.status(400).json({ error: 'Plan invalide' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!user) { res.status(404).json({ error: 'Utilisateur non trouvé' }); return }

  const orderId = `MOURAQIB-${req.userId!}-${plan}-${Date.now()}`

  const formHtml = generateCMIPaymentForm({
    amount: montant,
    orderId,
    description: `Mouraqib ${plan} — 1 mois`,
    email: user.email,
    callbackUrl: `${process.env.API_URL}/api/v1/abonnements/callback/cmi`,
    okUrl: `${process.env.WEB_URL}/abonnement?success=1`,
    failUrl: `${process.env.WEB_URL}/abonnement?echec=1`,
  })

  await prisma.paiement.create({
    data: {
      abonnementId: (await prisma.abonnement.findFirst({ where: { userId: req.userId! } }))?.id ?? '',
      montant,
      devise: 'MAD',
      methode: 'CMI',
      referenceExterne: orderId,
      statut: 'EN_ATTENTE',
    },
  }).catch(() => {})

  res.json({ formHtml, orderId })
})

router.post('/callback/cmi', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Record<string, string>

  if (!verifyCMICallback(body)) {
    logger.warn('CMI callback signature invalide', body)
    res.status(400).send('INVALID_SIGNATURE')
    return
  }

  const { oid, Response: cmiResponse } = body

  if (cmiResponse === '00') {
    const parts = oid.split('-')
    const userId = parts[1]
    const plan = parts[2]
    const config = PLAN_CONFIG[plan]

    if (userId && config) {
      await prisma.abonnement.updateMany({
        where: { userId, statut: 'ACTIF' },
        data: { statut: 'ANNULE' },
      })

      await prisma.abonnement.create({
        data: {
          userId,
          plan: plan as any,
          statut: 'ACTIF',
          maxDossiers: config.maxDossiers,
          dateDebut: new Date(),
          dateFin: new Date(Date.now() + 31 * 86_400_000),
        },
      })

      await prisma.paiement.updateMany({
        where: { referenceExterne: oid },
        data: { statut: 'REUSSI' },
      })

      logger.info(`Paiement CMI OK: ${oid} — user ${userId} → ${plan}`)
    }
  } else {
    await prisma.paiement.updateMany({
      where: { referenceExterne: oid },
      data: { statut: 'ECHEC' },
    })
    logger.warn(`Paiement CMI échoué: ${oid} — code ${cmiResponse}`)
  }

  res.send('ACTION=POSTAUTH')
})

export default router
