import { describe, it, expect } from 'vitest'
import { actesSuggeres, type DonneesPack } from '../packDossier'

const base: DonneesPack = {
  estCourAppel: false, typeProcedure: 'CIVILE', roleClient: 'DEMANDEUR', numeroDossier: '2026/1201/55', tribunalAr: 'المحكمة الابتدائية بالدار البيضاء',
  nomClient: 'شركة الأطلس', nomAdversaire: 'محمد العلوي', objet: 'أداء', nbEvenements: 0, jugement: null,
}

describe('actes suggérés selon l’étape', () => {
  it('début de dossier, client demandeur : requête introductive pré-remplie', () => {
    const a = actesSuggeres(base)
    expect(a.map((x) => x.typeActe)).toEqual(['REQUETE_INTRODUCTIVE'])
    expect(a[0].variables).toMatchObject({ demandeur: 'شركة الأطلس', defendeur: 'محمد العلوي', tribunal: base.tribunalAr })
  })
  it('client défendeur : mémoire en réponse', () => {
    expect(actesSuggeres({ ...base, roleClient: 'DEFENDEUR', nbEvenements: 3 }).map((x) => x.typeActe)).toEqual(['MEMOIRE_DEFENSE'])
  })
  it('demandeur en cours : mémoire en réplique', () => {
    expect(actesSuggeres({ ...base, nbEvenements: 4 }).map((x) => x.typeActe)).toEqual(['MEMOIRE_TAAQIB'])
  })
  it('jugement de première instance : appel puis notification et exécution', () => {
    const a = actesSuggeres({ ...base, nbEvenements: 6, jugement: { texte: 'حكمت المحكمة بأداء', date: new Date('2026-10-01T10:00:00Z') } })
    expect(a.map((x) => x.typeActe)).toEqual(['REQUETE_APPEL', 'DEMANDE_NOTIFICATION', 'DEMANDE_COPIE_EXECUTOIRE', 'DEMANDE_EXECUTION'])
    expect(a[0].variables.jugement).toContain('01/10/2026')
  })
  it('arrêt d’appel : cassation et non appel', () => {
    const a = actesSuggeres({ ...base, estCourAppel: true, jugement: { texte: 'قرار', date: new Date() } })
    expect(a[0].typeActe).toBe('REQUETE_CASSATION')
    expect(a.some((x) => x.typeActe === 'REQUETE_APPEL')).toBe(false)
  })
  it('référé', () => {
    expect(actesSuggeres({ ...base, typeProcedure: 'REFERE' })[0].typeActe).toBe('REFERE')
  })
  it('ne garde pas les champs vides', () => {
    const a = actesSuggeres({ ...base, nomAdversaire: '' })
    expect(a[0].variables).not.toHaveProperty('defendeur')
  })
})
