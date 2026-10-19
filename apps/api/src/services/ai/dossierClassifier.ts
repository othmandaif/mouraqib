import { PrismaClient, TypeProcedure, StatutDossier } from '@prisma/client'
import { askDeepseek, limiterTexte } from './deepseek'
import { PROMPT_CLASSIFICATION } from './prompts.ar'
import { logger } from '../../utils/logger'

const prisma = new PrismaClient()

interface ClassificationDossier {
  typeProcedure: string
  statutDossier: string
  resume: string
}

const PROCEDURES = ['CIVILE', 'PENALE', 'COMMERCIALE', 'ADMINISTRATIVE', 'TRAVAIL', 'FAMILLE', 'REFERE']
const STATUTS = ['OUVERT', 'EN_DELIBERE', 'CLOS', 'INCONNU']

/**
 * Analyse un dossier avec DeepSeek : déduit statut, type de procédure, résumé.
 * Met à jour Dossier.statutIA, typeProcedure, resumeIA, analyseAt.
 */
export async function analyserDossierIA(dossierId: string): Promise<void> {
  const dossier = await prisma.dossier.findUnique({
    where: { id: dossierId },
    include: {
      evenements: { orderBy: { datePublicationGreffe: 'desc' }, take: 20 },
    },
  })
  if (!dossier) return
  if (dossier.evenements.length === 0) return

  const historique = limiterTexte(
    dossier.evenements.map((e) =>
      `${new Date(e.datePublicationGreffe).toLocaleDateString('fr-MA')} : ${e.texteArabe}`,
    ),
    6000,
  )

  const userPrompt = `رقم الملف: ${dossier.numeroDossier}
المحكمة: ${dossier.tribunal}
لائحة الإجراءات (من الأحدث إلى الأقدم):
${historique}`

  try {
    const res = await askDeepseek<ClassificationDossier>(PROMPT_CLASSIFICATION, userPrompt, { json: true })

    const typeProcedure = PROCEDURES.includes(res.typeProcedure)
      ? (res.typeProcedure as TypeProcedure)
      : dossier.typeProcedure
    const statutIA = STATUTS.includes(res.statutDossier)
      ? (res.statutDossier as StatutDossier)
      : StatutDossier.INCONNU

    await prisma.dossier.update({
      where: { id: dossierId },
      data: {
        typeProcedure,
        statutIA,
        resumeIA: (res.resume || '').slice(0, 500),
        analyseAt: new Date(),
      },
    })

    logger.info(`IA dossier ${dossier.numeroDossier}: ${statutIA} / ${typeProcedure}`)
  } catch (err) {
    logger.error(`Échec analyse IA dossier ${dossierId}:`, err)
  }
}

/**
 * Analyse tous les dossiers ayant de NOUVEAUX événements non encore reflétés.
 * Ciblage anti-coût : on ne rappelle l'IA que si un événement est plus récent
 * que la dernière analyse (analyseAt).
 */
export async function analyserDossiersAvecNouveautes(): Promise<void> {
  const dossiers = await prisma.dossier.findMany({
    where: {
      estActif: true,
      evenements: { some: { estNouvel: true } },
    },
    select: {
      id: true,
      analyseAt: true,
      evenements: { orderBy: { datePublicationGreffe: 'desc' }, take: 1, select: { datePublicationGreffe: true } },
    },
  })

  // On ne (ré)analyse que si un événement est plus récent que la dernière analyse IA.
  const aTraiter = dossiers.filter((d) => {
    const dernierEvt = d.evenements[0]?.datePublicationGreffe
    if (!dernierEvt) return false
    if (!d.analyseAt) return true
    return new Date(dernierEvt).getTime() > new Date(d.analyseAt).getTime()
  })

  logger.info(`IA: ${aTraiter.length}/${dossiers.length} dossier(s) à (ré)analyser`)
  for (const d of aTraiter) {
    await analyserDossierIA(d.id)
  }
}