import { describe, it, expect } from 'vitest'
import { calculerDelais } from '../delaiRules'
import { TypeEvenement, TypeProcedure, TypeDelai } from '@prisma/client'

const dateRef = new Date('2024-01-15')

describe('calculerDelais — CPC marocain', () => {
  describe('JUGEMENT_RENDU (procédure ordinaire)', () => {
    it('génère délai d\'appel de 30 jours', () => {
      const delais = calculerDelais(TypeEvenement.JUGEMENT_RENDU, TypeProcedure.CIVILE, dateRef)
      const appel = delais.find((d) => d.typeDelai === TypeDelai.APPEL)
      expect(appel).toBeDefined()
      expect(appel!.dateLimite.toISOString().startsWith('2024-02-14')).toBe(true)
    })

    it('génère délai d\'opposition de 10 jours', () => {
      const delais = calculerDelais(TypeEvenement.JUGEMENT_RENDU, TypeProcedure.CIVILE, dateRef)
      const opp = delais.find((d) => d.typeDelai === TypeDelai.OPPOSITION)
      expect(opp).toBeDefined()
      expect(opp!.dateLimite.toISOString().startsWith('2024-01-25')).toBe(true)
    })
  })

  describe('JUGEMENT_RENDU (référé)', () => {
    it('génère délai d\'appel de 15 jours en référé', () => {
      const delais = calculerDelais(TypeEvenement.JUGEMENT_RENDU, TypeProcedure.REFERE, dateRef)
      const appel = delais.find((d) => d.typeDelai === TypeDelai.APPEL)
      expect(appel).toBeDefined()
      expect(appel!.dateLimite.toISOString().startsWith('2024-01-30')).toBe(true)
    })
  })

  describe('NOTIFICATION_PARTIE', () => {
    it('génère délai d\'appel de 30 jours', () => {
      const delais = calculerDelais(TypeEvenement.NOTIFICATION_PARTIE, TypeProcedure.CIVILE, dateRef)
      expect(delais).toHaveLength(1)
      expect(delais[0].typeDelai).toBe(TypeDelai.APPEL)
    })
  })

  describe('APPEL_INTERJET', () => {
    it('génère délai de cassation de 30 jours', () => {
      const delais = calculerDelais(TypeEvenement.APPEL_INTERJET, TypeProcedure.CIVILE, dateRef)
      expect(delais[0].typeDelai).toBe(TypeDelai.CASSATION)
    })
  })

  describe('ORDONNANCE_RENDUE', () => {
    it('génère délai d\'appel de 15 jours', () => {
      const delais = calculerDelais(TypeEvenement.ORDONNANCE_RENDUE, TypeProcedure.CIVILE, dateRef)
      const appel = delais.find((d) => d.typeDelai === TypeDelai.APPEL)
      expect(appel).toBeDefined()
      expect(appel!.dateLimite.toISOString().startsWith('2024-01-30')).toBe(true)
    })
  })

  describe('Cas sans délais', () => {
    it('retourne tableau vide pour RENVOI_SIMPLE', () => {
      const delais = calculerDelais(TypeEvenement.RENVOI_SIMPLE, TypeProcedure.CIVILE, dateRef)
      expect(delais).toHaveLength(0)
    })

    it('retourne tableau vide pour AUTRE', () => {
      const delais = calculerDelais(TypeEvenement.AUTRE, TypeProcedure.CIVILE, dateRef)
      expect(delais).toHaveLength(0)
    })
  })

  describe('estCritique', () => {
    it('marque critique si date passée dans < critiqueSousJours', () => {
      const dateProche = new Date(Date.now() + 2 * 86_400_000)
      const delais = calculerDelais(TypeEvenement.JUGEMENT_RENDU, TypeProcedure.CIVILE, new Date(dateProche.getTime() - 10 * 86_400_000))
      const opp = delais.find((d) => d.typeDelai === TypeDelai.OPPOSITION)
      expect(opp?.estCritique).toBe(true)
    })
  })
})
