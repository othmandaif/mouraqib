import { Router, Response } from 'express'
import { z } from 'zod'
import { CanalAlerte, TypeAlerte } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { lirePreferences, PreferencesSchema } from '../services/alerts/preferences'

const router = Router()

// Page « التنبيهات » : les alertes in-app + la trace des résumés WhatsApp du matin.
const VISIBLES = { OR: [{ canal: CanalAlerte.IN_APP }, { canal: CanalAlerte.WHATSAPP, typeAlerte: TypeAlerte.DIGEST_QUOTIDIEN }] }

// vue « a-traiter » = non lues (disparaissent dès qu'elles sont lues ou traitées) ; « historique » = le reste.
// Par pages (`avant` = date de la dernière reçue) : on ne charge jamais tout l'historique d'un coup.
const ListeSchema = z.object({
  vue: z.enum(['a-traiter', 'historique']).optional(),
  avant: z.string().datetime().optional(),
  taille: z.coerce.number().int().min(1).max(100).default(30),
})
const NON_LUE = { canal: CanalAlerte.IN_APP, luAt: null }

router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = ListeSchema.safeParse(req.query)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const { vue, avant, taille } = parse.data
  const filtreVue = vue === 'a-traiter' ? NON_LUE : vue === 'historique' ? { ...VISIBLES, NOT: NON_LUE } : VISIBLES
  const alertes = await prisma.alerte.findMany({
    where: { userId: req.userId!, ...filtreVue, ...(avant ? { createdAt: { lt: new Date(avant) } } : {}) },
    include: {
      dossier: { select: { id: true, numeroDossier: true, tribunal: true, titreAffaire: true } },
      echeance: { select: { id: true, descriptionAr: true, description: true, dateLimite: true, camp: true, typeDelai: true } },
      evenement: { select: { id: true, typeEvenement: true, natureJugement: true, dateAudience: true, texteArabe: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: vue ? taille : 100, // sans vue : ancien comportement (compatibilité)
  })
  res.json(alertes)
})

router.get('/non-lues', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const n = await prisma.alerte.count({ where: { userId: req.userId!, luAt: null, canal: CanalAlerte.IN_APP } })
  res.json({ nonLues: n })
})

router.patch('/:id/lu', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await prisma.alerte.updateMany({ where: { id: req.params.id, userId: req.userId!, luAt: null }, data: { luAt: new Date() } })
  res.json({ ok: true, maj: r.count })
})

router.post('/lu-tout', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await prisma.alerte.updateMany({ where: { userId: req.userId!, luAt: null }, data: { luAt: new Date() } })
  res.json({ ok: true, maj: r.count })
})

router.get('/preferences', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { whatsappNumero: true, whatsappVerifie: true, preferences: true },
  })
  res.json({ whatsappNumero: user?.whatsappNumero ?? null, whatsappVerifie: user?.whatsappVerifie ?? false, preferences: lirePreferences(user?.preferences) })
})

router.put('/preferences', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = PreferencesSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const preferences = lirePreferences(parse.data) // re-verrouille la ligne « 48 h »
  await prisma.user.update({ where: { id: req.userId! }, data: { preferences } })
  res.json({ ok: true, preferences })
})

export default router
