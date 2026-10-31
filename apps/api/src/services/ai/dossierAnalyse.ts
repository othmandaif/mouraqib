import { StatutDossier } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { askDeepseek, limiterTexte } from './deepseek'
import { PROMPT_ANALYSE_DOSSIER, CONSIGNE_FR_ANALYSE } from './prompts.ar'
import { logger } from '../../utils/logger'


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
  userId: string | { in: string[] },
  force = false,
  langue: 'ar' | 'fr' = 'ar', // langue du compte (Paramètres)
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
      const cache = dossier.analyseIA as unknown as AnalyseDossier
      // Analyse en cache rédigée dans l'autre langue : on la refait
      if (/[\u0600-\u06FF]/.test(cache.resume ?? '') === (langue === 'ar')) return cache
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

  const userPrompt = `رقم الملف: ${dossier.id}
المحكمة: ${dossier.tribunal}
الموضوع: ${dossier.titreAffaire || 'غير محدّد'}
الأطراف: ${parties || 'غير متوفرة'}
الطعون: ${recours || 'لا يوجد'}

لائحة الإجراءات (من الأحدث إلى الأقدم):
${historique}`

  try {
    const res = await askDeepseek<AnalyseDossier>(PROMPT_ANALYSE_DOSSIER + (langue === 'fr' ? CONSIGNE_FR_ANALYSE : ''), userPrompt, {
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

    logger.info(`Analyse complète IA pour ${dossier.id}`)
    return analyse
  } catch (err) {
    logger.error(`Échec analyse complète IA dossier ${dossierId}:`, err)
    return null
  }
}