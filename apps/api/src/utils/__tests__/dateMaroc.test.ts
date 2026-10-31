import { describe, it, expect } from 'vitest'
import { finDeDelai, joursCalendaires, dernierJourOuvrable, estJourNonOuvrable, finDeJourMaroc, instantMaroc } from '../dateMaroc'

describe('dateMaroc', () => {
  it("le délai court jusqu'à 23:59:59 heure du Maroc du dernier jour (UTC+1)", () => {
    const fin = finDeDelai(new Date('2024-01-15T00:00:00Z'), 30)
    expect(fin.toISOString()).toBe('2024-02-14T22:59:59.000Z')
  })

  it('pendant Ramadan (UTC+0) aussi', () => {
    const fin = finDeDelai(new Date('2024-03-10T09:00:00Z'), 10)
    expect(fin.toISOString()).toBe('2024-03-20T23:59:59.000Z')
  })

  it('un jugement publié tard le soir compte sur le jour marocain', () => {
    // 23:30 UTC le 9 = 00:30 le 10 au Maroc → départ le 10
    const fin = finDeDelai(new Date('2026-10-09T23:30:00Z'), 10)
    expect(fin.toISOString()).toBe('2026-10-20T22:59:59.000Z')
  })

  it("le dernier jour n'est pas « expiré » le matin même", () => {
    const limite = finDeJourMaroc(new Date('2026-10-20T10:00:00Z'))
    const matin = new Date('2026-10-20T07:00:00Z')
    expect(limite > matin).toBe(true)
    expect(joursCalendaires(limite, matin)).toBe(0)
    expect(joursCalendaires(limite, new Date('2026-10-18T21:00:00Z'))).toBe(2)
    expect(joursCalendaires(limite, new Date('2026-10-21T08:00:00Z'))).toBe(-1)
  })

  it('jours non ouvrables : week-end et fêtes fixes', () => {
    expect(estJourNonOuvrable(new Date('2026-10-24T10:00:00Z'))).toBe(true) // samedi
    expect(estJourNonOuvrable(new Date('2026-11-18T10:00:00Z'))).toBe(true) // fête de l'indépendance
    expect(estJourNonOuvrable(new Date('2026-10-22T10:00:00Z'))).toBe(false) // jeudi
  })

  it('rappel ramené au vendredi si le dernier jour est un dimanche', () => {
    const d = dernierJourOuvrable(new Date('2026-10-25T12:00:00Z')) // dimanche
    expect(joursCalendaires(d, new Date('2026-10-23T08:00:00Z'))).toBe(0) // vendredi 23
  })

  it("heure d'audience lue sur mahakim : 10:30 au Maroc = 09:30 UTC (pas de décalage d'1 h)", () => {
    expect(instantMaroc(2026, 10, 22, 10, 30).toISOString()).toBe('2026-10-22T09:30:00.000Z')
  })
})
