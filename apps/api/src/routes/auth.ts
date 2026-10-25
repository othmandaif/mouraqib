import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { WhatsAppService } from '../services/whatsapp/whatsappService'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { limiter } from '../middleware/securite'
import { redisConnection } from '../jobs/queues'
import { randomBytes, randomInt } from 'crypto'
import { emailAutorise, champNom, champTelephone } from '../services/auth/comptes'
import { abonnementDe } from '../services/abonnements/rappelsAbonnement'
import { OFFRES } from '../services/abonnements/offres'
import { emailConfigure, envoyerEmail, messageCodeReinitialisation } from '../services/email/emailService'

const router = Router()
const whatsapp = new WhatsAppService()

const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  nom: champNom,
  prenom: champNom,
  telephone: champTelephone,
  invitation: z.string().optional(), // jeton reçu par un membre invité (Paramètres › الفريق)
  // Demande d'accès (inscription depuis le site) : aide le commercial à préparer l'appel
  barreau: z.string().trim().max(120).optional(),
  ville: z.string().trim().max(80).optional(),
  structure: z.enum(['SEUL', 'CABINET']).optional(),
  nbDossiers: z.enum(['MOINS_50', '50_200', '200_500', 'PLUS_500']).optional(),
  message: z.string().trim().max(1000).optional(),
})

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().max(200),
  seSouvenir: z.boolean().optional(), // « تذكّروني على هذا الجهاز » : 30 j, sinon 12 h (absent = 7 j, comportement historique)
})

// Anti-force brute : 5 échecs par e-mail → blocage 15 min
const MAX_ECHECS = 5
const cleEchecs = (email: string) => `login-echec:${email.toLowerCase()}`

router.post('/register', limiter('inscription-ip', 60, 3600), limiter('inscription', 5, 3600, (r) => r.body?.email), async (req: Request, res: Response): Promise<void> => {
  const parse = RegisterSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() })
    return
  }

  const { email, password, nom, prenom, telephone, invitation, barreau, ville, structure, nbDossiers, message } = parse.data
  // Seulement les fournisseurs d'e-mail courants (gmail, outlook…) : pas d'adresses jetables
  if (!emailAutorise(email)) { res.status(400).json({ error: 'Adresse e-mail non acceptée' }); return }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email déjà utilisé' })
    return
  }

  // Invitation valide → le nouveau compte rejoint le cabinet de l'invitant avec le rôle prévu.
  // Elle ne vaut que pour l'adresse invitée et pendant 14 jours (sinon : demande normale, validée par le commercial).
  const inv = invitation
    ? await prisma.invitation.findFirst({ where: { token: invitation, accepteeAt: null, createdAt: { gt: new Date(Date.now() - INVITATION_JOURS * 86_400_000) } }, include: { invitant: { select: { cabinetId: true } } } })
    : null
  if (inv && inv.email.toLowerCase() !== email) { res.status(400).json({ error: 'Invitation destinée à une autre adresse' }); return }
  if (inv && !inv.invitant.cabinetId) { res.status(400).json({ error: 'Invitation expirée' }); return }

  const passwordHash = await bcrypt.hash(password, 12)
  // Membre invité par un cabinet client : actif tout de suite.
  // Inscription depuis le site : DEMANDE en attente ; le commercial appelle l'avocat puis active le compte
  // (offre, période offerte) depuis le panneau admin. Pas d'abonnement avant l'activation.
  await prisma.user.create({
    data: {
      email, passwordHash, nom, prenom, telephone, barreau,
      ...(inv
        ? { cabinetId: inv.invitant.cabinetId, role: inv.role }
        : { statut: 'EN_ATTENTE' as const, demande: { ville, structure, nbDossiers, message } }),
    },
  })
  if (inv) await prisma.invitation.update({ where: { id: inv.id }, data: { accepteeAt: new Date() } })

  res.status(201).json({ message: 'Compte créé', enAttente: !inv })
})

