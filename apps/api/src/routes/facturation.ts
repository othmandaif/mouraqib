// Facturation de l'avocat : profil (en-tête), factures et notes d'honoraires, avoirs, encaissements.
// Règles (CGI art. 145) : numéro attribué à l'émission, série annuelle continue et sans trou, dates chronologiques ;
// une facture émise ne se modifie ni ne se supprime : on l'annule par un avoir.
import { Router, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { requireAuth, sansSecretaire, AuthRequest } from '../middleware/auth'
import { TAUX_TVA, calculerTotaux, etatPaiement, formaterNumero, lignesAvoir, type LigneFacture } from '../services/facturation/calculs'
import { finDeJourMaroc } from '../utils/dateMaroc'
import { lireProfil } from '../services/facturation/profil'

const router = Router()

/** Une série de numéros par cabinet (sinon par avocat). */
const espaceDe = (req: AuthRequest) => req.cabinetId ?? req.userId!
const vide = (v: unknown) => (typeof v === 'string' && !v.trim() ? null : v)
const texte = (max: number) => z.preprocess(vide, z.string().trim().max(max).nullable().optional())

// ─── Profil (en-tête des factures) ───────────────────────────────────────────
const ProfilSchema = z.object({
  nom: z.string().trim().min(2).max(200),
  barreau: texte(120), adresse: texte(400), ville: texte(80), telephone: texte(30),
  email: z.preprocess(vide, z.string().trim().email().max(200).nullable().optional()),
  ice: z.preprocess(vide, z.string().trim().regex(/^\d{15}$/, 'ICE : 15 رقماً').nullable().optional()),
  identifiantFiscal: texte(20), taxeProfessionnelle: texte(20), rib: texte(40), banque: texte(80), piedPage: texte(1000),
})

router.get('/profil', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json(await lireProfil(espaceDe(req), req.userId!))
})

router.put('/profil', requireAuth, sansSecretaire, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = ProfilSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const espace = espaceDe(req)
  const p = await prisma.profilFacturation.upsert({ where: { espace }, create: { ...parse.data, espace }, update: parse.data })
  res.json({ ...p, existe: true })
})

// ─── Factures ────────────────────────────────────────────────────────────────
const LigneSchema = z.object({
  designation: z.string().trim().min(1).max(500),
  quantite: z.number().positive().max(100_000),
  prixUnitaireCentimes: z.number().int().min(0).max(1_000_000_000),
})
const FactureSchema = z.object({
  type: z.enum(['FACTURE', 'NOTE_HONORAIRES']),
  clientId: z.string().min(1).max(40),
  dossierId: z.string().max(40).nullable().optional(),
  lignes: z.array(LigneSchema).min(1).max(50),
  tauxTva: z.number().refine((t) => (TAUX_TVA as readonly number[]).includes(t), 'Taux de TVA non prévu'),
  dateEcheance: z.string().datetime({ offset: true }).nullable().optional(),
  modePaiement: texte(120),
  notes: texte(2000),
})

const INCLURE = {
  client: { select: { id: true, nom: true, type: true } },
  dossier: { select: { id: true, numeroDossier: true } },
  reglements: { select: { id: true, montantCentimes: true, date: true, mode: true, reference: true }, orderBy: { date: 'asc' } },
  avoir: { select: { id: true, numero: true } },
  factureOrigine: { select: { id: true, numero: true } },
} satisfies Prisma.FactureInclude

type FactureAvecRelations = Prisma.FactureGetPayload<{ include: typeof INCLURE }>
function presenter(f: FactureAvecRelations) {
  const regle = f.reglements.reduce((s, r) => s + r.montantCentimes, 0)
  return { ...f, regleCentimes: regle, resteCentimes: f.totalTtcCentimes - regle, etatPaiement: f.statut === 'BROUILLON' ? null : etatPaiement(f.totalTtcCentimes, regle) }
}

/** Facture visible par l'équipe. */
const factureDeLEquipe = (req: AuthRequest, id: string) => prisma.facture.findFirst({ where: { id, userId: { in: req.equipe! } }, include: INCLURE })

