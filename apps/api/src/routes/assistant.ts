import { Router, Response } from 'express'
import { z } from 'zod'
import { RoleChat } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { limiter } from '../middleware/securite'
import { analyserDossierComplet } from '../services/ai/dossierAnalyse'
import { streamDeepseek, ChatMessage, askDeepseek } from '../services/ai/deepseek'
import { PROMPT_CHAT_SYSTEME } from '../services/ai/prompts.ar'
import { construireContextePortefeuille } from '../services/ai/portefeuilleContext'
import { logger } from '../utils/logger'
import { rechercherArticles, formaterArticles, besoinDeDroit } from '../services/ai/ragJuridique'
import { verifierReponse, consigneCorrection } from '../services/ai/guardrailJuridique'

const router = Router()

/* Brique 4 — Analyse complète d'un dossier */
router.post('/dossiers/:id/analyser', requireAuth, limiter('ia-analyse', 20, 3600), async (req: AuthRequest, res: Response): Promise<void> => {
  const force = req.body?.force === true
  try {
    const analyse = await analyserDossierComplet(req.params.id, { in: req.equipe! }, force)
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
    select: { id: true, titre: true, dossierId: true, updatedAt: true, dossier: { select: { numeroDossier: true } } },
  })
  res.json(convs)
})

/* Creer conversation */
router.post('/conversations', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const demande = typeof req.body?.dossierId === 'string' ? req.body.dossierId : null
  // Un dossier qui n'est ni à l'avocat ni à son cabinet est ignoré
  const dossierId = demande && (await prisma.dossier.findFirst({ where: { id: demande, userId: { in: req.equipe! } }, select: { id: true } })) ? demande : null
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

/* Avis sur une réponse : 1 = utile, -1 = pas exacte (boutons sous la réponse) */
router.post('/messages/:id/feedback', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const valeur = req.body?.valeur
  if (valeur !== 1 && valeur !== -1 && valeur !== null) { res.status(400).json({ error: 'valeur invalide' }); return }
  const r = await prisma.messageChat.updateMany({ where: { id: req.params.id, userId: req.userId!, role: RoleChat.ASSISTANT }, data: { feedback: valeur } })
  if (!r.count) { res.status(404).json({ error: 'Message introuvable' }); return }
  res.json({ ok: true })
})