router.post('/login', limiter('connexion-ip', 300, 900), limiter('connexion', 30, 900, (r) => r.body?.email), async (req: Request, res: Response): Promise<void> => {
  const parse = LoginSchema.safeParse(req.body)
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() })
    return
  }

  const { email, password, seSouvenir } = parse.data

  const echecs = Number(await redisConnection.get(cleEchecs(email))) || 0
  if (echecs >= MAX_ECHECS) {
    res.status(429).json({ error: 'Trop de tentatives, réessayez dans 15 minutes' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const n = await redisConnection.incr(cleEchecs(email))
    if (n === 1) await redisConnection.expire(cleEchecs(email), 900)
    res.status(401).json({ error: `Identifiants incorrects (${Math.max(0, MAX_ECHECS - n)} essais restants)` })
    return
  }
  await redisConnection.del(cleEchecs(email))
  // Vérifié APRÈS le mot de passe : on ne révèle pas l'état d'un compte à qui ne connaît pas le mot de passe
  if (user.statut === 'EN_ATTENTE') { res.status(403).json({ error: "Compte en attente d'activation", statut: user.statut }); return }
  if (user.statut === 'DESACTIVE') { res.status(403).json({ error: 'Compte désactivé', statut: user.statut }); return }

  // Vérification en deux étapes : code WhatsApp avant d'ouvrir la session
  if (user.deuxFacteurs && user.whatsappVerifie && user.whatsappNumero) {
    const ticket = randomBytes(24).toString('hex')
    const code = randomInt(100000, 1000000).toString()
    await redisConnection.set(`2fa:${ticket}`, JSON.stringify({ userId: user.id, code, essais: 0, seSouvenir }), 'EX', 600)
    const ok = await whatsapp.envoyerCodeVerification(user.whatsappNumero, code)
    if (!ok) { res.status(502).json({ error: "Échec d'envoi du code WhatsApp" }); return }
    res.json({ deuxFacteurs: true, ticket })
    return
  }

  res.json(await ouvrirSession(user, req, seSouvenir))
})

const DeuxFacteursSchema = z.object({ ticket: z.string().min(10), code: z.string().regex(/^\d{6}$/) })

router.post('/login/2fa', limiter('2fa', 10, 600, (r) => r.body?.ticket), async (req: Request, res: Response): Promise<void> => {
  const parse = DeuxFacteursSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: 'Code invalide' }); return }
  const cle = `2fa:${parse.data.ticket}`
  const brut = await redisConnection.get(cle)
  if (!brut) { res.status(400).json({ error: 'Code expiré, reconnectez-vous' }); return }
  const t = JSON.parse(brut) as { userId: string; code: string; essais: number; seSouvenir?: boolean }
  if (t.code !== parse.data.code) {
    // 5 essais maximum par ticket
    if (t.essais + 1 >= 5) await redisConnection.del(cle)
    else await redisConnection.set(cle, JSON.stringify({ ...t, essais: t.essais + 1 }), 'KEEPTTL')
    res.status(400).json({ error: 'Code invalide' })
    return
  }
  await redisConnection.del(cle)
  const user = await prisma.user.findUnique({ where: { id: t.userId } })
  if (!user) { res.status(400).json({ error: 'Compte introuvable' }); return }
  res.json(await ouvrirSession(user, req, t.seSouvenir))
})

// « نسيتم كلمة المرور؟ » : code envoyé par e-mail (Resend) et, si le numéro est vérifié, sur WhatsApp.
// Réponse identique que le compte existe ou non, pour ne pas révéler les adresses inscrites.
router.post('/mot-de-passe/oublie', limiter('oubli-ip', 60, 900), limiter('oubli', 5, 900, (r) => r.body?.email), async (req: Request, res: Response): Promise<void> => {
  const parse = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: 'Email invalide' }); return }
  // Nouvelle demande dans la minute (retour arrière, double clic) : on rend le MÊME ticket, sinon le code déjà
  // reçu ne correspondrait plus. Clé par e-mail, existant ou non, pour ne pas révéler les comptes inscrits.
  const cleAttente = `reset-wait:${parse.data.email}`
  const enCours = await redisConnection.get(cleAttente)
  if (enCours) { res.json({ ticket: enCours }); return }
  const ticket = randomBytes(24).toString('hex')
  await redisConnection.set(cleAttente, ticket, 'EX', 60)
  const user = await prisma.user.findUnique({ where: { email: parse.data.email }, select: { id: true, email: true, prenom: true, statut: true, whatsappVerifie: true, whatsappNumero: true } })
  const parWhatsapp = !!(user?.whatsappVerifie && user.whatsappNumero)
  // Demande d'inscription pas encore activée : pas de code (le compte ne peut pas encore se connecter)
  if (user && user.statut !== 'EN_ATTENTE' && (emailConfigure() || parWhatsapp)) {
    const code = randomInt(100000, 1000000).toString()
    await redisConnection.set(`reset:${ticket}`, JSON.stringify({ userId: user.id, code, essais: 0 }), 'EX', 600)
    await Promise.allSettled([
      emailConfigure() ? envoyerEmail({ to: user.email, ...messageCodeReinitialisation(user.prenom, code) }) : null,
      parWhatsapp ? whatsapp.envoyerCodeVerification(user.whatsappNumero!, code) : null,
    ])
  }
  res.json({ ticket })
})

