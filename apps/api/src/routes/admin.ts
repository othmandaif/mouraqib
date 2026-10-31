import { Router, Response } from 'express'
import { prisma } from '../utils/prisma'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth'
import { NLPService } from '../services/nlp/nlpService'
import { scraperQueue, nlpQueue, alertQueue, deadlineQueue, redisConnection } from '../jobs/queues'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { ESSAI_FONDATEUR_MOIS, etatAbonnement, prolonger, finCouverture } from '../services/abonnements/offres'
import { controleSecurite } from '../services/deadlines/controleSecurite'
import { motDePasseProvisoire, champNom, champTelephone, emailAutorise } from '../services/auth/comptes'

const router = Router()
const nlpService = new NLPService()

router.use(requireAuth, requireRole('ADMIN'))

// Statistiques globales
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  const [users, dossiers, evenements, echeances, alertes] = await Promise.all([
    prisma.user.count(),
    prisma.dossier.count({ where: { estActif: true } }),
    prisma.evenement.count(),
    prisma.echeance.count({ where: { estComplete: false, estExpire: false } }),
    prisma.alerte.count({ where: { statut: 'EN_ATTENTE' } }),
  ])

  const nlpStats = await nlpService.getStats()

  res.json({ users, dossiers, evenements, echeances, alertesPending: alertes, nlpStats })
})

// Liste des utilisateurs
router.get('/users', async (_req: AuthRequest, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, nom: true, prenom: true, role: true,
      whatsappVerifie: true, createdAt: true,
      abonnements: { where: { statut: 'ACTIF' }, select: { plan: true }, take: 1 },
      _count: { select: { dossiers: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)
})

// Forcer une vérification de tous les dossiers non vus depuis 6 h
router.post('/scrape', async (_req: AuthRequest, res: Response): Promise<void> => {
  await scraperQueue.add('planifier', { force: true })
  res.json({ message: 'Planification lancée' })
})

// Forcer NLP
router.post('/nlp', async (_req: AuthRequest, res: Response): Promise<void> => {
  await nlpQueue.add('process-pending', {})
  res.json({ message: 'NLP lancé' })
})

// Statut des queues
router.get('/queues', async (_req: AuthRequest, res: Response): Promise<void> => {
  const [scraperCounts, nlpCounts, alertCounts, deadlineCounts] = await Promise.all([
    scraperQueue.getJobCounts(),
    nlpQueue.getJobCounts(),
    alertQueue.getJobCounts(),
    deadlineQueue.getJobCounts(),
  ])

  res.json({
    scraper: scraperCounts,
    nlp: nlpCounts,
    alerts: alertCounts,
    deadlines: deadlineCounts,
  })
})

// Changer le plan d'un utilisateur (test/support)
router.post('/users/:id/plan', async (req: AuthRequest, res: Response): Promise<void> => {
  const { plan, maxDossiers } = req.body

  await prisma.abonnement.updateMany({
    where: { userId: req.params.id, statut: 'ACTIF' },
    data: { statut: 'ANNULE' },
  })

  await prisma.abonnement.create({
    data: {
      userId: req.params.id,
      plan,
      statut: 'ACTIF',
      maxDossiers: maxDossiers ?? -1,
      dateDebut: new Date(),
      dateFin: new Date(Date.now() + 365 * 86_400_000),
    },
  })

  res.json({ message: `Plan ${plan} activé pour ${req.params.id}` })
})

// ─── Espace commercial ─────────────────────────────────────────────────────────

const PLANS = ['SOLO', 'CABINET', 'SUR_MESURE'] as const

async function lienActivation(userId: string): Promise<string> {
  const jeton = randomBytes(24).toString('hex')
  await redisConnection.set(`activation:${jeton}`, userId, 'EX', 7 * 86_400)
  return `${process.env.WEB_URL ?? ''}/activer?jeton=${jeton}`
}

// Santé de la chaîne des délais (workers, synchronisation, alertes, avocats à appeler)
router.get('/sante', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json(await controleSecurite(false))
})

