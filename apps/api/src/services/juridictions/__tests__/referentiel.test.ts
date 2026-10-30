import { describe, it, expect, vi } from 'vitest'
// Le module du robot charge la base, Redis et les verrous : inutiles ici
vi.mock('../../../utils/prisma', () => ({ prisma: {} }))
vi.mock('../../../jobs/queues', () => ({ redisConnection: {} }))
import { typeDuCode, juridictionsPour, libellesMahakim, cleArabe } from '../referentiel'
import { resolveTribunalNames } from '../../scraper/mahakimScraper'

describe('référentiel des juridictions mahakim', () => {
  it('déduit le type du code comme mahakim', () => {
    expect(typeDuCode('1201')).toBe('ordinaire')
    expect(typeDuCode('1626')).toBe('famille')
    expect(typeDuCode('2101')).toBe('penal')
    expect(typeDuCode('8210')).toBe('commerce')
    expect(typeDuCode('7101')).toBe('administratif')
  })

  it('code commercial : seulement les cours de commerce', () => {
    const { cours } = juridictionsPour('8210')
    expect(cours.length).toBe(5)
    expect(cours.every((c) => c.nom.includes('التجارية'))).toBe(true)
  })

  it('dossier 2026/8210/283 : Marrakech commerce + Béni Mellal (cas réel signalé)', () => {
    expect(libellesMahakim('8210', 'محكمة الإستئناف التجارية بمراكش', 'المحكمة التجارية بني ملال')).toEqual({
      courAppel: 'محكمة الإستئناف التجارية بمراكش', tribunalPrimaire: 'المحكمة التجارية ببني ملال',
    })
  })

  it('refuse une juridiction ordinaire pour un code commercial', () => {
    expect(libellesMahakim('8210', 'محكمة الاستئناف بمراكش', 'المحكمة الابتدائية بمراكش')).toBeNull()
  })

  it('tolère hamza et espaces, et rend le libellé exact de mahakim', () => {
    expect(cleArabe('محكمة الإستئناف')).toBe(cleArabe('محكمة  الاستئناف'))
    expect(libellesMahakim('1201', 'محكمة الاستئناف بالرباط')).toEqual({ courAppel: 'محكمة الاستئناف بالرباط' })
  })

  it('libellé pénal différent du civil pour le même tribunal', () => {
    expect(libellesMahakim('2101', '', 'المحكمة الإبتدائية بسوق السبت أولاد النمة')?.tribunalPrimaire)
      .toBe('المحكمة الإبتدائية سوق السبت أولاد النمة')
  })

  it("ancien dossier de Taroudant : la cour d'appel est recalée (n'est plus Agadir)", () => {
    expect(resolveTribunalNames('TPI_TAROUDANT', '1201')).toEqual({
      courAppel: 'محكمة الاستئناف بتارودانت', tribunalPrimaire: 'المحكمة الابتدائية بتارودانت',
    })
  })

  it('nouveau dossier enregistré par libellé de tribunal', () => {
    expect(resolveTribunalNames('المحكمة التجارية ببني ملال', '8210')).toEqual({
      courAppel: 'محكمة الإستئناف التجارية بمراكش', tribunalPrimaire: 'المحكمة التجارية ببني ملال',
    })
  })
})