const ReinitSchema = z.object({ ticket: z.string().min(10), code: z.string().regex(/^\d{6}$/), nouveau: z.string().min(8) })

router.post('/mot-de-passe/reinitialiser', limiter('reinit', 10, 900, (r) => r.body?.ticket), async (req: Request, res: Response): Promise<void> => {
  const parse = ReinitSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' }); return }
  const cle = `reset:${parse.data.ticket}`
  const brut = await redisConnection.get(cle)
  if (!brut) { res.status(400).json({ error: 'Code expiré' }); return }
  const t = JSON.parse(brut) as { userId: string; code: string; essais: number }
  if (t.code !== parse.data.code) {
    if (t.essais + 1 >= 5) await redisConnection.del(cle)
    else await redisConnection.set(cle, JSON.stringify({ ...t, essais: t.essais + 1 }), 'KEEPTTL')
    res.status(400).json({ error: 'Code invalide' })
    return
  }
  await redisConnection.del(cle)
  await prisma.user.update({ where: { id: t.userId }, data: { passwordHash: await bcrypt.hash(parse.data.nouveau, 12), motDePasseChangeAt: new Date(), doitChangerMdp: false } })
  await prisma.session.deleteMany({ where: { userId: t.userId } }) // toutes les sessions sont fermées
  const u = await prisma.user.findUnique({ where: { id: t.userId }, select: { email: true } })
  if (u) await redisConnection.del(cleEchecs(u.email))
  res.json({ ok: true })
})

// Compte créé par le commercial : l'avocat choisit lui-même son mot de passe (lien à usage unique, 7 jours)
const ActivationSchema = z.object({ jeton: z.string().min(20), motDePasse: z.string().min(8) })

router.get('/activer/:jeton', limiter('activation', 30, 900, (r) => r.params?.jeton), async (req: Request, res: Response): Promise<void> => {
  const userId = await redisConnection.get(`activation:${req.params.jeton}`)
  const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { prenom: true, nom: true, email: true } }) : null
  if (!user) { res.status(404).json({ error: 'Lien expiré' }); return }
  res.json(user)
})

router.post('/activer', limiter('activation', 30, 900, (r) => r.body?.jeton), async (req: Request, res: Response): Promise<void> => {
  const parse = ActivationSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' }); return }
  const cle = `activation:${parse.data.jeton}`
  const userId = await redisConnection.get(cle)
  if (!userId) { res.status(400).json({ error: 'Lien expiré' }); return }
  await redisConnection.del(cle)
  const user = await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(parse.data.motDePasse, 12), motDePasseChangeAt: new Date(), doitChangerMdp: false } })
  res.json(await ouvrirSession(user, req, true))
})

