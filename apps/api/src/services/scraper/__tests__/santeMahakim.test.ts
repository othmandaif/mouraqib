import { describe, it, expect, vi } from 'vitest'
vi.mock('../../../jobs/queues', () => ({ redisConnection: {} }))
import { dureeAttente, cleSync } from '../santeMahakim'

describe('attente après échec de synchronisation', () => {
  it('double à chaque échec à partir de 30 min', () => {
    expect(dureeAttente(1)).toBe(30 * 60_000)
    expect(dureeAttente(2)).toBe(60 * 60_000)
    expect(dureeAttente(3)).toBe(120 * 60_000)
  })
  it('est plafonnée à 24 h', () => {
    expect(dureeAttente(10)).toBe(24 * 3_600_000)
    expect(dureeAttente(50)).toBe(24 * 3_600_000)
  })
  it('même dossier = même clé, quel que soit l’avocat ; tribunal différent = autre clé', () => {
    expect(cleSync('2026/1201/55', 'TPI_RABAT')).toBe(cleSync('2026/1201/55', 'TPI_RABAT'))
    expect(cleSync('2026/1201/55', 'TPI_RABAT')).not.toBe(cleSync('2026/1201/55', 'TPI_SALE'))
  })
})
