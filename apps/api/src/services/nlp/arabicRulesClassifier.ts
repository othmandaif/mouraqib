import { TypeEvenement } from '@prisma/client'

export interface ClassificationResult {
  typeEvenement: TypeEvenement
  sousType?: string
  confiance: number
  methode: 'REGEX' | 'LLM' | 'FALLBACK'
}

// Patterns du plus spécifique au plus général pour éviter les faux positifs
const PATTERNS: Array<{
  pattern: RegExp
  type: TypeEvenement
  sousType?: string
  confiance: number
}> = [
  // ── Expertises (avant renvoi pour éviter faux positifs) ──────────────────
  { pattern: /تأخير.*خبرة|إحالة.*خبير|خبرة.*فنية|رُجئت.*خبرة/i,      type: TypeEvenement.RENVOI_EXPERT,       confiance: 0.92 },
  { pattern: /ندب.*خبير|تعيين.*خبير|خبرة.*مأمور بها|أمر.*بخبرة/i,     type: TypeEvenement.EXPERTISE_ORDONNEE,  confiance: 0.90 },
  { pattern: /إيداع.*تقرير.*الخبرة|تقرير.*الخبير.*مودع|أودع.*الخبير/i, type: TypeEvenement.EXPERTISE_DEPOSEE,   confiance: 0.90 },

  // ── Notifications (avant renvoi) ─────────────────────────────────────────
  { pattern: /تبليغ.*الحكم|إعلام.*بالحكم|تبليغ.*بالمقرر/i,             type: TypeEvenement.NOTIFICATION_PARTIE, sousType: 'NOTIFICATION_JUGEMENT', confiance: 0.92 },
  { pattern: /تبليغ|إعلام|إخطار|تنفيذ.*التبليغ/i,                       type: TypeEvenement.NOTIFICATION_PARTIE, confiance: 0.85 },
  { pattern: /تبليغ.*للتنفيذ|تنفيذ.*الحكم/i,                            type: TypeEvenement.SIGNIFICATION,       confiance: 0.88 },

  // ── Renvois ──────────────────────────────────────────────────────────────
  { pattern: /تأجيل.*للتبليغ|تأخير.*للإعلام|رُجئت.*للتبليغ/i,          type: TypeEvenement.RENVOI_NOTIFICATION, confiance: 0.90 },
  { pattern: /تأخير|تأجيل|إرجاء|رُجئت|أُجلت|مؤجلة/i,                   type: TypeEvenement.RENVOI_SIMPLE,       confiance: 0.88 },

  // ── Délibéré & Jugements ─────────────────────────────────────────────────
  { pattern: /حجز للمداولة|احتجاز للمداولة|للمداولة/i,                   type: TypeEvenement.MISE_EN_DELIBERE,    confiance: 0.95 },
  { pattern: /صدر الحكم|صدور الحكم|حكم بتاريخ|قضت المحكمة|حكم ابتدائي/i, type: TypeEvenement.JUGEMENT_RENDU,    confiance: 0.95 },
  { pattern: /صدر الأمر|أمر قضائي|أمر استعجالي/i,                        type: TypeEvenement.ORDONNANCE_RENDUE,  confiance: 0.90 },

  // ── Inscriptions ─────────────────────────────────────────────────────────
  { pattern: /إدراج|أُدرج|تسجيل.*الجلسة|إدراج في الجدول/i,              type: TypeEvenement.INSCRIPTION_ROLE,   confiance: 0.88 },
  { pattern: /وضع في حالة.*استعداد|mise en état/i,                       type: TypeEvenement.MISE_EN_ETAT,        confiance: 0.85 },

  // ── Recours ──────────────────────────────────────────────────────────────
  { pattern: /استئناف|طعن.*استئناف|محكمة الاستئناف/i,                    type: TypeEvenement.APPEL_INTERJET,     confiance: 0.93 },
  { pattern: /نقض|طعن.*بالنقض|محكمة النقض/i,                             type: TypeEvenement.POURVOI_CASSATION,  confiance: 0.93 },

  // ── Clôture ──────────────────────────────────────────────────────────────
  { pattern: /شطب|محو|طرح.*القضية|شطب.*الملف/i,                          type: TypeEvenement.RADIATION,          confiance: 0.88 },
  { pattern: /سقوط.*الدعوى|انقضاء.*الدعوى|سقط.*الحق/i,                  type: TypeEvenement.PEREMPTION,         confiance: 0.88 },
  { pattern: /تنازل|تخلٍّ.*عن|سحب.*الدعوى|تخلى/i,                       type: TypeEvenement.DESISTEMENT,        confiance: 0.88 },
]

export function classifyWithRules(texteArabe: string): ClassificationResult | null {
  for (const { pattern, type, sousType, confiance } of PATTERNS) {
    if (pattern.test(texteArabe)) {
      return { typeEvenement: type, sousType, confiance, methode: 'REGEX' }
    }
  }
  return null
}