async function ouvrirSession(user: { id: string; email: string; nom: string; prenom: string; role: string; doitChangerMdp?: boolean }, req: Request, seSouvenir?: boolean) {
  const jours = seSouvenir === undefined ? 7 : seSouvenir ? 30 : 0.5
  // Se reconnecter pendant les 30 jours annule une demande de suppression
  await prisma.user.updateMany({ where: { id: user.id, suppressionDemandeeAt: { not: null } }, data: { suppressionDemandeeAt: null } })
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + jours * 86_400_000),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  })

  const token = jwt.sign(
    { userId: user.id, sessionId: session.id },
    process.env.JWT_SECRET!,
    { expiresIn: Math.round(jours * 86_400) }
  )

  return {
    token,
    user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role, doitChangerMdp: !!user.doitChangerMdp },
  }
}

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
      deuxFacteurs: true, motDePasseChangeAt: true, doitChangerMdp: true, suppressionDemandeeAt: true, createdAt: true, barreau: true,
      cabinet: { select: { id: true, nom: true } },
      // Champs choisis : la note interne du commercial ne doit pas arriver chez l'avocat
      abonnements: {
        where: { statut: 'ACTIF' as const }, take: 1,
        select: { id: true, plan: true, statut: true, maxDossiers: true, dateDebut: true, dateFin: true, estFondateur: true, essaiJusquAu: true, payeJusquAu: true },
      },
    },
  })
  res.json(user)
})

const ProfilSchema = z.object({
  barreau: z.string().trim().max(120).optional(),
  nom: champNom.optional(),
  prenom: champNom.optional(),
  telephone: champTelephone.optional(),
})

router.patch('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = ProfilSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const u = await prisma.user.update({ where: { id: req.userId! }, data: parse.data, select: { id: true, nom: true, prenom: true, telephone: true, barreau: true } })
  res.json(u)
})

const MotDePasseSchema = z.object({ actuel: z.string().min(1), nouveau: z.string().min(8) })

router.post('/mot-de-passe', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = MotDePasseSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' }); return }
  const user = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!user || !(await bcrypt.compare(parse.data.actuel, user.passwordHash))) { res.status(400).json({ error: 'Mot de passe actuel incorrect' }); return }
  if (parse.data.nouveau === parse.data.actuel) { res.status(400).json({ error: user.doitChangerMdp ? 'Choisissez un mot de passe différent du mot de passe provisoire' : 'Choisissez un mot de passe différent de l\'actuel' }); return }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parse.data.nouveau, 12), motDePasseChangeAt: new Date(), doitChangerMdp: false } })
  // Les autres appareils sont déconnectés
  await prisma.session.deleteMany({ where: { userId: user.id, NOT: { id: req.sessionId } } })
  res.json({ ok: true })
})

router.get('/sessions', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.userId!, expiresAt: { gt: new Date() } },
    select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(sessions.map((s) => ({ ...s, actuelle: s.id === req.sessionId })))
})

router.delete('/sessions/autres', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await prisma.session.deleteMany({ where: { userId: req.userId!, NOT: { id: req.sessionId } } })
  res.json({ ok: true, fermees: r.count })
})

router.patch('/deux-facteurs', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const actif = req.body?.actif === true
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { whatsappVerifie: true } })
  if (actif && !user?.whatsappVerifie) { res.status(400).json({ error: "Confirmez d'abord votre numéro WhatsApp" }); return }
  await prisma.user.update({ where: { id: req.userId! }, data: { deuxFacteurs: actif } })
  res.json({ ok: true, deuxFacteurs: actif })
})

// Paramètres › تصدير بياناتي : tout ce que l'avocat a saisi ou que nous avons calculé
router.get('/export', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const [user, dossiers, documents, conversations] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.userId! }, select: { email: true, nom: true, prenom: true, telephone: true, whatsappNumero: true, createdAt: true, preferences: true } }),
    prisma.dossier.findMany({ where: { userId: req.userId! }, include: { evenements: true, echeances: true } }),
    prisma.document.findMany({ where: { userId: req.userId! } }),
    prisma.conversation.findMany({ where: { userId: req.userId! }, include: { messages: { select: { role: true, contenu: true, createdAt: true } } } }),
  ])
  res.setHeader('Content-Disposition', `attachment; filename="malafipro-export-${new Date().toISOString().slice(0, 10)}.json"`)
  res.json({ exporteLe: new Date(), compte: user, dossiers, documents, conversations })
})

// Paramètres › حذف الحساب : suppression définitive 30 jours plus tard (purge dans le job des délais)
router.post('/suppression', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.user.update({ where: { id: req.userId! }, data: { suppressionDemandeeAt: new Date() } })
  await prisma.session.deleteMany({ where: { userId: req.userId! } })
  res.json({ ok: true })
})

router.delete('/suppression', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.user.update({ where: { id: req.userId! }, data: { suppressionDemandeeAt: null } })
  res.json({ ok: true })
})

