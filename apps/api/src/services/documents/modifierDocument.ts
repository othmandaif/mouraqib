import { askDeepseek, limiterTexte } from '../ai/deepseek'
import { logger } from '../../utils/logger'

const DISCLAIMER_AR = '⚠️ هذه وثيقة مُولّدة آلياً كمسوّدة استرشادية فقط. يجب على المحامي مراجعتها وتدقيقها قانونياً قبل أي استعمال أو توقيع. لا تُغني عن المسؤولية المهنية.'

const SYSTEME_MODIF = `أنت محرّر قانوني خبير في القانون المغربي. ستتلقى وثيقة قانونية موجودة وطلب تعديل من المحامي.
مهمتك: تطبيق التعديل المطلوب فقط، مع الحفاظ على باقي الوثيقة كما هي تماماً (لا تُعد صياغة ما لم يُطلب).
قواعد صارمة:
- طبّق التعديل المطلوب بدقة ولا تغيّر الأجزاء الأخرى.
- حافظ على نفس الأسلوب والهيكلة والترقيم.
- لا تخترع معطيات؛ إن كان التعديل يتطلب معلومة ناقصة، أدرج [يُستكمل: ...].
- لا تستعمل Markdown (لا ** ولا #).
- أرجِع الوثيقة الكاملة بعد التعديل فقط، دون شرح أو تعليق.`

interface ModifierParams {
  contenuActuel: string
  instruction: string      // ce que l'avocat demande de changer
  langue?: 'AR' | 'FR'
}

/**
 * Modifie un document selon une instruction en langage naturel.
 * Retourne le document COMPLET modifié (pas un diff), ou null si échec.
 */
export async function modifierDocument(params: ModifierParams): Promise<string | null> {
  // On retire le disclaimer avant modif (on le remettra à la fin).
  const sansDisclaimer = params.contenuActuel.replace(DISCLAIMER_AR, '').trim()

  const userPrompt = `الوثيقة الحالية:
${limiterTexte([sansDisclaimer], 7000)}

طلب التعديل من المحامي:
${params.instruction}

أرجِع الوثيقة كاملةً بعد تطبيق هذا التعديل فقط.`

  try {
    const res = await askDeepseek<string>(SYSTEME_MODIF, userPrompt, {
      json: false,
      temperature: 0.2,    // très factuel : on ne veut pas de créativité
      maxTokens: 4000,
    })
    const texte = (res || '').trim()
    if (!texte) return null
    return `${texte}\n\n${DISCLAIMER_AR}`
  } catch (err) {
    logger.error('Échec modification document:', err)
    return null
  }
}