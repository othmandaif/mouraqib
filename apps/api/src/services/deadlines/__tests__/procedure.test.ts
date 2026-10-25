import { describe, it, expect, vi } from 'vitest'
vi.mock('../../../utils/prisma', () => ({ prisma: {} }))
import { procedurePour } from '../deadlineService'

describe('procedurePour (référé)', () => {
  it("un jugement en référé sur un dossier encore « civil » prend les délais du référé", () => {
    expect(procedurePour('حكم في الأمور المستعجلة', { typeProcedure: 'CIVILE' as never })).toBe('REFERE')
  })
  it("l'objet du dossier suffit aussi", () => {
    expect(procedurePour('صدر الحكم', { typeProcedure: 'CIVILE' as never, titreAffaire: 'طلب استعجالي' })).toBe('REFERE')
  })
  it('sinon la procédure du dossier est gardée', () => {
    expect(procedurePour('صدر الحكم', { typeProcedure: 'COMMERCIALE' as never })).toBe('COMMERCIALE')
  })
})
