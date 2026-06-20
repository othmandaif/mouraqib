import { Router, Response } from 'express'
import { PrismaClient, RoleChat } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { analyserDossierComplet } from '../services/ai/dossierAnalyse'
import { streamDeepseek, ChatMessage, askDeepseek } from '../services/ai/deepseek'
import { PROMPT_CHAT_SYSTEME } from '../services/ai/prompts.ar'
import { construireContextePortefeuille } from '../services/ai/portefeuilleContext'
import { logger } from '../utils/logger'

const router = Router()
const prisma = new PrismaClient()

/* Brique 4 — Analyse complète d'un dossier */
router.post('/dossiers/:id/analyser', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const force = req.body?.force === true
  try {
    const analyse = await analyserDossierComplet(req.params.id, req.userId!, force)
    if (!analyse) {
      res.status(404).json({ error: 'Dossier introuvable ou sans événements à analyser' })
      return
    }
    res.json(analyse)
  } catch (err: any) {
    logger.error('Erreur analyse dossier:', err)
    res.status(500).json({ error: 'Echec de l analyse' })
  }
})

/* Liste conversations */
router.get('/conversations', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const convs = await prisma.conversation.findMany({
    where: { userId: req.userId! },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: { id: true, titre: true, dossierId: true, updatedAt: true },
  })
  res.json(convs)
})

/* Creer conversation */
router.post('/conversations', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossierId = req.body?.dossierId ?? null
  const conv = await prisma.conversation.create({
    data: { userId: req.userId!, dossierId, titre: 'محادثة جديدة' },
    select: { id: true, titre: true, dossierId: true, updatedAt: true },
  })
  res.json(conv)
})

/* Messages d'une conversation */
router.get('/conversations/:id/messages', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const conv = await prisma.conversation.findFirst({ where: { id: req.params.id, userId: req.userId! } })
  if (!conv) { res.status(404).json({ error: 'Conversation introuvable' }); return }
  const messages = await prisma.messageChat.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })
  res.json(messages)
})

/* Supprimer conversation */
router.delete('/conversations/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const conv = await prisma.conversation.findFirst({ where: { id: req.params.id, userId: req.userId! } })
  if (!conv) { res.status(404).json({ error: 'Conversation introuvable' }); return }
  await prisma.conversation.delete({ where: { id: conv.id } })
  res.json({ ok: true })
})

/* Brique 5 — Chat streaming SSE */
router.post('/chat', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const { message, dossierId } = req.body ?? {}
  let conversationId: string | undefined = req.body?.conversationId

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'Message vide' })
    return
  }

  let conv = conversationId
    ? await prisma.conversation.findFirst({ where: { id: conversationId, userId } })
    : null
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { userId, dossierId: dossierId ?? null, titre: 'محادثة جديدة' },
    })
    conversationId = conv.id
  }

  const contexte = await construireContextePortefeuille(userId, message, dossierId ?? conv.dossierId ?? undefined)
  const systeme = PROMPT_CHAT_SYSTEME + '\n\n=== معطيات محفظة المحامي ===\n' + contexte

  const historique = await prisma.messageChat.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  historique.reverse()

  const messages: ChatMessage[] = [
    { role: 'system', content: systeme },
    ...historique.map((h) => ({
      role: (h.role === RoleChat.USER ? 'user' : 'assistant') as 'user' | 'assistant',
      content: h.contenu,
    })),
    { role: 'user', content: message },
  ]

  const estPremierMessage = historique.length === 0

  await prisma.messageChat.create({
    data: { userId, conversationId: conv.id, dossierId: dossierId ?? conv.dossierId ?? null, role: RoleChat.USER, contenu: message },
  })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  res.write('data: ' + JSON.stringify({ conversationId: conv.id }) + '\n\n')

  let complet = ''
  try {
    await streamDeepseek(messages, (chunk) => {
      complet += chunk
      res.write('data: ' + JSON.stringify({ delta: chunk }) + '\n\n')
    })

    await prisma.messageChat.create({
      data: { userId, conversationId: conv.id, dossierId: dossierId ?? conv.dossierId ?? null, role: RoleChat.ASSISTANT, contenu: complet },
    })

    let nouveauTitre: string | undefined
    if (estPremierMessage) {
      try {
        const t = await askDeepseek<string>(
          'أنشئ عنواناً قصيراً جداً (3-5 كلمات) بالعربية يلخّص موضوع هذا السؤال. أرجِع العنوان فقط دون علامات.',
          message,
          { json: false, temperature: 0.2, maxTokens: 30 },
        )
        nouveauTitre = (t || '').replace(/["\u00ab\u00bb\n]/g, '').trim().slice(0, 60)
      } catch {}
    }

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date(), ...(nouveauTitre ? { titre: nouveauTitre } : {}) },
    })

    res.write('data: ' + JSON.stringify({ done: true, titre: nouveauTitre }) + '\n\n')
    res.end()
  } catch (err) {
    logger.error('Erreur chat IA:', err)
    res.write('data: ' + JSON.stringify({ error: 'فشل المساعد، حاول مجدداً' }) + '\n\n')
    res.end()
  }
})

export default router