/** Client et dossier doivent appartenir à l'équipe ; le dossier doit être celui du client s'il en a un. */
async function verifierLiens(req: AuthRequest, clientId: string, dossierId?: string | null): Promise<string | null> {
  const client = await prisma.client.findFirst({ where: { id: clientId, userId: { in: req.equipe! } }, select: { id: true } })
  if (!client) return 'Client non trouvé'
  if (dossierId) {
    const d = await prisma.dossier.findFirst({ where: { id: dossierId, userId: { in: req.equipe! } }, select: { clientId: true } })
    if (!d) return 'Dossier non trouvé'
    if (d.clientId && d.clientId !== clientId) return "Ce dossier appartient à un autre client"
  }
  return null
}

router.get('/factures', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const where: Prisma.FactureWhereInput = { userId: { in: req.equipe! } }
  const { statut, clientId, dossierId, annee } = req.query
  if (statut === 'BROUILLON' || statut === 'EMISE' || statut === 'ANNULEE') where.statut = statut
  if (typeof clientId === 'string') where.clientId = clientId
  if (typeof dossierId === 'string') where.dossierId = dossierId
  if (typeof annee === 'string' && /^\d{4}$/.test(annee)) {
    const a = Number(annee)
    where.OR = [{ dateEmission: { gte: new Date(Date.UTC(a, 0, 1)), lt: new Date(Date.UTC(a + 1, 0, 1)) } }, { statut: 'BROUILLON' }]
  }
  const factures = await prisma.facture.findMany({ where, include: INCLURE, orderBy: [{ statut: 'asc' }, { dateEmission: 'desc' }, { createdAt: 'desc' }], take: 1000 })
  res.json(factures.map(presenter))
})

router.post('/factures', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = FactureSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const d = parse.data
  const err = await verifierLiens(req, d.clientId, d.dossierId)
  if (err) { res.status(404).json({ error: err }); return }
  const f = await prisma.facture.create({
    data: {
      ...d, dossierId: d.dossierId ?? null, dateEcheance: d.dateEcheance ? new Date(d.dateEcheance) : null,
      lignes: d.lignes as unknown as Prisma.InputJsonValue, ...calculerTotaux(d.lignes, d.tauxTva),
      espace: espaceDe(req), userId: req.userId!, cabinetId: req.cabinetId ?? null,
    },
    include: INCLURE,
  })
  res.status(201).json(presenter(f))
})

router.get('/factures/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const f = await factureDeLEquipe(req, req.params.id)
  if (!f) { res.status(404).json({ error: 'Facture non trouvée' }); return }
  // Brouillon : l'aperçu montre l'en-tête et le client actuels ; émise : les copies figées
  const apercu = f.statut === 'BROUILLON'
    ? { emetteur: await lireProfil(espaceDe(req), req.userId!), destinataire: await prisma.client.findUnique({ where: { id: f.clientId } }) }
    : {}
  res.json({ ...presenter(f), ...apercu })
})

router.patch('/factures/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const f = await factureDeLEquipe(req, req.params.id)
  if (!f) { res.status(404).json({ error: 'Facture non trouvée' }); return }
  if (f.statut !== 'BROUILLON') { res.status(409).json({ error: 'Facture émise : non modifiable (annulez-la par un avoir)' }); return }
  const parse = FactureSchema.partial().safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const d = parse.data
  const clientId = d.clientId ?? f.clientId
  const dossierId = d.dossierId === undefined ? f.dossierId : d.dossierId
  const err = await verifierLiens(req, clientId, dossierId)
  if (err) { res.status(404).json({ error: err }); return }
  const lignes = (d.lignes ?? f.lignes) as unknown as LigneFacture[]
  const tauxTva = d.tauxTva ?? f.tauxTva
  const maj = await prisma.facture.update({
    where: { id: f.id },
    data: {
      ...d, clientId, dossierId,
      ...(d.dateEcheance !== undefined ? { dateEcheance: d.dateEcheance ? new Date(d.dateEcheance) : null } : {}),
      lignes: lignes as unknown as Prisma.InputJsonValue, ...calculerTotaux(lignes, tauxTva),
    },
    include: INCLURE,
  })
  res.json(presenter(maj))
})

router.delete('/factures/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const n = await prisma.facture.deleteMany({ where: { id: req.params.id, userId: { in: req.equipe! }, statut: 'BROUILLON' } })
  if (!n.count) { res.status(409).json({ error: 'Seul un brouillon peut être supprimé' }); return }
  res.json({ ok: true })
})

