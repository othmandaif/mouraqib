import { Router, Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { OFFRES, etatAbonnement } from '../services/abonnements/offres'
import { abonnementDe } from '../services/abonnements/rappelsAbonnement'

// Vente directe : les comptes et les paiements sont gérés par le commercial (routes /admin).
// Plus de paiement en ligne CMI.
const router = Router()

router.get('/current', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  // Membre d'un cabinet : l'abonnement est celui du cabinet (porté par le responsable)
  const abonnement = await abonnementDe(req.userId!)
  const dossierCount = await prisma.dossier.count({ where: { userId: { in: req.equipe! }, estActif: true } })
  res.json({
    abonnement: abonnement && {
      plan: abonnement.plan,
      // Limite réelle du compte (fixée par l'administrateur), pas celle de l'offre
      offre: { ...OFFRES[abonnement.plan], maxDossiers: abonnement.maxDossiers },
      estFondateur: abonnement.estFondateur,
      prixMensuel: abonnement.prixMensuel ?? (abonnement.estFondateur ? OFFRES[abonnement.plan].prixFondateur : OFFRES[abonnement.plan].prix),
      ...etatAbonnement(abonnement),
    },
    dossierCount,
    // Contact du commercial (variables d'environnement, facultatives)
    contact: { telephone: process.env.CONTACT_COMMERCIAL_TEL || '+212607167594', email: process.env.CONTACT_COMMERCIAL_EMAIL ?? 'contact@malafipro.ma' },
  })
})

// Public (landing) : places restantes du programme « 50 membres fondateurs »
export const PLACES_FONDATEURS = 50
router.get('/fondateurs', async (_req: Request, res: Response): Promise<void> => {
  const pris = await prisma.abonnement.count({ where: { estFondateur: true, statut: 'ACTIF' } })
  res.setHeader('Cache-Control', 'public, max-age=600')
  res.json({ total: PLACES_FONDATEURS, restants: Math.max(0, PLACES_FONDATEURS - pris) })
})

router.get('/plans', (_req: Request, res: Response): void => {
  res.json(Object.entries(OFFRES).filter(([k]) => ['SOLO', 'CABINET', 'SUR_MESURE'].includes(k)).map(([plan, o]) => ({ plan, ...o })))
})

export default router
