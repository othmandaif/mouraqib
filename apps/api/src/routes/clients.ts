// CRM : الموكلون. Visibles par toute l'équipe du cabinet (`userId: { in: req.equipe }`), comme les dossiers.
import { Router, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { requireAuth, sansSecretaire, AuthRequest } from '../middleware/auth'
import { normaliserArabe, nomsProches } from '../utils/texteArabe'
import { solde } from '../services/facturation/calculs'

const router = Router()

const vide = (v: unknown) => (typeof v === 'string' && !v.trim() ? null : v)
const texte = (max: number) => z.preprocess(vide, z.string().trim().max(max).nullable().optional())

const ClientSchema = z.object({
  type: z.enum(['PERSONNE', 'SOCIETE']).optional(),
  nom: z.string().trim().min(2, 'الاسم قصير جداً').max(200),
  cin: texte(20),
  ice: z.preprocess(vide, z.string().trim().regex(/^\d{15}$/, 'ICE : 15 رقماً').nullable().optional()),
  rc: texte(40),
  identifiantFiscal: texte(20),
  representant: texte(200),
  telephone: texte(30),
  email: z.preprocess(vide, z.string().trim().email('بريد غير صالح').max(200).nullable().optional()),
  adresse: texte(400),
  ville: texte(80),
  notes: texte(5000),
})

const InteractionSchema = z.object({
  type: z.enum(['APPEL', 'RENDEZ_VOUS', 'MESSAGE', 'EMAIL', 'NOTE']),
  resume: z.string().trim().min(1).max(3000),
  date: z.string().datetime({ offset: true }).optional(),
  dossierId: z.string().max(40).nullable().optional(),
})

/** Client visible par l'équipe, sinon null. */
const clientDeLEquipe = (req: AuthRequest, id: string) => prisma.client.findFirst({ where: { id, userId: { in: req.equipe! } } })

/** Totaux facturé / réglé par client, en une requête chacun (pas de N+1 sur la liste). */
async function soldesParClient(ids: string[]) {
  if (!ids.length) return new Map<string, { facture: number; regle: number }>()
  const [factures, reglements] = await Promise.all([
    prisma.facture.groupBy({ by: ['clientId'], where: { clientId: { in: ids }, statut: { not: 'BROUILLON' } }, _sum: { totalTtcCentimes: true } }),
    prisma.reglement.groupBy({ by: ['clientId'], where: { clientId: { in: ids } }, _sum: { montantCentimes: true } }),
  ])
  const m = new Map<string, { facture: number; regle: number }>()
  for (const id of ids) m.set(id, { facture: 0, regle: 0 })
  for (const f of factures) m.get(f.clientId)!.facture = f._sum.totalTtcCentimes ?? 0
  for (const r of reglements) m.get(r.clientId)!.regle = r._sum.montantCentimes ?? 0
  return m
}

// ─── Liste ───────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''
  const archives = req.query.archives === '1'
  const clients = await prisma.client.findMany({
    where: { userId: { in: req.equipe! }, estArchive: archives },
    select: { id: true, type: true, nom: true, telephone: true, email: true, ville: true, cin: true, ice: true, updatedAt: true, _count: { select: { dossiers: true } } },
    orderBy: { nom: 'asc' },
    take: 2000,
  })
  // Filtre tolérant à l'arabe fait ici (pas de fonction SQL de normalisation) : la liste d'un cabinet reste petite
  const mots = normaliserArabe(q).split(' ').filter(Boolean)
  const filtres = mots.length
    ? clients.filter((c) => { const t = normaliserArabe(`${c.nom} ${c.telephone ?? ''} ${c.cin ?? ''} ${c.ice ?? ''} ${c.ville ?? ''}`); return mots.every((m) => t.includes(m)) })
    : clients
  const soldes = await soldesParClient(filtres.map((c) => c.id))
  res.json(filtres.map(({ _count, ...c }) => {
    const s = soldes.get(c.id)!
    return { ...c, nbDossiers: _count.dossiers, ...solde(s.facture, s.regle) }
  }))
})

// ─── Conflits d'intérêts ─────────────────────────────────────────────────────
// ?nom=… : le nom apparaît-il parmi vos clients, ou comme adversaire dans un de vos dossiers ?
router.get('/conflits', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const nom = typeof req.query.nom === 'string' ? req.query.nom.trim().slice(0, 200) : ''
  const sauf = typeof req.query.sauf === 'string' ? req.query.sauf : undefined // client à ignorer (soi-même)
  const saufDossier = typeof req.query.saufDossier === 'string' ? req.query.saufDossier : undefined
  if (nom.length < 3) { res.json({ commeClient: [], commeAdversaire: [] }); return }

  const [clients, dossiers] = await Promise.all([
    prisma.client.findMany({ where: { userId: { in: req.equipe! }, ...(sauf ? { id: { not: sauf } } : {}) }, select: { id: true, nom: true } }),
    prisma.dossier.findMany({
      where: { userId: { in: req.equipe! }, ...(saufDossier ? { id: { not: saufDossier } } : {}) },
      select: { id: true, numeroDossier: true, titreAffaire: true, partieAdverse: true, roleClient: true },
    }),
  ])
  const commeClient = clients.filter((c) => nomsProches(nom, c.nom)).slice(0, 10)
  const commeAdversaire = dossiers
    .map((d) => ({ dossierId: d.id, numeroDossier: d.numeroDossier, adversaire: adversaireDuDossier(d) }))
    .filter((d) => d.adversaire && nomsProches(nom, d.adversaire))
    .slice(0, 10)
  res.json({ commeClient, commeAdversaire })
})