/** Attribue le numéro suivant de la série (verrou de ligne : deux émissions simultanées ne prennent pas le même). */
async function prochainNumero(tx: Prisma.TransactionClient, espace: string, annee: number): Promise<string> {
  const [{ dernier }] = await tx.$queryRaw<{ dernier: number }[]>`
    INSERT INTO "SequenceFacture" ("espace", "annee", "dernier") VALUES (${espace}, ${annee}, 1)
    ON CONFLICT ("espace", "annee") DO UPDATE SET "dernier" = "SequenceFacture"."dernier" + 1
    RETURNING "dernier"`
  return formaterNumero(annee, dernier)
}

/** « 2026-10-25 » au Maroc (comparaison de jours sans souci de fuseau). */
const jourMaroc = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const anneeMaroc = (d: Date) => Number(jourMaroc(d).slice(0, 4))

const EmissionSchema = z.object({ dateEmission: z.string().datetime({ offset: true }).optional() })

router.post('/factures/:id/emettre', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = EmissionSchema.safeParse(req.body ?? {})
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const f = await factureDeLEquipe(req, req.params.id)
  if (!f) { res.status(404).json({ error: 'Facture non trouvée' }); return }
  if (f.statut !== 'BROUILLON') { res.status(409).json({ error: 'Facture déjà émise' }); return }

  const profil = await prisma.profilFacturation.findUnique({ where: { espace: espaceDe(req) } })
  if (!profil?.ice || !profil.identifiantFiscal) { res.status(422).json({ error: 'PROFIL_INCOMPLET', message: 'Complétez ICE et identifiant fiscal du cabinet avant d’émettre.' }); return }
  const client = await prisma.client.findUnique({ where: { id: f.clientId } })
  if (!client) { res.status(404).json({ error: 'Client non trouvé' }); return }
  if (client.type === 'SOCIETE' && !client.ice) { res.status(422).json({ error: 'ICE_CLIENT', message: 'ICE du client (société) obligatoire sur la facture.' }); return }
  if (f.totalTtcCentimes <= 0) { res.status(422).json({ error: 'MONTANT_NUL', message: 'Montant nul.' }); return }

  const dateEmission = parse.data.dateEmission ? new Date(parse.data.dateEmission) : new Date()
  if (dateEmission > finDeJourMaroc(new Date())) { res.status(422).json({ error: 'DATE_FUTURE', message: 'Date d’émission dans le futur.' }); return }
  const espace = espaceDe(req)
  const annee = anneeMaroc(dateEmission)

  try {
    const emise = await prisma.$transaction(async (tx) => {
      // Ordre chronologique de la série : pas de date antérieure à la dernière facture émise de l'année
      const derniere = await tx.facture.findFirst({ where: { espace, statut: { not: 'BROUILLON' }, numero: { startsWith: `${annee}-` } }, orderBy: { dateEmission: 'desc' }, select: { dateEmission: true } })
      if (derniere?.dateEmission && jourMaroc(dateEmission) < jourMaroc(derniere.dateEmission)) {
        throw new Error('DATE_ANTERIEURE')
      }
      const numero = await prochainNumero(tx, espace, annee)
      const { id: _i, espace: _e, updatedAt: _u, ...emetteur } = profil
      return tx.facture.update({
        where: { id: f.id },
        data: {
          numero, statut: 'EMISE', dateEmission, emiseAt: new Date(),
          emetteur: emetteur as unknown as Prisma.InputJsonValue,
          destinataire: { type: client.type, nom: client.nom, cin: client.cin, ice: client.ice, rc: client.rc, identifiantFiscal: client.identifiantFiscal, adresse: client.adresse, ville: client.ville, representant: client.representant },
        },
        include: INCLURE,
      })
    })
    res.json(presenter(emise))
  } catch (e: any) {
    if (e?.message === 'DATE_ANTERIEURE') { res.status(422).json({ error: 'DATE_ANTERIEURE', message: 'Date antérieure à la dernière facture émise : la série doit rester chronologique.' }); return }
    throw e
  }
})

