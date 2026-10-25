import { describe, it, expect, vi } from 'vitest'

const ask = vi.fn()
vi.mock('../deepseek', () => ({ askDeepseek: (...a: unknown[]) => ask(...a) }))
import { verifierReponse } from '../guardrailJuridique'

const longue = 'ج'.repeat(400)

describe('garde-fou juridique', () => {
  it('ne vérifie pas les réponses courtes', async () => {
    expect(await verifierReponse('س', 'جواب قصير', '')).toEqual({ ok: true })
    expect(ask).not.toHaveBeenCalled()
  })
  it('transmet un problème grave', async () => {
    ask.mockResolvedValueOnce({ ok: false, probleme: 'طلبات متناقضة' })
    expect(await verifierReponse('س', longue, '')).toEqual({ ok: false, probleme: 'طلبات متناقضة' })
  })
  it('laisse passer si le modèle est indisponible', async () => {
    ask.mockRejectedValueOnce(new Error('panne'))
    expect(await verifierReponse('س', longue, '')).toEqual({ ok: true })
  })
  it('laisse passer une réponse mal formée', async () => {
    ask.mockResolvedValueOnce('texte libre')
    expect(await verifierReponse('س', longue, '')).toEqual({ ok: true })
  })
})
