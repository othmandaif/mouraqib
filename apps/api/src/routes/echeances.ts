import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { DeadlineService } from '../services/deadlines/deadlineService'
import { logger } from '../utils/logger'

const router = Router()
const deadlineService = new DeadlineService()

// GET /echeances?statut=actives|completees|expirees
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const s = String(req.query.statut ?? 'actives')
  const statut = s === 'completees' || s === 'expirees' ? s : 'actives'
  res.json(await deadlineService.getEcheancesUtilisateur(req.equipe!, statut))
})

// Délais critiques à AGIR (pastille rouge de la navigation)
router.get('/critiques', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const echeances = await prisma.echeance.findMany({
    where: {
      dossier: { userId: { in: req.equipe! } },
      estCritique: true,
      estComplete: false,
      estExpire: false,
      camp: 'AGIR',
    },
    include: {
      dossier: { select: { id: true, numeroDossier: true, tribunal: true, titreAffaire: true } },
    },
    orderBy: { dateLimite: 'asc' },
  })
  res.json(echeances)
})

const action = (fn: (id: string, equipe: string[], body: any) => Promise<void>) =>
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await fn(req.params.id, req.equipe!, req.body ?? {})
      res.json({ ok: true })
    } catch (error: any) {
      // Erreurs prévues (404, 400) : message affiché. Le reste (base indisponible…) = 500, pas un faux « introuvable »
      if (error?.status) { res.status(error.status).json({ error: error.message }); return }
      logger.error('Action échéance échouée:', error)
      res.status(500).json({ error: 'Erreur interne, réessayez' })
    }
  }

router.patch('/:id/complete', requireAuth, action((id, u) => deadlineService.marquerComplete(id, u)))
router.patch('/:id/rouvrir', requireAuth, action((id, u) => deadlineService.rouvrir(id, u)))

const CampSchema = z.object({ camp: z.enum(['AGIR', 'SURVEILLER']) })
router.patch('/:id/camp', requireAuth, action((id, u, body) => {
  const p = CampSchema.safeParse(body)
  if (!p.success) throw Object.assign(new Error('camp invalide'), { status: 400 })
  return deadlineService.changerCamp(id, u, p.data.camp)
}))

const RappelSchema = z.object({ date: z.string().datetime() })
router.patch('/:id/rappel', requireAuth, action((id, u, body) => {
  const p = RappelSchema.safeParse(body)
  if (!p.success) throw Object.assign(new Error('date invalide'), { status: 400 })
  return deadlineService.programmerRappel(id, u, new Date(p.data.date))
}))

export default router