router.get('/comptes', async (_req: AuthRequest, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' } },
    select: {
      id: true, email: true, nom: true, prenom: true, telephone: true, barreau: true, role: true, whatsappVerifie: true, createdAt: true, cabinetId: true,
      statut: true, demande: true, activeAt: true, desactiveAt: true, motifDesactivation: true, doitChangerMdp: true,
      cabinet: { select: { nom: true } },
      abonnements: { where: { statut: 'ACTIF' }, orderBy: { dateDebut: 'desc' }, take: 1 },
      sessions: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      _count: { select: { dossiers: { where: { estActif: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
  // Dossiers comptés pour la limite : ceux du compte, ou de tout son cabinet (la limite est celle du cabinet)
  const parCabinet = new Map<string, number>()
  for (const u of users) if (u.cabinetId) parCabinet.set(u.cabinetId, (parCabinet.get(u.cabinetId) ?? 0) + u._count.dossiers)
  res.json(users.map(({ abonnements, sessions, _count, cabinetId, ...u }) => {
    const a = abonnements[0]
    return {
      ...u,
      dossiers: _count.dossiers, // dossiers suivis par CET avocat
      dossiersCabinet: cabinetId ? parCabinet.get(cabinetId) ?? 0 : null, // total du cabinet (la limite s'y applique)
      derniereConnexion: sessions[0]?.createdAt ?? null,
      abonnement: a ? {
        id: a.id, plan: a.plan, estFondateur: a.estFondateur, prixMensuel: a.prixMensuel, note: a.note,
        maxDossiers: a.maxDossiers >= 0 ? a.maxDossiers : null,
        essaiJusquAu: a.essaiJusquAu, payeJusquAu: a.payeJusquAu, ...etatAbonnement(a),
      } : null,
    }
  }))
})

/** Limite de dossiers choisie par l'administrateur : null ou absent = illimité (-1 en base). */
const champLimite = z.number().int().min(1).max(1_000_000).nullable().optional()
const versLimite = (v: number | null | undefined) => (v == null ? -1 : v)

const CompteSchema = z.object({
  prenom: champNom, nom: champNom, email: z.string().trim().toLowerCase().email(),
  telephone: champTelephone, barreau: z.string().trim().max(120).optional(),
  plan: z.enum(PLANS), estFondateur: z.boolean().default(false),
  prixMensuel: z.number().min(0).nullable().optional(),
  essaiMois: z.number().int().min(0).max(12).optional(),
  note: z.string().max(1000).optional(),
  maxDossiers: champLimite,
})

// Création d'un compte par le commercial → lien d'activation à envoyer à l'avocat (WhatsApp, e-mail…)
router.post('/comptes', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = CompteSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const d = parse.data
  if (!emailAutorise(d.email)) { res.status(400).json({ error: 'Adresse e-mail non acceptée' }); return }
  if (await prisma.user.findUnique({ where: { email: d.email } })) { res.status(409).json({ error: 'Email déjà utilisé' }); return }
  // prolonger() s'arrête au dernier jour du mois (31 janvier + 1 mois = 28/29 février, pas le 3 mars)
  const essai = prolonger(null, d.essaiMois ?? (d.estFondateur ? ESSAI_FONDATEUR_MOIS : 1))
  const provisoire = motDePasseProvisoire()
  const user = await prisma.user.create({
    data: {
      prenom: d.prenom, nom: d.nom, email: d.email, telephone: d.telephone, barreau: d.barreau,
      role: d.plan === 'SOLO' ? 'AVOCAT' : 'ASSOCIE_GERANT', statut: 'ACTIF', activeAt: new Date(),
      // Mot de passe provisoire (à changer à la 1re connexion) ; le lien d'activation reste une alternative
      passwordHash: await bcrypt.hash(provisoire, 12), doitChangerMdp: true,
      ...(d.plan !== 'SOLO' ? { cabinet: { create: { nom: `مكتب ذ. ${d.prenom} ${d.nom}` } } } : {}),
    },
  })
  await prisma.abonnement.create({
    data: {
      userId: user.id, plan: d.plan, statut: 'ACTIF', maxDossiers: versLimite(d.maxDossiers),
      estFondateur: d.estFondateur, prixMensuel: d.prixMensuel ?? null, essaiJusquAu: essai, dateFin: essai, note: d.note,
    },
  })
  res.status(201).json({ id: user.id, lienActivation: await lienActivation(user.id), motDePasseProvisoire: provisoire })
})

router.post('/comptes/:id/lien-activation', async (req: AuthRequest, res: Response): Promise<void> => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } })
  if (!u) { res.status(404).json({ error: 'Compte introuvable' }); return }
  res.json({ lienActivation: await lienActivation(u.id) })
})

const OffreSchema = z.object({
  plan: z.enum(PLANS).optional(), estFondateur: z.boolean().optional(),
  prixMensuel: z.number().min(0).nullable().optional(),
  essaiJusquAu: z.string().datetime().nullable().optional(), payeJusquAu: z.string().datetime().nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
  maxDossiers: champLimite,
})

