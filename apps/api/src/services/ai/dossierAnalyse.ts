import { PrismaClient, StatutDossier } from '@prisma/client'
import { askDeepseek, limiterTexte } from './deepseek'
import { PROMPT_ANALYSE_DOSSIER } from './prompts.ar'
import { logger } from '../../utils/logger'

const prisma = new PrismaClient()

export interface AnalyseDossier {
  resume: string
  statut: string
  prochainesEcheances: string[]
  conseils: string[]
}

/**
 * Analyse complète d'un dossier (résumé + échéances probables + conseils).
 * Met en cache dans Dossier.analyseIA + analyseAt.
 * @param force  si true, refait l'analyse même si déjà en cache et à jour.
 */
export async function analyserDossierComplet(
  dossierId: string,
  userId: string,
  force = false,
): Promise<AnalyseDossier | null> {
  const dossier = await prisma.dossier.findFirst({
    where: { id: dossierId, userId },
    include: {
      evenements: { orderBy: { datePublicationGreffe: 'desc' }, take: 30 },
    },
  })
  if (!dossier) return null

  // Cache : si une analyse existe et qu'aucun événement n'est plus récent, on la réutilise.
  if (!force && dossier.analyseIA && dossier.analyseAt) {
    const dernierEvt = dossier.evenements[0]?.datePublicationGreffe
    if (!dernierEvt || new Date(dernierEvt).getTime() <= new Date(dossier.analyseAt).getTime()) {
      return dossier.analyseIA as unknown as AnalyseDossier
    }
  }

  if (dossier.evenements.length === 0) return null

  const historique = limiterTexte(
    dossier.evenements.map((e) =>
      `${new Date(e.datePublicationGreffe).toLocaleDateString('fr-MA')} : ${e.texteArabe}`,
    ),
    7000,
  )

  const rawData = (dossier.rawData ?? {}) as any
  const parties = Array.isArray(rawData.parties)
    ? rawData.parties.map((p: any) => `${p.qualite}: ${p.nom}`).join(' / ')
    : ''
  const recours = Array.isArray(rawData.recours)
    ? rawData.recours.map((r: any) => `${r.type} (${r.dateDepot})`).join(' / ')
    : ''

  const userPrompt = `رقم الملف: ${dossier.numeroDossier}
المحكمة: ${dossier.tribunal}
الموضوع: ${dossier.titreAffaire || 'غير محدّد'}
الأطراف: ${parties || 'غير متوفرة'}
الطعون: ${recours || 'لا يوجد'}

لائحة الإجراءات (من الأحدث إلى الأقدم):
${historique}`

  try {
    const res = await askDeepseek<AnalyseDossier>(PROMPT_ANALYSE_DOSSIER, userPrompt, {
      json: true,
      temperature: 0.3,
      maxTokens: 1500,
    })

    const analyse: AnalyseDossier = {
      resume: res.resume || '',
      statut: ['OUVERT', 'EN_DELIBERE', 'CLOS', 'INCONNU'].includes(res.statut) ? res.statut : 'INCONNU',
      prochainesEcheances: Array.isArray(res.prochainesEcheances) ? res.prochainesEcheances.slice(0, 6) : [],
      conseils: Array.isArray(res.conseils) ? res.conseils.slice(0, 6) : [],
    }

    await prisma.dossier.update({
      where: { id: dossierId },
      data: {
        analyseIA: analyse as any,
        resumeIA: analyse.resume.slice(0, 500),
        statutIA: analyse.statut as StatutDossier,
        analyseAt: new Date(),
      },
    })

    logger.info(`Analyse complète IA pour ${dossier.numeroDossier}`)
    return analyse
  } catch (err) {
    logger.error(`Échec analyse complète IA dossier ${dossierId}:`, err)
    return null
  }
}