/** Adversaire d'un dossier : champ saisi, sinon déduit du titre « المدعي ضد المدعى عليه — الموضوع » et du rôle du client. */
export function adversaireDuDossier(d: { titreAffaire: string | null; partieAdverse: string | null; roleClient: string }): string {
  if (d.partieAdverse?.trim()) return d.partieAdverse.trim()
  const [parties] = (d.titreAffaire ?? '').split(/\s+[—-]\s+/)
  const [demandeur, defendeur] = parties.split(/\s+ضد\s+/)
  if (d.roleClient === 'DEMANDEUR') return defendeur?.trim() ?? ''
  if (d.roleClient === 'DEFENDEUR') return demandeur?.trim() ?? ''
  return ''
}

// ─── Fiche ───────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = ClientSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const client = await prisma.client.create({ data: { ...parse.data, userId: req.userId!, cabinetId: req.cabinetId ?? null } })
  res.status(201).json(client)
})

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.id, userId: { in: req.equipe! } },
    include: {
      dossiers: { select: { id: true, numeroDossier: true, tribunal: true, titreAffaire: true, statutIA: true, estActif: true, honorairesConvenusCentimes: true }, orderBy: { updatedAt: 'desc' } },
      interactions: { orderBy: { date: 'desc' }, take: 100 },
      factures: { select: { id: true, numero: true, type: true, statut: true, dateEmission: true, totalTtcCentimes: true, dossierId: true, createdAt: true, reglements: { select: { montantCentimes: true } } }, orderBy: { createdAt: 'desc' } },
      reglements: { orderBy: { date: 'desc' }, include: { facture: { select: { numero: true } } } },
    },
  })
  if (!client) { res.status(404).json({ error: 'Client non trouvé' }); return }
  const facture = client.factures.filter((f) => f.statut !== 'BROUILLON').reduce((s, f) => s + f.totalTtcCentimes, 0)
  const regle = client.reglements.reduce((s, r) => s + r.montantCentimes, 0)
  const convenu = client.dossiers.reduce<number | null>((s, d) => (d.honorairesConvenusCentimes == null ? s : (s ?? 0) + d.honorairesConvenusCentimes), null)
  res.json({ ...client, solde: solde(facture, regle, convenu) })
})

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = ClientSchema.partial().extend({ estArchive: z.boolean().optional() }).safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  if (!(await clientDeLEquipe(req, req.params.id))) { res.status(404).json({ error: 'Client non trouvé' }); return }
  res.json(await prisma.client.update({ where: { id: req.params.id }, data: parse.data }))
})

// Suppression seulement sans facture émise ni règlement (obligation de conservation) ; sinon archivage.
router.delete('/:id', requireAuth, sansSecretaire, async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await clientDeLEquipe(req, req.params.id)
  if (!client) { res.status(404).json({ error: 'Client non trouvé' }); return }
  const [nbFactures, nbReglements] = await Promise.all([
    prisma.facture.count({ where: { clientId: client.id, statut: { not: 'BROUILLON' } } }),
    prisma.reglement.count({ where: { clientId: client.id } }),
  ])
  if (nbFactures || nbReglements) { res.status(409).json({ error: 'Client avec factures ou règlements : archivez-le au lieu de le supprimer' }); return }
  await prisma.$transaction([
    prisma.facture.deleteMany({ where: { clientId: client.id, statut: 'BROUILLON' } }),
    prisma.client.delete({ where: { id: client.id } }), // dossiers : clientId remis à null ; journal supprimé (cascade)
  ])
  res.json({ ok: true })
})

// ─── Dossiers du client ──────────────────────────────────────────────────────
router.put('/:id/dossiers/:dossierId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const [client, dossier] = await Promise.all([
    clientDeLEquipe(req, req.params.id),
    prisma.dossier.findFirst({ where: { id: req.params.dossierId, userId: { in: req.equipe! } }, select: { id: true } }),
  ])
  if (!client || !dossier) { res.status(404).json({ error: 'Client ou dossier non trouvé' }); return }
  await prisma.dossier.update({ where: { id: dossier.id }, data: { clientId: client.id } })
  res.json({ ok: true })
})

router.delete('/:id/dossiers/:dossierId', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const n = await prisma.dossier.updateMany({ where: { id: req.params.dossierId, clientId: req.params.id, userId: { in: req.equipe! } }, data: { clientId: null } })
  if (!n.count) { res.status(404).json({ error: 'Lien non trouvé' }); return }
  res.json({ ok: true })
})

// ─── Journal des échanges ────────────────────────────────────────────────────
router.post('/:id/interactions', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = InteractionSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  if (!(await clientDeLEquipe(req, req.params.id))) { res.status(404).json({ error: 'Client non trouvé' }); return }
  const { dossierId, date, ...reste } = parse.data
  if (dossierId && !(await prisma.dossier.findFirst({ where: { id: dossierId, userId: { in: req.equipe! } }, select: { id: true } }))) {
    res.status(404).json({ error: 'Dossier non trouvé' }); return
  }
  const it = await prisma.interactionClient.create({
    data: { ...reste, clientId: req.params.id, userId: req.userId!, dossierId: dossierId ?? null, ...(date ? { date: new Date(date) } : {}) },
  })
  res.status(201).json(it)
})

router.delete('/:id/interactions/:iid', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const where: Prisma.InteractionClientWhereInput = { id: req.params.iid, clientId: req.params.id, client: { userId: { in: req.equipe! } } }
  const n = await prisma.interactionClient.deleteMany({ where })
  if (!n.count) { res.status(404).json({ error: 'Note non trouvée' }); return }
  res.json({ ok: true })
})

export default router