router.patch('/comptes/:id/abonnement', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = OffreSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const d = parse.data
  const a = await prisma.abonnement.findFirst({ where: { userId: req.params.id, statut: 'ACTIF' }, orderBy: { dateDebut: 'desc' } })
  const data = {
    // Changer d'offre ne touche plus à la limite : elle se règle à part (champ « حد الملفات »)
    ...(d.plan ? { plan: d.plan } : {}),
    ...(d.maxDossiers !== undefined ? { maxDossiers: versLimite(d.maxDossiers) } : {}),
    ...(d.estFondateur !== undefined ? { estFondateur: d.estFondateur } : {}),
    ...(d.prixMensuel !== undefined ? { prixMensuel: d.prixMensuel } : {}),
    ...(d.essaiJusquAu !== undefined ? { essaiJusquAu: d.essaiJusquAu ? new Date(d.essaiJusquAu) : null } : {}),
    ...(d.payeJusquAu !== undefined ? { payeJusquAu: d.payeJusquAu ? new Date(d.payeJusquAu) : null } : {}),
    ...(d.note !== undefined ? { note: d.note } : {}),
  }
  const r = a
    ? await prisma.abonnement.update({ where: { id: a.id }, data })
    : await prisma.abonnement.create({ data: { userId: req.params.id, plan: d.plan ?? 'SOLO', maxDossiers: versLimite(d.maxDossiers), statut: 'ACTIF', ...data } })
  await prisma.abonnement.update({ where: { id: r.id }, data: { dateFin: finCouverture(r) } })
  res.json({ ok: true })
})

const PaiementSchema = z.object({
  montant: z.number().positive(), mois: z.number().int().min(1).max(36),
  methode: z.enum(['VIREMENT', 'CHEQUE', 'ESPECES']), reference: z.string().max(120).optional(),
})

// Paiement reçu (virement, chèque…) : enregistré et la couverture est prolongée
router.post('/comptes/:id/paiements', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = PaiementSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const a = await prisma.abonnement.findFirst({ where: { userId: req.params.id, statut: 'ACTIF' }, orderBy: { dateDebut: 'desc' } })
  if (!a) { res.status(404).json({ error: 'Aucun abonnement actif' }); return }
  const payeJusquAu = prolonger(a.payeJusquAu, parse.data.mois)
  await prisma.$transaction([
    prisma.paiement.create({ data: { abonnementId: a.id, montant: parse.data.montant, methode: parse.data.methode, referenceExterne: parse.data.reference, statut: 'REUSSI' } }),
    prisma.abonnement.update({ where: { id: a.id }, data: { payeJusquAu, dateFin: finCouverture({ ...a, payeJusquAu }) } }),
  ])
  res.json({ ok: true, payeJusquAu })
})

router.get('/comptes/:id/paiements', async (req: AuthRequest, res: Response): Promise<void> => {
  const paiements = await prisma.paiement.findMany({ where: { abonnement: { userId: req.params.id } }, orderBy: { createdAt: 'desc' }, take: 50 })
  res.json(paiements)
})

// ─── Demandes d'inscription et état des comptes ───────────────────────────────

const ActivationSchema = z.object({
  plan: z.enum(PLANS), estFondateur: z.boolean().default(false),
  prixMensuel: z.number().min(0).nullable().optional(),
  essaiMois: z.number().int().min(0).max(12).default(1),
  note: z.string().max(1000).optional(),
  maxDossiers: champLimite,
})

// Demande traitée (après l'appel) : le compte s'ouvre avec l'offre choisie ; l'avocat se connecte avec son mot de passe
router.post('/comptes/:id/activer', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = ActivationSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const d = parse.data
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, statut: true, prenom: true, nom: true, cabinetId: true, role: true } })
  if (!u || u.role === 'ADMIN') { res.status(404).json({ error: 'Compte introuvable' }); return }
  if (u.statut !== 'EN_ATTENTE') { res.status(409).json({ error: 'Compte déjà traité' }); return }
  const essai = prolonger(null, d.essaiMois)
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: u.id },
      data: {
        statut: 'ACTIF', activeAt: new Date(),
        ...(d.plan !== 'SOLO' && !u.cabinetId ? { role: 'ASSOCIE_GERANT', cabinet: { create: { nom: `مكتب ذ. ${u.prenom} ${u.nom}` } } } : {}),
      },
    })
    await tx.abonnement.updateMany({ where: { userId: u.id, statut: 'ACTIF' }, data: { statut: 'ANNULE' } })
    await tx.abonnement.create({
      data: {
        userId: u.id, plan: d.plan, statut: 'ACTIF', maxDossiers: versLimite(d.maxDossiers),
        estFondateur: d.estFondateur, prixMensuel: d.prixMensuel ?? null, essaiJusquAu: essai, dateFin: essai, note: d.note,
      },
    })
  })
  res.json({ ok: true })
})

