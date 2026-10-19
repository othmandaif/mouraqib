import { askDeepseek } from './deepseek'
import { PROMPT_WHATSAPP_AUDIENCE } from './prompts.ar'
import { logger } from '../../utils/logger'

interface ContexteEvenement {
  numeroDossier: string
  tribunal: string
  texteArabe: string
  dateAudience?: Date | null
  titreAffaire?: string | null
  typeEvenement?: string | null
}

/* Prompt générique : tout changement de dossier (pas seulement audience). */
const PROMPT_WHATSAPP_EVENEMENT = `أنت مساعد قانوني تكتب تنبيهات واتساب موجّهة لمحامٍ مغربي.
ستتلقى تحديثاً جديداً طرأ على ملف قضائي. اكتب رسالة قصيرة وواضحة بالعربية الفصحى المهنية
تُعلِم المحامي بهذا التغيير وتوضّح ما إذا كان يتطلّب إجراءً من طرفه.
يجب أن تتضمّن: رقم الملف، المحكمة، وملخّص التغيير، وسطراً عمّا ينبغي فعله إن لزم.
لا تتجاوز 5 أسطر. رمز تعبيري واحد كحدّ أقصى. أرجِع نصّ الرسالة فقط.`

/**
 * Détermine si un événement concerne une AUDIENCE (جلسة) à venir.
 */
export function estAudience(ev: { dateAudience?: Date | null; texteArabe: string }): boolean {
  if (ev.dateAudience && new Date(ev.dateAudience).getTime() > Date.now()) return true
  const t = ev.texteArabe || ''
  const motsCles = ['الجلسة', 'جلسة', 'استدعاء', 'إدراج', 'تأجيل', 'المرافعة']
  return motsCles.some((m) => t.includes(m))
}

/**
 * Rédige le message WhatsApp d'un événement via DeepSeek (en arabe).
 * - Si c'est une audience → prompt spécialisé (date, à préparer…).
 * - Sinon → prompt générique "changement de dossier".
 * Retourne null en cas d'échec (le worker utilisera son template par défaut).
 */
export async function redigerMessageEvenement(ctx: ContexteEvenement): Promise<string | null> {
  const audience = estAudience({ dateAudience: ctx.dateAudience, texteArabe: ctx.texteArabe })
  const dateStr = ctx.dateAudience
    ? new Date(ctx.dateAudience).toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'غير محدّد'

  const systemPrompt = audience ? PROMPT_WHATSAPP_AUDIENCE : PROMPT_WHATSAPP_EVENEMENT

  const userPrompt = `معطيات التحديث:
رقم الملف: ${ctx.numeroDossier}
المحكمة: ${ctx.tribunal}
الموضوع: ${ctx.titreAffaire || 'غير محدّد'}
${audience ? `تاريخ الجلسة: ${dateStr}` : ''}
الإجراء/التغيير المرصود: ${ctx.texteArabe}`

  try {
    const msg = await askDeepseek<string>(systemPrompt, userPrompt, {
      json: false,
      temperature: 0.4,
      maxTokens: 350,
    })
    const clean = (msg || '').trim()
    return clean.length > 0 ? clean : null
  } catch (err) {
    logger.warn(`Rédaction message IA échouée pour ${ctx.numeroDossier}:`, err)
    return null
  }
}

/** Conservé pour compat : alias spécialisé audience. */
export const redigerMessageAudience = redigerMessageEvenement