import { describe, it, expect } from 'vitest'
import { nomsProches, normaliserArabe } from '../texteArabe'

describe('noms proches (conflits d’intérêts)', () => {
  it('ignore hamza, ta marbuta et titres', () => {
    expect(normaliserArabe('أحمد  إدريسي')).toBe('احمد ادريسي')
    expect(nomsProches('شركة الأطلس للتوزيع', 'الاطلس للتوزيع')).toBe(true)
    expect(nomsProches('محمد العلوي', 'السيد محمد بن أحمد العلوي')).toBe(true)
  })
  it('ne confond pas deux personnes différentes', () => {
    expect(nomsProches('محمد العلوي', 'محمد الإدريسي')).toBe(false)
    expect(nomsProches('', 'محمد')).toBe(false)
  })
})