// Demande refusée (doublon, pas avocat…) : supprimée, on ne garde pas de données inutiles
router.delete('/demandes/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await prisma.user.deleteMany({ where: { id: req.params.id, statut: 'EN_ATTENTE', dossiers: { none: {} } } })
  if (!r.count) { res.status(404).json({ error: 'Demande introuvable' }); return }
  res.json({ ok: true })
})

const DesactivationSchema = z.object({ motif: z.string().trim().max(300).optional() })

// Accès coupé immédiatement (sessions fermées) ; plus de synchronisation ni d'alertes. Les données sont gardées.
router.post('/comptes/:id/desactiver', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = DesactivationSchema.safeParse(req.body ?? {})
  if (!parse.success) { res.status(400).json({ error: 'Motif invalide' }); return }
  const r = await prisma.user.updateMany({
    where: { id: req.params.id, role: { not: 'ADMIN' }, statut: 'ACTIF' },
    data: { statut: 'DESACTIVE', desactiveAt: new Date(), motifDesactivation: parse.data.motif ?? null },
  })
  if (!r.count) { res.status(404).json({ error: 'Compte introuvable' }); return }
  await prisma.session.deleteMany({ where: { userId: req.params.id } })
  res.json({ ok: true })
})

router.post('/comptes/:id/reactiver', async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await prisma.user.updateMany({
    where: { id: req.params.id, statut: 'DESACTIVE' },
    data: { statut: 'ACTIF', desactiveAt: null, motifDesactivation: null },
  })
  if (!r.count) { res.status(404).json({ error: 'Compte introuvable' }); return }
  res.json({ ok: true })
})

// ─── Comptabilité : recettes (paiements enregistrés) et dépenses du service ─────

const CATEGORIES = ['HEBERGEMENT', 'WHATSAPP', 'IA', 'DOMAINE', 'MARKETING', 'LOGICIEL', 'AUTRE'] as const
const DepenseSchema = z.object({
  // « 2026-02-31 » passait la regex puis devenait le 3 mars : on vérifie que la date existe vraiment
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v, 'Date invalide'),
  categorie: z.enum(CATEGORIES),
  libelle: z.string().trim().min(2).max(200),
  montant: z.number().positive().max(10_000_000),
  recurrente: z.boolean().default(false),
  note: z.string().trim().max(500).optional(),
})
const anneeDe = (q: unknown) => { const a = Number.parseInt(String(q ?? new Date().getFullYear()), 10); return a >= 2020 && a <= 2100 ? a : new Date().getFullYear() }

router.get('/depenses', async (req: AuthRequest, res: Response): Promise<void> => {
  const a = anneeDe(req.query.annee)
  res.json(await prisma.depense.findMany({ where: { date: { gte: new Date(Date.UTC(a, 0, 1)), lt: new Date(Date.UTC(a + 1, 0, 1)) } }, orderBy: { date: 'desc' } }))
})

router.post('/depenses', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = DepenseSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const d = parse.data
  res.status(201).json(await prisma.depense.create({ data: { ...d, date: new Date(`${d.date}T12:00:00Z`) } }))
})

router.delete('/depenses/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await prisma.depense.deleteMany({ where: { id: req.params.id } })
  if (!r.count) { res.status(404).json({ error: 'Dépense introuvable' }); return }
  res.json({ ok: true })
})