/* ─── Équipe ─────────────────────────────────────────────────────────────── */

router.get('/equipe', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { cabinetId: true, role: true } })
  const membres = me?.cabinetId
    ? await prisma.user.findMany({ where: { cabinetId: me.cabinetId }, select: { id: true, nom: true, prenom: true, email: true, role: true }, orderBy: { createdAt: 'asc' } })
    : await prisma.user.findMany({ where: { id: req.userId! }, select: { id: true, nom: true, prenom: true, email: true, role: true } })
  const invitations = await prisma.invitation.findMany({
    where: { accepteeAt: null, createdAt: { gt: new Date(Date.now() - INVITATION_JOURS * 86_400_000) }, invitant: me?.cabinetId ? { cabinetId: me.cabinetId } : { id: req.userId! } },
    select: { id: true, email: true, role: true, token: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  const places = await placesCabinet(req.userId!, me?.cabinetId ?? null)
  // Seul le responsable (ou l'avocat seul, avant la création du cabinet) gère les invitations
  const gestionnaire = !me?.cabinetId || me.role === 'ASSOCIE_GERANT'
  res.json({ membres, invitations: gestionnaire ? invitations : [], places, peutInviter: gestionnaire && !!places && (places.max < 0 || places.utilisees < places.max) })
})

const INVITATION_JOURS = 14

/** Places du cabinet : membres + invitations encore valables. `null` = l'offre ne permet pas d'inviter. */
async function placesCabinet(userId: string, cabinetId: string | null) {
  const a = await abonnementDe(userId)
  if (!a || (a.plan !== 'CABINET' && a.plan !== 'SUR_MESURE')) return null
  const max = OFFRES[a.plan].utilisateurs
  const depuis = new Date(Date.now() - INVITATION_JOURS * 86_400_000)
  const [membres, enAttente] = cabinetId
    ? await Promise.all([
        prisma.user.count({ where: { cabinetId } }),
        prisma.invitation.count({ where: { accepteeAt: null, createdAt: { gt: depuis }, invitant: { cabinetId } } }),
      ])
    : [1, 0]
  return { max, utilisees: membres + enAttente }
}

const InvitationSchema = z.object({ email: z.string().trim().toLowerCase().email(), role: z.enum(['AVOCAT', 'SECRETAIRE']) })

router.post('/equipe/invitations', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = InvitationSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { id: true, nom: true, cabinetId: true, role: true } })
  if (!me) { res.status(404).json({ error: 'Compte introuvable' }); return }
  // Dans un cabinet, seul le responsable invite (une secrétaire ne doit pas pouvoir ajouter des membres)
  if (me.cabinetId && me.role !== 'ASSOCIE_GERANT') { res.status(403).json({ error: 'Réservé au responsable du cabinet' }); return }
  // Vente directe : inviter = utilisateurs supplémentaires, réservé aux offres « مكتب » et dans leur limite
  const places = await placesCabinet(me.id, me.cabinetId)
  if (!places) { res.status(403).json({ error: 'Offre cabinet requise pour inviter' }); return }
  if (places.max >= 0 && places.utilisees >= places.max) { res.status(403).json({ error: "Limite d'utilisateurs atteinte" }); return }
  if (await prisma.user.findUnique({ where: { email: parse.data.email }, select: { id: true } })) { res.status(409).json({ error: 'Email déjà utilisé' }); return }
  // Première invitation : le cabinet est créé, l'invitant en devient le responsable.
  if (!me.cabinetId) {
    const cab = await prisma.cabinet.create({ data: { nom: `مكتب ذ. ${me.nom}` } })
    await prisma.user.update({ where: { id: me.id }, data: { cabinetId: cab.id, role: 'ASSOCIE_GERANT' } })
  }
  const inv = await prisma.invitation.create({
    data: { email: parse.data.email, role: parse.data.role, token: randomBytes(24).toString('hex'), invitantId: me.id },
    select: { id: true, email: true, role: true, token: true, createdAt: true },
  })
  res.status(201).json(inv)
})

router.delete('/equipe/invitations/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await prisma.invitation.deleteMany({ where: { id: req.params.id, invitantId: req.userId!, accepteeAt: null } })
  res.json({ ok: true, supprimees: r.count })
})