/* Brique 5 — Chat streaming SSE */
const ChatSchema = z.object({
  message: z.string().min(1).max(4000),
  dossierId: z.string().max(40).optional().nullable().transform((v) => v ?? undefined),
  conversationId: z.string().max(40).optional().nullable().transform((v) => v ?? undefined),
})
const MAX_CHARS_HISTORIQUE = 3000 // par message, pour garder un contexte rapide et peu coûteux
router.post('/chat', requireAuth, limiter('ia-chat', 20, 60), limiter('ia-chat-jour', 400, 86400), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!
  const parse = ChatSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: 'Message vide ou trop long' }); return }
  const message = parse.data.message.trim()
  let conversationId: string | undefined = parse.data.conversationId
  // Le dossier doit appartenir à l'avocat (sinon il est ignoré)
  const dossierId = parse.data.dossierId && (await prisma.dossier.findFirst({ where: { id: parse.data.dossierId, userId: { in: req.equipe! } }, select: { id: true } }))
    ? parse.data.dossierId : undefined

  let conv = conversationId
    ? await prisma.conversation.findFirst({ where: { id: conversationId, userId } })
    : null
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { userId, dossierId: dossierId ?? null, titre: 'محادثة جديدة' },
    })
    conversationId = conv.id
  }

  const contexte = await construireContextePortefeuille({ in: req.equipe! }, message, dossierId ?? conv.dossierId ?? undefined)

  const historique = await prisma.messageChat.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  historique.reverse()

  const estPremierMessage = historique.length === 0

  // On enregistre tout de suite le message de l'utilisateur.
  await prisma.messageChat.create({
    data: { userId, conversationId: conv.id, dossierId: dossierId ?? conv.dossierId ?? null, role: RoleChat.USER, contenu: message },
  })

  // Ouverture du flux SSE.
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  res.write('data: ' + JSON.stringify({ conversationId: conv.id }) + '\n\n')

  // Page fermée → on arrête tout ; ping régulier pour que les proxys ne coupent pas le flux
  const arret = new AbortController()
  res.on('close', () => arret.abort())
  const ping = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n') }, 15_000)
  res.on('close', () => clearInterval(ping))

  // Helper : envoyer une étape de chargement au front (thinking/searching/analyzing/writing).
  const envoyerEtape = (etape: string) =>
    res.write('data: ' + JSON.stringify({ etape }) + '\n\n')

  // ── RAG juridique : on cherche dans les lois seulement si la question le nécessite ──
  const dernierEchange = historique.slice(-2).map((h) => h.contenu).join(' | ')
  let blocDroit = ''
  let sources: { titre: string | null; article: string | null; url: string | null }[] = []
  try {
    envoyerEtape('thinking')
    if (await besoinDeDroit(message, dernierEchange)) {
      envoyerEtape('searching')
      const articles = await rechercherArticles(message)
      if (articles.length) {
        blocDroit = '\n\n=== مصادر قانونية (من القوانين المغربية) ===\n' + formaterArticles(articles)
        // Cartes « المصادر » sous la réponse (dédoublonnées par texte + article)
        const vus = new Set<string>()
        sources = articles
          .map((a) => ({ titre: a.titreLoi, article: a.article, url: a.pdfUrl }))
          .filter((a) => { const k = `${a.titre}|${a.article}`; if (vus.has(k)) return false; vus.add(k); return true })
          .slice(0, 6)
        res.write('data: ' + JSON.stringify({ sources }) + '\n\n')
        envoyerEtape('analyzing')
      }
    }
  } catch (e) {
    logger.warn('RAG juridique ignoré:', e)
  }

  const systeme =
    PROMPT_CHAT_SYSTEME +
    `\n\nتاريخ اليوم: ${new Date().toLocaleDateString('ar-MA', { timeZone: 'Africa/Casablanca', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. احسب الآجال انطلاقاً منه عند الحاجة، ونبّه إلى أن التاريخ المعتمد هو تاريخ التبليغ الفعلي.` +
    '\n\n=== معطيات محفظة المحامي ===\n' + contexte +
    blocDroit +
    '\n\n=== تعليمة أخيرة ===\n' +
    'قبل أن تكتب جوابك، فكّر داخلياً خطوة بخطوة: حدّد الإشكال، افحص كل مصدر متاح وما يثبته، ' +
    'اربط المواد، استنتج النتائج، ثم ابنِ جواباً موثّقاً ودقيقاً. لا تُظهر خطوات تفكيرك الخام؛ ' +
    'أظهر فقط الجواب النهائي المنظّم والموثّق بالمصادر. كن مفيداً دائماً ولا ترفض السؤال.'

  const messages: ChatMessage[] = [
    { role: 'system', content: systeme },
    ...historique.map((h) => ({
      role: (h.role === RoleChat.USER ? 'user' : 'assistant') as 'user' | 'assistant',
      content: h.contenu.length > MAX_CHARS_HISTORIQUE ? h.contenu.slice(0, MAX_CHARS_HISTORIQUE) + '…' : h.contenu,
    })),
    { role: 'user', content: message },
  ]

  let complet = ''
  try {
    envoyerEtape('writing')
    await streamDeepseek(messages, (chunk) => {
      complet += chunk
      res.write('data: ' + JSON.stringify({ delta: chunk }) + '\n\n')
    }, { signal: arret.signal })

    // Garde-fou : relecture juridique ; si erreur grave, réponse réécrite et remplacée à l'écran
    if (!arret.signal.aborted && complet.length >= 300) {
      envoyerEtape('checking')
      const verdict = await verifierReponse(message, complet, blocDroit)
      if (!verdict.ok && verdict.probleme && !arret.signal.aborted) {
        logger.info(`Garde-fou : réponse corrigée (conversation ${conv.id})`)
        try {
          const corrige = await streamDeepseek([
            ...messages,
            { role: 'assistant', content: complet },
            { role: 'user', content: consigneCorrection(verdict.probleme) },
          ], () => {}, { signal: arret.signal, temperature: 0.3 })
          if (corrige.trim()) {
            complet = corrige
            res.write('data: ' + JSON.stringify({ correction: corrige }) + '\n\n')
          }
        } catch (e) { logger.warn('Correction impossible, réponse initiale gardée:', e) }
      }
    }

    const msgAssistant = await prisma.messageChat.create({
      data: { userId, conversationId: conv.id, dossierId: dossierId ?? conv.dossierId ?? null, role: RoleChat.ASSISTANT, contenu: complet, sources: sources.length ? sources : undefined },
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

    res.write('data: ' + JSON.stringify({ done: true, titre: nouveauTitre, messageId: msgAssistant.id }) + '\n\n')
    res.end()
  } catch (err) {
    if (arret.signal.aborted) return // l'avocat a fermé la page
    logger.error('Erreur chat IA:', err)
    // Ce qui a déjà été écrit est gardé dans l'historique
    if (complet.trim()) {
      await prisma.messageChat.create({ data: { userId, conversationId: conv.id, dossierId: dossierId ?? conv.dossierId ?? null, role: RoleChat.ASSISTANT, contenu: complet } }).catch(() => {})
    }
    res.write('data: ' + JSON.stringify({ error: 'تعذّر إكمال الجواب. أعيدوا المحاولة بعد لحظات.' }) + '\n\n')
    res.end()
  }
})

export default router