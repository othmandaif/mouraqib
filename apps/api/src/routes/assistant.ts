import { Router, Response } from 'express'
import { z } from 'zod'
import { RoleChat } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { limiter } from '../middleware/securite'
import { analyserDossierComplet } from '../services/ai/dossierAnalyse'
import { streamDeepseek, ChatMessage, askDeepseek } from '../services/ai/deepseek'
import { PROMPT_CHAT_SYSTEME, CONSIGNE_FR_CHAT } from '../services/ai/prompts.ar'
import { construireContextePortefeuille } from '../services/ai/portefeuilleContext'
import { logger } from '../utils/logger'
import { rechercherArticles, formaterArticles, besoinDeDroit } from '../services/ai/ragJuridique'
import { verifierReponse, consigneCorrection } from '../services/ai/guardrailJuridique'
import { lireMemoire, blocMemoire, apprendre, limiter as limiterMemoire, texteValide } from '../services/ai/memoire'
import { TypeMemoire } from '@prisma/client'

const router = Router()

/** L'article (ex. « 254 », « الفصل 254 ») figure-t-il dans la réponse ? Chiffres arabes ou latins, nombre entier seulement. */
function estCite(article: string | null, reponse: string): boolean {
  const n = (article ?? '').replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).match(/\d+(?:[.-]\d+)*/)?.[0]
  if (!n) return false
  const texte = reponse.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
  return new RegExp(`(^|[^\\d.])${n.replace(/\./g, '\\.')}(?![\\d])`).test(texte)
}

/** Langue du compte (Paramètres) : les réponses de l'IA la suivent.
 *  Jamais bloquant : si la lecture échoue (ex. migration « langue » pas encore appliquée), on répond en arabe
 *  au lieu de laisser la requête sans réponse (l'écran restait sur « أفكّر… »). */
const langueDe = async (userId: string): Promise<'ar' | 'fr'> => {
  try {
    return (await prisma.user.findUnique({ where: { id: userId }, select: { langue: true } }))?.langue === 'fr' ? 'fr' : 'ar'
  } catch (e) {
    logger.warn('Langue du compte illisible (migration appliquée ?), arabe par défaut:', e)
    return 'ar'
  }
}

/* Brique 4 — Analyse complète d'un dossier */
router.post('/dossiers/:id/analyser', requireAuth, limiter('ia-analyse', 20, 3600), async (req: AuthRequest, res: Response): Promise<void> => {
  const force = req.body?.force === true
  try {
    const analyse = await analyserDossierComplet(req.params.id, { in: req.equipe! }, force, await langueDe(req.userId!))
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
  // Lectures indépendantes en parallèle : on gagne du temps avant le premier mot
  const [langue, dossierOk, convExistante, souvenirs] = await Promise.all([
    langueDe(userId),
    // Le dossier doit appartenir à l'avocat (sinon il est ignoré)
    parse.data.dossierId ? prisma.dossier.findFirst({ where: { id: parse.data.dossierId, userId: { in: req.equipe! } }, select: { id: true } }) : null,
    conversationId ? prisma.conversation.findFirst({ where: { id: conversationId, userId } }) : null,
    lireMemoire(userId), // mémoire de l'avocat : comment lui répondre
  ])
  const dossierId = dossierOk ? parse.data.dossierId : undefined

  let conv = convExistante
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { userId, dossierId: dossierId ?? null, titre: 'محادثة جديدة' },
    })
    conversationId = conv.id
  }

  // Contexte du portefeuille : lancé maintenant, attendu seulement juste avant la génération (en parallèle de la recherche juridique)
  const contexteP = construireContextePortefeuille({ in: req.equipe! }, message, dossierId ?? conv.dossierId ?? undefined)
    .catch((e) => { logger.warn('Contexte portefeuille ignoré:', e); return '' })

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
  // no-transform : ni Next (compress) ni un proxy ne compressent ce flux, sinon il arrive en un seul bloc à la fin
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('X-Accel-Buffering', 'no')
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

  const contexte = await contexteP
  const systeme =
    PROMPT_CHAT_SYSTEME +
    `\n\nتاريخ اليوم: ${new Date().toLocaleDateString('ar-MA', { timeZone: 'Africa/Casablanca', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. احسب الآجال انطلاقاً منه عند الحاجة، ونبّه إلى أن التاريخ المعتمد هو تاريخ التبليغ الفعلي.` +
    '\n\n=== معطيات محفظة المحامي ===\n' + contexte +
    blocDroit +
    '\n\n=== تعليمة أخيرة ===\n' +
    'قبل أن تكتب جوابك، فكّر داخلياً خطوة بخطوة: حدّد الإشكال، افحص كل مصدر متاح وما يثبته، ' +
    'اربط المواد، استنتج النتائج، ثم ابنِ جواباً موثّقاً ودقيقاً. لا تُظهر خطوات تفكيرك الخام؛ ' +
    'أظهر فقط الجواب النهائي المنظّم والموثّق بالمصادر. كن مفيداً دائماً ولا ترفض السؤال.' +
    blocMemoire(souvenirs) +
    (langue === 'fr' ? CONSIGNE_FR_CHAT : '')

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

    // Après la réponse, en parallèle de la relecture : titre de la conversation et apprentissage de la mémoire
    const precedente = [...historique].reverse().find((h) => h.role === RoleChat.ASSISTANT)?.contenu ?? ''
    const titreP: Promise<string | undefined> = estPremierMessage
      ? askDeepseek<string>(
          langue === 'fr'
            ? 'Crée un titre très court (3 à 5 mots) en français qui résume le sujet de cette question. Renvoie seulement le titre, sans guillemets.'
            : 'أنشئ عنواناً قصيراً جداً (3-5 كلمات) بالعربية يلخّص موضوع هذا السؤال. أرجِع العنوان فقط دون علامات.',
          message,
          { json: false, temperature: 0.2, maxTokens: 30, timeoutMs: 8_000, tentatives: 1 },
        ).then((t) => (t || '').replace(/["\u00ab\u00bb\n]/g, '').trim().slice(0, 60) || undefined).catch(() => undefined)
      : Promise.resolve(undefined)
    const memoireP = apprendre(userId, message, precedente)

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

    // Cartes « sources » : seulement les articles réellement cités dans la réponse (les autres étaient seulement
    // candidats de la recherche, d'où des liens sans rapport). Aucun cité reconnu → on garde la liste d'origine.
    const citees = sources.filter((s) => estCite(s.article, complet))
    if (citees.length && citees.length < sources.length) {
      sources = citees
      res.write('data: ' + JSON.stringify({ sourcesCitees: citees }) + '\n\n')
    }

    const msgAssistant = await prisma.messageChat.create({
      data: { userId, conversationId: conv.id, dossierId: dossierId ?? conv.dossierId ?? null, role: RoleChat.ASSISTANT, contenu: complet, sources: sources.length ? sources : undefined },
    })

    const [nouveauTitre, appris] = await Promise.all([titreP, memoireP])
    // « سأتذكّر … · تراجع » à l'écran
    if (appris.length) res.write('data: ' + JSON.stringify({ memoire: appris }) + '\n\n')

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

/* Mémoire de l'avocat (Paramètres › ذاكرة المساعد) : lecture, ajout, modification, suppression, pause */
router.get('/memoire', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const [u, souvenirs] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.userId! }, select: { memoireActive: true } }),
    prisma.memoireAvocat.findMany({ where: { userId: req.userId! }, select: { id: true, type: true, texte: true, source: true, actif: true, updatedAt: true }, orderBy: [{ actif: 'desc' }, { updatedAt: 'desc' }], take: 200 }),
  ])
  res.json({ active: u?.memoireActive ?? true, souvenirs })
})

