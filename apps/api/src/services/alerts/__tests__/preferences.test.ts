import { describe, it, expect } from 'vitest'
import { lirePreferences, enHeuresCalmes, numeroCourt, PREFERENCES_DEFAUT } from '../preferences'
import { campPour, delaiApplicable } from '../../deadlines/delaiRules'

describe('préférences d’alertes', () => {
  it('complète les champs manquants et verrouille le délai 48 h', () => {
    const p = lirePreferences({ matrice: { delai48h: { whatsapp: false, app: false } }, digestHeure: '08:30' })
    expect(p.digestHeure).toBe('08:30')
    expect(p.matrice.delai48h).toEqual({ whatsapp: true, app: true })
    expect(p.matrice.surveiller).toEqual(PREFERENCES_DEFAUT.matrice.surveiller)
  })
  it('rejette une valeur invalide → défaut', () => {
    expect(lirePreferences({ digestHeure: '25:00' }).digestHeure).toBe('07:00')
  })
  it('gère une plage calme qui passe minuit', () => {
    const p = { ...PREFERENCES_DEFAUT, calmeDebut: '21:00', calmeFin: '07:00' }
    expect(enHeuresCalmes(p, new Date('2026-10-21T22:30:00Z'))).toBe(true)  // 23:30 au Maroc
    expect(enHeuresCalmes(p, new Date('2026-10-21T11:00:00Z'))).toBe(false) // 12:00 au Maroc
  })
  it('n’expose que la fin du numéro', () => {
    expect(numeroCourt('2026/1801/77')).toBe('…/1801/77')
  })
})

describe('agir ou surveiller', () => {
  it('opposition : délai de l’adversaire si le client est demandeur', () => {
    expect(campPour('OPPOSITION', 'DEMANDEUR')).toBe('SURVEILLER')
    expect(campPour('OPPOSITION', 'DEFENDEUR')).toBe('AGIR')
    expect(campPour('APPEL', 'DEMANDEUR')).toBe('AGIR')
  })
  it('pas d’opposition contre un jugement contradictoire', () => {
    expect(delaiApplicable('OPPOSITION', 'CONTRADICTOIRE')).toBe(false)
    expect(delaiApplicable('OPPOSITION', 'DEFAUT')).toBe(true)
    expect(delaiApplicable('APPEL', 'CONTRADICTOIRE')).toBe(true)
  })
})
