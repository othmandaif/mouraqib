import { describe, it, expect } from 'vitest'
import { classifyWithRules } from '../arabicRulesClassifier'
import { TypeEvenement } from '@prisma/client'

describe('classifyWithRules — mentions de greffe arabes', () => {
  describe('Renvois', () => {
    it('reconnaît un renvoi simple', () => {
      const cas = ['تأخير', 'القضية مؤجلة', 'أُجلت القضية إلى جلسة قادمة', 'إرجاء النظر في القضية']
      cas.forEach((texte) => {
        const r = classifyWithRules(texte)
        expect(r?.typeEvenement, texte).toBe(TypeEvenement.RENVOI_SIMPLE)
        expect(r?.confiance).toBeGreaterThan(0.7)
      })
    })

    it('reconnaît un renvoi pour expertise', () => {
      const r = classifyWithRules('تأخير بسبب إجراء خبرة فنية')
      expect(r?.typeEvenement).toBe(TypeEvenement.RENVOI_EXPERT)
    })

    it('reconnaît un renvoi pour notification', () => {
      const r = classifyWithRules('تأجيل للتبليغ')
      expect(r?.typeEvenement).toBe(TypeEvenement.RENVOI_NOTIFICATION)
    })
  })

  describe('Décisions', () => {
    it('reconnaît une mise en délibéré', () => {
      const cas = ['حجز للمداولة', 'احتجاز للمداولة']
      cas.forEach((texte) => {
        const r = classifyWithRules(texte)
        expect(r?.typeEvenement, texte).toBe(TypeEvenement.MISE_EN_DELIBERE)
        expect(r?.confiance).toBeGreaterThanOrEqual(0.9)
      })
    })

    it('reconnaît un jugement rendu', () => {
      const cas = ['صدر الحكم الابتدائي', 'صدور الحكم', 'قضت المحكمة']
      cas.forEach((texte) => {
        const r = classifyWithRules(texte)
        expect(r?.typeEvenement, texte).toBe(TypeEvenement.JUGEMENT_RENDU)
      })
    })

    it('reconnaît une ordonnance', () => {
      const r = classifyWithRules('صدر الأمر الاستعجالي')
      expect(r?.typeEvenement).toBe(TypeEvenement.ORDONNANCE_RENDUE)
    })
  })

  describe('Notifications', () => {
    it('reconnaît une notification', () => {
      const r = classifyWithRules('تبليغ الحكم للأطراف')
      expect(r?.typeEvenement).toBe(TypeEvenement.NOTIFICATION_PARTIE)
    })

    it('reconnaît une signification', () => {
      const r = classifyWithRules('تبليغ للتنفيذ')
      expect(r?.typeEvenement).toBe(TypeEvenement.SIGNIFICATION)
    })
  })

  describe('Expertises', () => {
    it('reconnaît une expertise ordonnée', () => {
      const cas = ['ندب خبير', 'تعيين خبير فني', 'أمر بخبرة']
      cas.forEach((texte) => {
        const r = classifyWithRules(texte)
        expect(r?.typeEvenement, texte).toBe(TypeEvenement.EXPERTISE_ORDONNEE)
      })
    })

    it('reconnaît le dépôt d\'un rapport d\'expertise', () => {
      const r = classifyWithRules('إيداع تقرير الخبرة')
      expect(r?.typeEvenement).toBe(TypeEvenement.EXPERTISE_DEPOSEE)
    })
  })

  describe('Recours', () => {
    it('reconnaît un appel interjeté', () => {
      const r = classifyWithRules('تقديم استئناف ضد الحكم')
      expect(r?.typeEvenement).toBe(TypeEvenement.APPEL_INTERJET)
    })

    it('reconnaît un pourvoi en cassation', () => {
      const r = classifyWithRules('طعن بالنقض أمام محكمة النقض')
      expect(r?.typeEvenement).toBe(TypeEvenement.POURVOI_CASSATION)
    })
  })

  describe('Clôture', () => {
    it('reconnaît une radiation', () => {
      const r = classifyWithRules('شطب الملف من الجدول')
      expect(r?.typeEvenement).toBe(TypeEvenement.RADIATION)
    })

    it('reconnaît un désistement', () => {
      const r = classifyWithRules('تنازل عن الدعوى')
      expect(r?.typeEvenement).toBe(TypeEvenement.DESISTEMENT)
    })
  })

  describe('Cas limites', () => {
    it('retourne null pour un texte vide', () => {
      expect(classifyWithRules('')).toBeNull()
    })

    it('retourne null pour un texte non reconnu', () => {
      expect(classifyWithRules('نص عشوائي لا علاقة له بالإجراءات')).toBeNull()
    })

    it('préfère expertise sur renvoi simple quand expertise mentionnée', () => {
      const r = classifyWithRules('تأخير بسبب إحالة للخبير')
      expect(r?.typeEvenement).toBe(TypeEvenement.RENVOI_EXPERT)
    })
  })
})