router.patch('/equipe/membres/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const role = req.body?.role
  if (role !== 'AVOCAT' && role !== 'SECRETAIRE') { res.status(400).json({ error: 'Rôle invalide' }); return }
  const me = await prisma.user.findUnique({ where: { id: req.userId! }, select: { cabinetId: true, role: true } })
  if (!me?.cabinetId || me.role !== 'ASSOCIE_GERANT') { res.status(403).json({ error: 'Réservé au responsable du cabinet' }); return }
  const r = await prisma.user.updateMany({ where: { id: req.params.id, cabinetId: me.cabinetId, NOT: { id: req.userId! } }, data: { role } })
  res.json({ ok: true, maj: r.count })
})

const TelephoneSchema = z.object({ telephone: z.string().regex(/^\+?[\d\s]{9,16}$/) })

/** Cause lisible d'un refus Meta : la plupart ne viennent pas du numéro saisi mais de la configuration. */
function raisonEchecWhatsapp(code: number | null): string {
  switch (code) {
    case -1: return "Échec d'envoi WhatsApp : service non configuré"
    case 190: return "Échec d'envoi WhatsApp : jeton Meta expiré"
    case 131030: return "Échec d'envoi WhatsApp : numéro non autorisé (compte Meta en mode test)"
    case 131047: case 131026: return "Échec d'envoi WhatsApp : modèle de message requis"
    case 132001: return "Échec d'envoi WhatsApp : modèle introuvable"
    case 100: return "Échec d'envoi WhatsApp : paramètres refusés par Meta"
    default: return "Échec d'envoi WhatsApp"
  }
}

router.post('/whatsapp/envoyer-code', requireAuth, limiter('wa-code', 6, 3600), async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = TelephoneSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: 'Numéro requis' }); return }
  const telephone = parse.data.telephone.replace(/\s/g, '')

  // Renvoi limité : un code par minute
  if (await redisConnection.get(`wa-otp-wait:${req.userId}`)) {
    res.status(429).json({ error: 'Patientez une minute avant de renvoyer le code' })
    return
  }
  const code = randomInt(100000, 1000000).toString()

  const ok = await whatsapp.envoyerCodeVerification(telephone, code)
  if (!ok) {
    res.status(502).json({ error: raisonEchecWhatsapp(whatsapp.derniereErreur), codeMeta: whatsapp.derniereErreur })
    return
  }

  // Le numéro reste EN ATTENTE avec le code : il ne remplace l'actuel qu'une fois confirmé.
  // (Avant : écrit tout de suite, alors que « vérifié » restait vrai → alertes vers un numéro non confirmé.)
  await redisConnection.set(`wa-otp:${req.userId}`, JSON.stringify({ code, essais: 0, numero: telephone }), 'EX', 600)
  await redisConnection.set(`wa-otp-wait:${req.userId}`, '1', 'EX', 60)

  res.json({ message: 'Code envoyé', renvoiDans: 60 })
})

router.post('/whatsapp/verifier-code', requireAuth, limiter('wa-verif', 15, 3600), async (req: AuthRequest, res: Response): Promise<void> => {
  const code = String(req.body?.code ?? '')
  if (!/^\d{6}$/.test(code)) {
    res.status(400).json({ error: 'Code requis' })
    return
  }

  const cle = `wa-otp:${req.userId}`
  const brut = await redisConnection.get(cle)
  if (!brut) {
    res.status(400).json({ error: 'Code expiré' })
    return
  }
  const otp = JSON.parse(brut) as { code: string; essais: number; numero?: string }
  if (otp.code !== code) {
    if (otp.essais + 1 >= 5) await redisConnection.del(cle)
    else await redisConnection.set(cle, JSON.stringify({ ...otp, essais: otp.essais + 1 }), 'KEEPTTL')
    res.status(400).json({ error: 'Code invalide' })
    return
  }
  await redisConnection.del(cle)

  await prisma.user.update({
    where: { id: req.userId! },
    data: { whatsappVerifie: true, ...(otp.numero ? { whatsappNumero: otp.numero } : {}) },
  })

  res.json({ message: 'WhatsApp vérifié' })
})

export default router