const SouvenirSchema = z.object({ type: z.nativeEnum(TypeMemoire).default(TypeMemoire.PREFERENCE), texte: z.string().min(1).max(300) })
router.post('/memoire', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = SouvenirSchema.safeParse(req.body)
  const texte = parse.success ? texteValide(parse.data.texte) : null
  if (!parse.success || !texte) { res.status(400).json({ error: 'Souvenir invalide : une règle courte, sans nom, numéro de dossier ni montant' }); return }
  const s = await prisma.memoireAvocat.create({ data: { userId: req.userId!, type: parse.data.type, texte, source: 'manuel' }, select: { id: true, type: true, texte: true, source: true, actif: true, updatedAt: true } })
  await limiterMemoire(req.userId!)
  res.status(201).json(s)
})

const MajSouvenirSchema = z.object({ texte: z.string().min(1).max(300).optional(), type: z.nativeEnum(TypeMemoire).optional(), actif: z.boolean().optional() })
router.patch('/memoire/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = MajSouvenirSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const texte = parse.data.texte !== undefined ? texteValide(parse.data.texte) : undefined
  if (texte === null) { res.status(400).json({ error: 'Souvenir invalide : une règle courte, sans nom, numéro de dossier ni montant' }); return }
  const r = await prisma.memoireAvocat.updateMany({ where: { id: req.params.id, userId: req.userId! }, data: { ...parse.data, ...(texte ? { texte } : {}) } })
  if (!r.count) { res.status(404).json({ error: 'Souvenir introuvable' }); return }
  if (parse.data.actif) await limiterMemoire(req.userId!)
  res.json({ ok: true })
})

router.delete('/memoire/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await prisma.memoireAvocat.deleteMany({ where: { id: req.params.id, userId: req.userId! } })
  if (!r.count) { res.status(404).json({ error: 'Souvenir introuvable' }); return }
  res.json({ ok: true })
})

router.delete('/memoire', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await prisma.memoireAvocat.deleteMany({ where: { userId: req.userId! } })
  res.json({ ok: true, supprimes: r.count })
})

router.patch('/memoire-reglage', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (typeof req.body?.active !== 'boolean') { res.status(400).json({ error: 'Valeur invalide' }); return }
  await prisma.user.update({ where: { id: req.userId! }, data: { memoireActive: req.body.active } })
  res.json({ ok: true, active: req.body.active })
})

export default router