// Annulation : avoir émis dans la même série, qui compense la facture
router.post('/factures/:id/annuler', requireAuth, sansSecretaire, async (req: AuthRequest, res: Response): Promise<void> => {
  const f = await factureDeLEquipe(req, req.params.id)
  if (!f) { res.status(404).json({ error: 'Facture non trouvée' }); return }
  if (f.statut !== 'EMISE' || f.type === 'AVOIR') { res.status(409).json({ error: 'Seule une facture émise peut être annulée' }); return }
  const motif = typeof req.body?.motif === 'string' ? req.body.motif.trim().slice(0, 500) : ''
  const espace = espaceDe(req)
  const maintenant = new Date()
  const avoir = await prisma.$transaction(async (tx) => {
    // Deux annulations simultanées : une seule passe la mise à jour conditionnelle
    const verrou = await tx.facture.updateMany({ where: { id: f.id, statut: 'EMISE' }, data: { statut: 'ANNULEE', annuleeAt: maintenant } })
    if (!verrou.count) return null
    const numero = await prochainNumero(tx, espace, anneeMaroc(maintenant))
    const lignes = lignesAvoir(f.lignes as unknown as LigneFacture[])
    return tx.facture.create({
      data: {
        espace, userId: req.userId!, cabinetId: req.cabinetId ?? null, type: 'AVOIR', statut: 'EMISE', numero,
        clientId: f.clientId, dossierId: f.dossierId, factureOrigineId: f.id, dateEmission: maintenant, emiseAt: maintenant,
        lignes: lignes as unknown as Prisma.InputJsonValue, tauxTva: f.tauxTva, ...calculerTotaux(lignes, f.tauxTva),
        emetteur: f.emetteur ?? Prisma.JsonNull, destinataire: f.destinataire ?? Prisma.JsonNull,
        notes: `فاتورة مضادة للفاتورة رقم ${f.numero}${motif ? ` — ${motif}` : ''}`,
      },
      include: INCLURE,
    })
  })
  if (!avoir) { res.status(409).json({ error: 'Facture déjà annulée' }); return }
  res.json(presenter(avoir))
})

// ─── Encaissements ───────────────────────────────────────────────────────────
const ReglementSchema = z.object({
  clientId: z.string().min(1).max(40),
  dossierId: z.string().max(40).nullable().optional(),
  factureId: z.string().max(40).nullable().optional(),
  montantCentimes: z.number().int().positive().max(1_000_000_000),
  date: z.string().datetime({ offset: true }),
  mode: z.enum(['ESPECES', 'CHEQUE', 'VIREMENT', 'EFFET', 'AUTRE']),
  reference: texte(80),
  note: texte(500),
})

/** La facture imputée doit être émise, du même client. Le dossier se déduit de la facture. */
async function verifierImputation(req: AuthRequest, clientId: string, factureId: string) {
  const f = await prisma.facture.findFirst({ where: { id: factureId, userId: { in: req.equipe! } }, select: { clientId: true, statut: true, type: true, dossierId: true } })
  if (!f) return { erreur: 'Facture non trouvée' }
  if (f.clientId !== clientId) return { erreur: 'Facture d’un autre client' }
  if (f.statut !== 'EMISE' || f.type === 'AVOIR') return { erreur: 'Imputation possible seulement sur une facture émise' }
  return { dossierId: f.dossierId }
}

router.get('/reglements', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const where: Prisma.ReglementWhereInput = { userId: { in: req.equipe! } }
  if (typeof req.query.clientId === 'string') where.clientId = req.query.clientId
  if (typeof req.query.dossierId === 'string') where.dossierId = req.query.dossierId
  if (req.query.provisions === '1') where.factureId = null
  const r = await prisma.reglement.findMany({
    where, orderBy: { date: 'desc' }, take: 1000,
    include: { client: { select: { id: true, nom: true } }, facture: { select: { id: true, numero: true } }, dossier: { select: { id: true, numeroDossier: true } } },
  })
  res.json(r)
})

