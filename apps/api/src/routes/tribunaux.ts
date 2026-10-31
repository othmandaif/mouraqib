import { Router, Response } from 'express'
import { prisma } from '../utils/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { juridictionsPour, LIBELLE_TYPE } from '../services/juridictions/referentiel'

const router = Router()

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

/* GET /api/v1/tribunaux/juridictions?code=8210 → cours d'appel et tribunaux proposés par mahakim pour ce code */
router.get('/juridictions', requireAuth, (req: AuthRequest, res: Response): void => {
  const code = String(req.query.code ?? '')
  if (!/^\d{4}$/.test(code)) { res.status(400).json({ error: 'Code dossier invalide (4 chiffres)' }); return }
  const { type, cours } = juridictionsPour(code)
  res.set('Cache-Control', 'private, max-age=3600')
  res.json({ type, libelle: LIBELLE_TYPE[type], cours })
})

export default router