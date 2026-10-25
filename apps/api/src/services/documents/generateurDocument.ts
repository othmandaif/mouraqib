import { prisma } from '../../utils/prisma'
import { askDeepseek, limiterTexte } from '../ai/deepseek'
import { getTypeActe, TypeActe } from './typesActes'
import { trouverModeleStyle } from './modeleImport'
import { logger } from '../../utils/logger'


const DISCLAIMER_AR = '⚠️ هذه وثيقة مُولّدة آلياً كمسوّدة استرشادية فقط. يجب على المحامي مراجعتها وتدقيقها قانونياً قبل أي استعمال أو توقيع. لا تُغني عن المسؤولية المهنية.'

/* System prompt de base : impose rigueur, droit marocain, pas d'invention. */
function systemePrompt(type?: TypeActe, langue: 'AR' | 'FR' = 'AR'): string {
  const base = langue === 'FR'
    ? `Tu es un juriste-rédacteur expert en droit marocain. Tu rédiges des actes juridiques précis, structurés et conformes au droit marocain en vigueur.
Règles strictes :
- N'invente JAMAIS de faits, noms, montants ou dates : utilise uniquement les données fournies. Pour toute donnée manquante, insère un marqueur clair entre crochets [À COMPLÉTER : ...].
- Cite les bases légales marocaines pertinentes (D.O.C., Code du travail, Code de commerce, C.P.C., etc.).
- Structure l'acte avec des articles numérotés et un langage juridique formel.
- N'utilise PAS de Markdown (pas de ** pour le gras, ni de # pour les titres). Texte brut uniquement : un titre va seul sur sa ligne, les articles sont numérotés.
- N'ajoute aucune garantie de validité : c'est une trame à valider par l'avocat.`
    : `أنت محرّر قانوني خبير في القانون المغربي. تحرّر وثائق ومحرّرات قانونية دقيقة ومهيكلة ومطابقة للقانون المغربي الجاري به العمل.
قواعد صارمة:
- لا تختلق أبداً وقائع أو أسماء أو مبالغ أو تواريخ: استعمل فقط المعطيات المقدّمة. لكل معطى ناقص، أدرج علامة واضحة بين معقوفتين [يُستكمل: ...].
- استند إلى الأسانيد القانونية المغربية ذات الصلة (ق.ل.ع، مدونة الشغل، مدونة التجارة، ق.م.م...).
- هيكل الوثيقة بفصول/بنود مرقّمة وبلغة قانونية رسمية.
- لا تستعمل تنسيق Markdown (لا ** للتشديد ولا # للعناوين). اكتب نصاً عادياً فقط: العنوان في سطر مستقل والبنود مرقّمة.
- لا تضمن صحة الوثيقة: هي مسوّدة يجب أن يدقّقها المحامي.`
  const consignes = type ? `\n\nنوع الوثيقة: ${type.titreAr}\nالتعليمات القانونية الخاصة:\n${type.consignes}` : ''
  return base + consignes
}

/* Contexte dossier (optionnel) pour pré-remplir. */
async function contexteDossier(dossierId: string, userId: string): Promise<string> {
  const d = await prisma.dossier.findFirst({
    where: { id: dossierId, userId },
    select: { numeroDossier: true, tribunal: true, titreAffaire: true, partieAdverse: true, rawData: true },
  })
  if (!d) return ''
  const raw = (d.rawData ?? {}) as any
  const parties = Array.isArray(raw.parties) ? raw.parties.map((p: any) => `${p.qualite}: ${p.nom}`).join(' / ') : ''
  return `\n\nمعطيات الملف المرتبط (استعملها إن كانت مناسبة):
رقم الملف: ${d.numeroDossier}
المحكمة: ${d.tribunal}
الموضوع: ${d.titreAffaire || '—'}
الطرف الخصم: ${d.partieAdverse || '—'}
الأطراف: ${parties || '—'}`
}

interface GenererParams {
  userId: string
  typeActe?: string         // clé du registre (mode modèle/structuré)
  promptLibre?: string      // mode libre
  variables?: Record<string, any>
  dossierId?: string
  langue?: 'AR' | 'FR'
  modeleContenu?: string    // contenu d'un ModeleDocument à adapter (optionnel)
}

export interface ResultatGeneration {
  titre: string
  contenu: string
  typeActe: string
  langue: 'AR' | 'FR'
  disclaimer: string
}

/**
 * Génère un document juridique.
 * - Si typeActe fourni → génération structurée selon le registre (+ variables + dossier).
 * - Si promptLibre fourni → génération libre encadrée par le system prompt.
 */
export async function genererDocument(params: GenererParams): Promise<ResultatGeneration | null> {
  const langue = params.langue ?? 'AR'
  const type = params.typeActe ? getTypeActe(params.typeActe) : undefined

  // Construire la demande utilisateur.
  let userPrompt = ''
  if (type) {
    const vars = params.variables ?? {}
    const lignesVars = type.variables
      .map((v) => `- ${v.label} (${v.cle}): ${vars[v.cle] ?? '[غير محدد]'}`)
      .join('\n')
    userPrompt = `حرّر «${type.titreAr}» بالاعتماد على المعطيات التالية:\n${lignesVars}`
    if (params.modeleContenu) {
      userPrompt += `\n\nاعتمد القالب التالي كأساس وكيّفه مع المعطيات:\n${limiterTexte([params.modeleContenu], 4000)}`
    }
  } else if (params.promptLibre) {
    userPrompt = `حرّر الوثيقة القانونية التالية حسب الطلب:\n${params.promptLibre}`
    if (params.variables && Object.keys(params.variables).length) {
      userPrompt += `\n\nمعطيات إضافية:\n${Object.entries(params.variables).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
    }
  } else {
    return null // ni type ni prompt libre
  }

  if (params.dossierId) {
    userPrompt += await contexteDossier(params.dossierId, params.userId)
  }

  // ─── STYLE DE L'AVOCAT (few-shot automatique) ───
  // Si l'avocat a importé un modèle du même type, on l'injecte comme exemple
  // de style + son résumé de style. Sinon : AUCUN changement (comportement normal).
  if (params.typeActe && params.typeActe !== 'LIBRE') {
    try {
      const modeleStyle = await trouverModeleStyle(params.userId, params.typeActe)
      if (modeleStyle) {
        if (modeleStyle.styleResume) {
          userPrompt += `\n\nأسلوب المحامي المطلوب احترامه:\n${modeleStyle.styleResume}`
        }
        userPrompt += `\n\nنموذج سابق للمحامي (احتذِ بأسلوبه وهيكلته، لكن استعمل المعطيات الجديدة أعلاه ولا تنسخ بياناته):\n${limiterTexte([modeleStyle.contenu], 3500)}`
      }
    } catch (err) {
      logger.warn('Récupération du style avocat échouée (ignorée):', err)
    }
  }

  try {
    const contenu = await askDeepseek<string>(systemePrompt(type, langue), userPrompt, {
      json: false,
      temperature: 0.3,        // factuel, peu créatif
      maxTokens: 4000,
    })
    const texte = (contenu || '').trim()
    if (!texte) return null

    return {
      titre: type?.titreAr ?? (langue === 'FR' ? 'Document juridique' : 'وثيقة قانونية'),
      contenu: `${texte}\n\n${DISCLAIMER_AR}`,
      typeActe: params.typeActe ?? 'LIBRE',
      langue,
      disclaimer: DISCLAIMER_AR,
    }
  } catch (err) {
    logger.error('Échec génération document:', err)
    return null
  }
}