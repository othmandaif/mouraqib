import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { WhatsAppService } from '../services/whatsapp/whatsappService'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()
const whatsapp = new WhatsAppService()

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nom: z.string().min(2),
  prenom: z.string().min(2),
  telephone: z.string().min(10),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parse = RegisterSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() })
    return
  }

  const { email, password, nom, prenom, telephone } = parse.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email déjà utilisé' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, passwordHash, nom, prenom, telephone },
  })

  await prisma.abonnement.create({
    data: {
      userId: user.id,
      plan: 'GRATUIT',
      statut: 'ACTIF',
      maxDossiers: 3,
      dateDebut: new Date(),
      dateFin: new Date(Date.now() + 365 * 86_400_000),
    },
  })

  res.status(201).json({ message: 'Compte créé' })
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parse = LoginSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() })
    return
  }

  const { email, password } = parse.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Identifiants incorrects' })
    return
  }

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  })

  const token = jwt.sign(
    { userId: user.id, sessionId: session.id },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

  res.json({
    token,
    user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role },
  })
})

router.post('/logout', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const header = req.headers.authorization!
  const token = header.slice(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sessionId: string }
    await prisma.session.delete({ where: { id: payload.sessionId } })
  } catch {}

  res.json({ message: 'Déconnecté' })
})

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: {
      id: true, email: true, nom: true, prenom: true, telephone: true,
      whatsappNumero: true, whatsappVerifie: true, role: true,
      abonnements: { where: { statut: 'ACTIF' }, take: 1 },
    },
  })
  res.json(user)
})

router.post('/whatsapp/envoyer-code', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { telephone } = req.body
  if (!telephone) {
    res.status(400).json({ error: 'Numéro requis' })
    return
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiry = new Date(Date.now() + 10 * 60 * 1000)

  await prisma.user.update({
    where: { id: req.userId! },
    data: { whatsappNumero: telephone },
  })

  const ok = await whatsapp.envoyerCodeVerification(telephone, code)
  if (!ok) {
    res.status(500).json({ error: "Échec d'envoi WhatsApp" })
    return
  }

  await prisma.session.updateMany({
    where: { userId: req.userId! },
    data: { token: `wa_${code}_${expiry.toISOString()}` },
  })

  res.json({ message: 'Code envoyé' })
})

router.post('/whatsapp/verifier-code', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { code } = req.body
  if (!code) {
    res.status(400).json({ error: 'Code requis' })
    return
  }

  const session = await prisma.session.findFirst({
    where: { userId: req.userId!, token: { startsWith: `wa_${code}_` } },
  })

  if (!session) {
    res.status(400).json({ error: 'Code invalide' })
    return
  }

  const parts = session.token.split('_')
  const expiry = new Date(parts[2])
  if (expiry < new Date()) {
    res.status(400).json({ error: 'Code expiré' })
    return
  }

  await prisma.user.update({
    where: { id: req.userId! },
    data: { whatsappVerifie: true },
  })

  res.json({ message: 'WhatsApp vérifié' })
})

export default router
