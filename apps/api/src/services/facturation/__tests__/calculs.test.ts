import { describe, it, expect } from 'vitest'
import { calculerTotaux, etatPaiement, formaterNumero, lignesAvoir, solde, totalLigne, versCentimes } from '../calculs'

describe('calculs de facturation', () => {
  it('totalise les lignes et arrondit la TVA une seule fois', () => {
    const t = calculerTotaux([
      { designation: 'أتعاب', quantite: 1, prixUnitaireCentimes: 500000 },
      { designation: 'مصاريف', quantite: 3, prixUnitaireCentimes: 3333 },
    ], 10)
    expect(t.totalHtCentimes).toBe(509999)
    expect(t.tvaCentimes).toBe(51000) // 50999,9 arrondi
    expect(t.totalTtcCentimes).toBe(560999)
  })

  it('accepte une quantité décimale (heures)', () => {
    expect(totalLigne({ designation: 'h', quantite: 1.5, prixUnitaireCentimes: 33333 })).toBe(50000)
  })

  it('TVA à 0 %', () => {
    expect(calculerTotaux([{ designation: 'x', quantite: 2, prixUnitaireCentimes: 1000 }], 0)).toEqual({ totalHtCentimes: 2000, tvaCentimes: 0, totalTtcCentimes: 2000 })
  })

  it('avoir : totaux opposés à la facture', () => {
    const lignes = [{ designation: 'أتعاب', quantite: 1, prixUnitaireCentimes: 120000 }]
    const f = calculerTotaux(lignes, 20)
    const a = calculerTotaux(lignesAvoir(lignes), 20)
    expect(a.totalTtcCentimes).toBe(-f.totalTtcCentimes)
  })

  it('numéro sur 4 chiffres', () => {
    expect(formaterNumero(2026, 7)).toBe('2026-0007')
    expect(formaterNumero(2026, 12345)).toBe('2026-12345')
  })

  it('état de paiement', () => {
    expect(etatPaiement(1000, 0)).toBe('NON_PAYEE')
    expect(etatPaiement(1000, 400)).toBe('PARTIELLE')
    expect(etatPaiement(1000, 1000)).toBe('PAYEE')
    expect(etatPaiement(-1000, 0)).toBe('PAYEE')
  })

  it('solde avec et sans honoraires convenus', () => {
    expect(solde(5000, 2000)).toEqual({ factureCentimes: 5000, regleCentimes: 2000, resteCentimes: 3000, resteSurConvenuCentimes: null })
    expect(solde(0, 2000, 10000).resteSurConvenuCentimes).toBe(8000)
  })

  it('lit les montants saisis', () => {
    expect(versCentimes('1 500,50')).toBe(150050)
    expect(versCentimes(1500.5)).toBe(150050)
    expect(versCentimes('12.345')).toBeNull()
    expect(versCentimes('abc')).toBeNull()
  })
})