// Synthèse annuelle mois par mois : recettes, dépenses (par catégorie), résultat
router.get('/compta', async (req: AuthRequest, res: Response): Promise<void> => {
  const a = anneeDe(req.query.annee)
  const periode = { gte: new Date(Date.UTC(a, 0, 1)), lt: new Date(Date.UTC(a + 1, 0, 1)) }
  const [paiements, depenses] = await Promise.all([
    prisma.paiement.findMany({
      where: { statut: 'REUSSI', createdAt: periode },
      select: { id: true, montant: true, methode: true, referenceExterne: true, createdAt: true, abonnement: { select: { plan: true, user: { select: { prenom: true, nom: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.depense.findMany({ where: { date: periode }, select: { montant: true, date: true, categorie: true } }),
  ])
  const mois = Array.from({ length: 12 }, (_, i) => ({ mois: i + 1, recettes: 0, depenses: 0, resultat: 0 }))
  const parCategorie: Record<string, number> = {}
  for (const p of paiements) mois[p.createdAt.getUTCMonth()].recettes += p.montant
  for (const d of depenses) {
    mois[d.date.getUTCMonth()].depenses += d.montant
    parCategorie[d.categorie] = (parCategorie[d.categorie] ?? 0) + d.montant
  }
  for (const m of mois) m.resultat = m.recettes - m.depenses
  const recettes = mois.reduce((s, m) => s + m.recettes, 0)
  const totalDepenses = mois.reduce((s, m) => s + m.depenses, 0)
  res.json({
    annee: a, mois, parCategorie,
    totaux: { recettes, depenses: totalDepenses, resultat: recettes - totalDepenses },
    paiements: paiements.slice(0, 30).map((p) => ({
      id: p.id, montant: p.montant, methode: p.methode, reference: p.referenceExterne, date: p.createdAt,
      avocat: p.abonnement.user ? `${p.abonnement.user.prenom} ${p.abonnement.user.nom}` : null, plan: p.abonnement.plan,
    })),
  })
})

// ─── Administrateurs (commerciaux) : pas de dossiers, pas d'abonnement ───────────

router.get('/admins', async (req: AuthRequest, res: Response): Promise<void> => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, prenom: true, nom: true, email: true, telephone: true, createdAt: true, doitChangerMdp: true, sessions: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } } },
    orderBy: { createdAt: 'asc' },
  })
  res.json(admins.map(({ sessions, ...a }) => ({ ...a, moi: a.id === req.userId, derniereConnexion: sessions[0]?.createdAt ?? null })))
})

const AdminSchema = z.object({
  prenom: z.string().trim().min(2).max(80), nom: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(), telephone: z.string().trim().max(20).optional(),
})

// Nouvel administrateur : il choisit son mot de passe via le lien d'activation (7 jours, usage unique)
router.post('/admins', async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = AdminSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const d = parse.data
  if (await prisma.user.findUnique({ where: { email: d.email } })) { res.status(409).json({ error: 'Email déjà utilisé' }); return }
  const provisoire = motDePasseProvisoire()
  const u = await prisma.user.create({
    data: { ...d, role: 'ADMIN', statut: 'ACTIF', activeAt: new Date(), passwordHash: await bcrypt.hash(provisoire, 12), doitChangerMdp: true },
  })
  res.status(201).json({ id: u.id, lienActivation: await lienActivation(u.id), motDePasseProvisoire: provisoire })
})

// Retirer un administrateur (jamais soi-même ; il en reste toujours au moins un)
router.delete('/admins/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.params.id === req.userId) { res.status(400).json({ error: 'Impossible de retirer votre propre compte' }); return }
  const r = await prisma.$transaction(async (tx) => {
    const cible = await tx.user.findFirst({ where: { id: req.params.id, role: 'ADMIN' }, select: { id: true } })
    if (!cible) return 0
    await tx.session.deleteMany({ where: { userId: cible.id } })
    await tx.alerte.deleteMany({ where: { userId: cible.id } })
    await tx.user.delete({ where: { id: cible.id } })
    return 1
  })
  if (!r) { res.status(404).json({ error: 'Compte introuvable' }); return }
  res.json({ ok: true })
})

// Mot de passe oublié : l'avocat (ou un autre admin) appelle, l'admin donne un mot de passe provisoire.
// Sessions fermées, blocage anti-force brute levé ; changement obligatoire à la prochaine connexion.
router.post('/comptes/:id/reinitialiser-mdp', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.params.id === req.userId) { res.status(400).json({ error: 'Changez votre propre mot de passe dans المشرفون' }); return }
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, email: true, statut: true } })
  if (!u || u.statut === 'EN_ATTENTE') { res.status(404).json({ error: 'Compte introuvable' }); return }
  const provisoire = motDePasseProvisoire()
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(provisoire, 12), doitChangerMdp: true } })
  await prisma.session.deleteMany({ where: { userId: u.id } })
  await redisConnection.del(`login-echec:${u.email.toLowerCase()}`)
  res.json({ motDePasseProvisoire: provisoire })
})

export default router