router.post('/reglements', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = ReglementSchema.safeParse(req.body)
  if (!parse.success) { res.status(400).json({ error: parse.error.flatten() }); return }
  const d = parse.data
  const err = await verifierLiens(req, d.clientId, d.dossierId)
  if (err) { res.status(404).json({ error: err }); return }
  let dossierId = d.dossierId ?? null
  if (d.factureId) {
    const imp = await verifierImputation(req, d.clientId, d.factureId)
    if (imp.erreur) { res.status(422).json({ error: imp.erreur }); return }
    dossierId = dossierId ?? imp.dossierId ?? null
  }
  const r = await prisma.reglement.create({ data: { ...d, dossierId, factureId: d.factureId ?? null, date: new Date(d.date), userId: req.userId!, cabinetId: req.cabinetId ?? null } })
  res.status(201).json(r)
})

// Imputer une provision sur une facture (ou la détacher : factureId null)
router.patch('/reglements/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await prisma.reglement.findFirst({ where: { id: req.params.id, userId: { in: req.equipe! } } })
  if (!r) { res.status(404).json({ error: 'Règlement non trouvé' }); return }
  const factureId = req.body?.factureId === null ? null : typeof req.body?.factureId === 'string' ? req.body.factureId : undefined
  if (factureId === undefined) { res.status(400).json({ error: 'factureId requis' }); return }
  if (factureId) {
    const imp = await verifierImputation(req, r.clientId, factureId)
    if (imp.erreur) { res.status(422).json({ error: imp.erreur }); return }
  }
  res.json(await prisma.reglement.update({ where: { id: r.id }, data: { factureId } }))
})

router.delete('/reglements/:id', requireAuth, sansSecretaire, async (req: AuthRequest, res: Response): Promise<void> => {
  const n = await prisma.reglement.deleteMany({ where: { id: req.params.id, userId: { in: req.equipe! } } })
  if (!n.count) { res.status(404).json({ error: 'Règlement non trouvé' }); return }
  res.json({ ok: true })
})

// ─── Synthèse (tableau de bord de la facturation) ────────────────────────────
router.get('/synthese', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const annee = typeof req.query.annee === 'string' && /^\d{4}$/.test(req.query.annee) ? Number(req.query.annee) : anneeMaroc(new Date())
  const debut = new Date(Date.UTC(annee, 0, 1)), fin = new Date(Date.UTC(annee + 1, 0, 1))
  const equipe = { in: req.equipe! }
  const [factures, reglements, provisions, ouvertes] = await Promise.all([
    prisma.facture.findMany({ where: { userId: equipe, statut: { not: 'BROUILLON' }, dateEmission: { gte: debut, lt: fin } }, select: { dateEmission: true, totalHtCentimes: true, tvaCentimes: true, totalTtcCentimes: true } }),
    prisma.reglement.findMany({ where: { userId: equipe, date: { gte: debut, lt: fin } }, select: { date: true, montantCentimes: true } }),
    prisma.reglement.aggregate({ where: { userId: equipe, factureId: null }, _sum: { montantCentimes: true } }),
    // Impayés : factures émises (toutes années) non soldées
    prisma.facture.findMany({ where: { userId: equipe, statut: 'EMISE', type: { not: 'AVOIR' } }, include: INCLURE, orderBy: { dateEmission: 'asc' } }),
  ])
  const mois = Array.from({ length: 12 }, (_, i) => ({ mois: i + 1, factureCentimes: 0, encaisseCentimes: 0 }))
  for (const f of factures) mois[f.dateEmission!.getUTCMonth()].factureCentimes += f.totalTtcCentimes
  for (const r of reglements) mois[r.date.getUTCMonth()].encaisseCentimes += r.montantCentimes
  const impayes = ouvertes.map(presenter).filter((f) => f.resteCentimes > 0)
  res.json({
    annee,
    factureTtcCentimes: factures.reduce((s, f) => s + f.totalTtcCentimes, 0),
    factureHtCentimes: factures.reduce((s, f) => s + f.totalHtCentimes, 0),
    tvaCentimes: factures.reduce((s, f) => s + f.tvaCentimes, 0),
    encaisseCentimes: reglements.reduce((s, r) => s + r.montantCentimes, 0),
    provisionsNonImputeesCentimes: provisions._sum.montantCentimes ?? 0,
    impayesCentimes: impayes.reduce((s, f) => s + f.resteCentimes, 0),
    impayes: impayes.slice(0, 50),
    mois,
  })
})

export default router
