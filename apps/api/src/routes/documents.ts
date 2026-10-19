import { Router, Response } from 'express'
import multer from 'multer'
import { PrismaClient } from '@prisma/client'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { genererDocument } from '../services/documents/generateurDocument'
import { modifierDocument } from '../services/documents/modifierDocument'
import { TYPES_ACTES, getTypeActe } from '../services/documents/typesActes'
import { extraireTexteDocx, importerModele } from '../services/documents/modeleImport'
import { logger } from '../utils/logger'

const router = Router()
const prisma = new PrismaClient()

// Upload en mémoire, limité aux .docx, max 5 Mo.
const uploadDocx = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || file.originalname.toLowerCase().endsWith('.docx')
    cb(null, ok)
  },
})

/* Liste des types d'actes disponibles (registre) — pour le menu de génération */
router.get('/types', requireAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json(TYPES_ACTES.map((t) => ({
    cle: t.cle,
    titreAr: t.titreAr,
    categorie: t.categorie,
    langue: t.langue,
    variables: t.variables,
  })))
})

/* Liste des modèles enregistrés (globaux + ceux du user) */
router.get('/modeles', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const modeles = await prisma.modeleDocument.findMany({
    where: { estActif: true, OR: [{ userId: null }, { userId: req.userId! }] },
    select: { id: true, typeActe: true, categorie: true, titre: true, langue: true, description: true, variables: true },
    orderBy: { titre: 'asc' },
  })
  res.json(modeles)
})

/* Modifier un document existant via instruction naturelle (chatbot) */
router.post('/modifier', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { contenuActuel, instruction, langue } = req.body ?? {}
  if (!contenuActuel || !instruction || !String(instruction).trim()) {
    res.status(400).json({ error: 'contenuActuel et instruction requis' })
    return
  }
  try {
    const contenu = await modifierDocument({ contenuActuel, instruction, langue })
    if (!contenu) {
      res.status(500).json({ error: 'La modification a échoué' })
      return
    }
    res.json({ contenu })
  } catch (err: any) {
    logger.error('Erreur modification document:', err)
    res.status(500).json({ error: 'Échec de la modification' })
  }
})

/* Générer un document (mode structuré OU libre). Ne sauvegarde pas encore. */
router.post('/generer', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { typeActe, promptLibre, variables, dossierId, langue, modeleId } = req.body ?? {}

  if (!typeActe && !promptLibre) {
    res.status(400).json({ error: 'Fournir un type d\'acte ou une demande libre' })
    return
  }

  let modeleContenu: string | undefined
  if (modeleId) {
    const m = await prisma.modeleDocument.findFirst({
      where: { id: modeleId, OR: [{ userId: null }, { userId: req.userId! }] },
    })
    if (m) modeleContenu = m.contenu
  }

  try {
    const resultat = await genererDocument({
      userId: req.userId!,
      typeActe,
      promptLibre,
      variables,
      dossierId,
      langue,
      modeleContenu,
    })
    if (!resultat) {
      res.status(500).json({ error: 'La génération n\'a rien produit' })
      return
    }
    res.json(resultat)
  } catch (err: any) {
    logger.error('Erreur génération document:', err)
    res.status(500).json({ error: 'Échec de la génération' })
  }
})

/* Sauvegarder un document généré (ou édité) */
router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { typeActe, titre, contenu, langue, variables, promptLibre, dossierId, modeleId } = req.body ?? {}
  if (!contenu || !titre) {
    res.status(400).json({ error: 'titre et contenu requis' })
    return
  }
  const type = typeActe ? getTypeActe(typeActe) : undefined
  const doc = await prisma.document.create({
    data: {
      userId: req.userId!,
      dossierId: dossierId ?? null,
      modeleId: modeleId ?? null,
      typeActe: typeActe ?? 'LIBRE',
      categorie: (type?.categorie ?? 'AUTRE') as any,
      titre,
      langue: (langue ?? 'AR') as any,
      contenu,
      variables: variables ?? undefined,
      promptLibre: promptLibre ?? null,
    },
  })
  res.json(doc)
})

/* Liste des documents du user (option: filtrer par dossier) */
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const dossierId = (req.query.dossierId as string) || undefined
  const docs = await prisma.document.findMany({
    where: { userId: req.userId!, ...(dossierId ? { dossierId } : {}) },
    select: { id: true, titre: true, typeActe: true, categorie: true, langue: true, statut: true, dossierId: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })
  res.json(docs)
})

/* Récupérer un document complet */
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = await prisma.document.findFirst({ where: { id: req.params.id, userId: req.userId! } })
  if (!doc) { res.status(404).json({ error: 'Document introuvable' }); return }
  res.json(doc)
})

/* Mettre à jour un document (édition par l'avocat + version) */
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = await prisma.document.findFirst({ where: { id: req.params.id, userId: req.userId! } })
  if (!doc) { res.status(404).json({ error: 'Document introuvable' }); return }
  const { contenu, titre, statut } = req.body ?? {}
  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: {
      ...(contenu !== undefined ? { contenu, version: { increment: 1 } } : {}),
      ...(titre !== undefined ? { titre } : {}),
      ...(statut !== undefined ? { statut } : {}),
    },
  })
  res.json(updated)
})

/* Supprimer un document */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = await prisma.document.findFirst({ where: { id: req.params.id, userId: req.userId! } })
  if (!doc) { res.status(404).json({ error: 'Document introuvable' }); return }
  await prisma.document.delete({ where: { id: doc.id } })
  res.json({ ok: true })
})

/* ════════════ MODÈLES IMPORTÉS PAR L'AVOCAT ════════════ */

/* Importer un modèle .docx : extraction + analyse style + stockage.
   Le fichier est envoyé en multipart/form-data (champ "fichier").
   On lit le buffer via multer (mémoire). */
router.post('/modeles/importer', requireAuth, uploadDocx.single('fichier'), async (req: AuthRequest, res: Response): Promise<void> => {
  const file = (req as any).file
  if (!file || !file.buffer) {
    res.status(400).json({ error: 'Aucun fichier reçu (champ "fichier")' })
    return
  }
  try {
    const texte = await extraireTexteDocx(file.buffer)
    if (!texte || texte.length < 30) {
      res.status(400).json({ error: 'Le document semble vide ou illisible' })
      return
    }
    const modele = await importerModele({
      userId: req.userId!,
      texte,
      typeActe: req.body?.typeActe || undefined,
      titre: req.body?.titre || undefined,
      langue: req.body?.langue || 'AR',
    })
    res.json({ id: modele.id, titre: modele.titre, typeActe: modele.typeActe, styleResume: modele.styleResume })
  } catch (err: any) {
    logger.error('Erreur import modèle:', err)
    res.status(500).json({ error: 'Échec de l\'import du document' })
  }
})

/* Liste des modèles importés par l'avocat */
router.get('/modeles/importes', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const modeles = await prisma.modeleDocument.findMany({
    where: { userId: req.userId!, importeParAvocat: true, estActif: true },
    select: { id: true, titre: true, typeActe: true, categorie: true, langue: true, styleResume: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(modeles)
})

/* Supprimer un modèle importé */
router.delete('/modeles/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const m = await prisma.modeleDocument.findFirst({ where: { id: req.params.id, userId: req.userId!, importeParAvocat: true } })
  if (!m) { res.status(404).json({ error: 'Modèle introuvable' }); return }
  await prisma.modeleDocument.delete({ where: { id: m.id } })
  res.json({ ok: true })
})

export default router