import { describe, it, expect } from 'vitest'
import { etatAbonnement, prolonger } from '../offres'

const J = 86_400_000
const now = new Date('2026-10-22T10:00:00Z')
const ab = (essai?: number, paye?: number) => ({
  essaiJusquAu: essai === undefined ? null : new Date(now.getTime() + essai * J),
  payeJusquAu: paye === undefined ? null : new Date(now.getTime() + paye * J),
  dateFin: null,
})

describe('etatAbonnement', () => {
  it('essai en cours', () => expect(etatAbonnement(ab(40), now).etat).toBe('ESSAI'))
  it('payé', () => expect(etatAbonnement(ab(-10, 60), now).etat).toBe('PAYE'))
  it('à renouveler à 7 jours', () => expect(etatAbonnement(ab(5), now).etat).toBe('A_RENOUVELER'))
  it('délai de grâce', () => expect(etatAbonnement(ab(-3), now).etat).toBe('GRACE'))
  it('expiré après 15 jours', () => expect(etatAbonnement(ab(-20), now).etat).toBe('EXPIRE'))
})

describe('prolonger', () => {
  it("part d'aujourd'hui si la couverture est passée", () => expect(prolonger(new Date('2026-01-01'), 1, now).toISOString().slice(0, 10)).toBe('2026-11-22'))
  it('31 janvier + 1 mois = 28 février (pas de débordement en mars)', () => expect(prolonger(new Date('2027-01-31T10:00:00Z'), 1, now).toISOString().slice(0, 10)).toBe('2027-02-28'))
  it('part de la fin actuelle si elle est future', () => expect(prolonger(new Date('2026-12-01T00:00:00Z'), 12, now).toISOString().slice(0, 10)).toBe('2027-12-01'))
})
