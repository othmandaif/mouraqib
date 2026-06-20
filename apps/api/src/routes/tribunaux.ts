import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

/* GET /api/v1/tribunaux  → liste du référentiel (pour traduction d'affichage) */
router.get('/', requireAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  const tribunaux = await prisma.tribunal.findMany({
    select: { code: true, nom: true, nomAr: true, ville: true, type: true },
    orderBy: { nomAr: 'asc' },
  })
  res.json(tribunaux)
})

/* GET /api/v1/tribunaux/map  → objet { code: nomAr } pratique pour le front */
router.get('/map', requireAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  const tribunaux = await prisma.tribunal.findMany({ select: { code: true, nomAr: true, ville: true } })
  const map: Record<string, { nomAr: string; ville: string }> = {}
  for (const t of tribunaux) map[t.code] = { nomAr: t.nomAr, ville: t.ville }
  res.json(map)
})

export default router