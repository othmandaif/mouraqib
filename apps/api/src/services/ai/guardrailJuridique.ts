import { askDeepseek } from './deepseek'
import { logger } from '../../utils/logger'

/**
 * Garde-fou juridique : relit la réponse de l'assistant et signale une erreur GRAVE
 * (demandes contradictoires, article d'un texte abrogé collé à une loi récente, délai ou
 * chiffre affirmé sans source, requalification ignorée, conclusion contraire aux sources).
 * En cas de doute ou de panne : on laisse passer (la réponse a déjà été affichée).
 */
const SYSTEME = `أنت مراجع قانوني مغربي صارم. تراجع جواب مساعد قانوني قبل أن يعتمده المحامي.
ابحث فقط عن الأخطاء الجسيمة:
1) طلبات متناقضة في نفس المقال أو الاستراتيجية (مثلاً تعويض عقد محدد المدة وتعويض فصل تعسفي عن عقد غير محدد المدة معاً، دون أصلياً/احتياطياً).
2) خلط بين نص منسوخ ونص جديد (رقم فصل من قانون قديم منسوب لقانون حديث).
3) أجل أو مبلغ أو رقم فصل مؤكَّد دون أن يرد في المصادر المقدَّمة، وقُدِّم كأنه يقين.
4) استنتاج يناقض المصادر المقدَّمة.
5) تجاهل واضح لإعادة تكييف الوقائع (مثلاً تجديد عقد محدد المدة يجعله غير محدد المدة).
لا تعتبر خطأً: الأسلوب، الاختصار، أو قول "من حيث المبدأ" عند غياب نص.
أجب بصيغة JSON فقط: {"ok": true} أو {"ok": false, "probleme": "وصف قصير ودقيق للخطأ وكيف يُصحَّح"}`

export interface Verdict { ok: boolean; probleme?: string }

export async function verifierReponse(question: string, reponse: string, sources: string): Promise<Verdict> {
  if (reponse.length < 300) return { ok: true } // réponses courtes : pas de vérification
  try {
    const v = await askDeepseek<Verdict>(
      SYSTEME,
      `سؤال المحامي:\n${question.slice(0, 2000)}\n\nالمصادر المقدَّمة للمساعد:\n${sources.slice(0, 6000) || '(لا توجد)'}\n\nجواب المساعد:\n${reponse.slice(0, 8000)}`,
      { json: true, temperature: 0, maxTokens: 250, timeoutMs: 15_000, tentatives: 1 }, // relecture : jamais plus de 15 s
    )
    return v && typeof v.ok === 'boolean' ? v : { ok: true }
  } catch (e) {
    logger.warn('Garde-fou juridique indisponible:', e)
    return { ok: true }
  }
}

/** Consigne ajoutée pour réécrire la réponse en corrigeant le problème signalé. */
export function consigneCorrection(probleme: string): string {
  return `راجع جوابك السابق وصحّحه. المشكلة التي رصدها المراجع: ${probleme}
أعد كتابة الجواب كاملاً ومصحَّحاً، بنفس اللغة والبنية والإيجاز، مع التوثيق بالمصادر، ودون الإشارة إلى أنه تصحيح.`
}
