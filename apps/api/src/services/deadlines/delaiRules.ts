import { TypeEvenement, TypeProcedure, TypeDelai } from '@prisma/client'

export interface RegleDelai {
  typeDelai: TypeDelai
  description: string
  descriptionAr: string
  dureeJours: number
  critiqueSousJours: number
  pointDeDepart: 'DATE_AUDIENCE' | 'DATE_PUBLICATION' | 'DATE_NOTIFICATION'
}

export interface DelaiCalcule {
  typeDelai: TypeDelai
  description: string
  descriptionAr: string
  dateLimite: Date
  estCritique: boolean
}

// Délais selon le Code de Procédure Civile marocain (Dahir 1974)
// ⚠️ Faire valider par un avocat marocain avant mise en production
const REGLES: Partial<Record<TypeEvenement, RegleDelai[]>> = {
  [TypeEvenement.JUGEMENT_RENDU]: [
    {
      typeDelai: TypeDelai.APPEL,
      description: "Délai d'appel — 30 jours à compter de la notification",
      descriptionAr: 'أجل الاستئناف - 30 يوماً من تاريخ التبليغ',
      dureeJours: 30,
      critiqueSousJours: 7,
      pointDeDepart: 'DATE_NOTIFICATION',
    },
    {
      typeDelai: TypeDelai.OPPOSITION,
      description: "Délai d'opposition (jugement par défaut) — 10 jours",
      descriptionAr: 'أجل التعرض - 10 أيام من تاريخ التبليغ',
      dureeJours: 10,
      critiqueSousJours: 3,
      pointDeDepart: 'DATE_NOTIFICATION',
    },
  ],

  [TypeEvenement.NOTIFICATION_PARTIE]: [
    {
      typeDelai: TypeDelai.APPEL,
      description: "Délai d'appel — 30 jours à compter de la notification",
      descriptionAr: 'أجل الاستئناف - 30 يوماً من تاريخ التبليغ',
      dureeJours: 30,
      critiqueSousJours: 7,
      pointDeDepart: 'DATE_NOTIFICATION',
    },
  ],

  [TypeEvenement.APPEL_INTERJET]: [
    {
      typeDelai: TypeDelai.CASSATION,
      description: 'Délai de pourvoi en cassation — 30 jours',
      descriptionAr: 'أجل الطعن بالنقض - 30 يوماً',
      dureeJours: 30,
      critiqueSousJours: 7,
      pointDeDepart: 'DATE_NOTIFICATION',
    },
  ],

  [TypeEvenement.ORDONNANCE_RENDUE]: [
    {
      typeDelai: TypeDelai.APPEL,
      description: "Délai d'appel ordonnance de référé — 15 jours",
      descriptionAr: 'أجل الاستئناف في المستعجلات - 15 يوماً',
      dureeJours: 15,
      critiqueSousJours: 4,
      pointDeDepart: 'DATE_NOTIFICATION',
    },
  ],

  [TypeEvenement.MISE_EN_DELIBERE]: [
    {
      typeDelai: TypeDelai.AUTRE,
      description: 'Surveiller la date de prononcé du jugement',
      descriptionAr: 'مراقبة تاريخ النطق بالحكم',
      dureeJours: 60,
      critiqueSousJours: 7,
      pointDeDepart: 'DATE_AUDIENCE',
    },
  ],
}

// Délais spéciaux référé — remplacent les délais standards
const REGLES_REFERE: Partial<Record<TypeEvenement, RegleDelai[]>> = {
  [TypeEvenement.JUGEMENT_RENDU]: [
    {
      typeDelai: TypeDelai.APPEL,
      description: "Délai d'appel en référé — 15 jours",
      descriptionAr: 'أجل الاستئناف في الأمور المستعجلة - 15 يوماً',
      dureeJours: 15,
      critiqueSousJours: 4,
      pointDeDepart: 'DATE_NOTIFICATION',
    },
  ],
}

export function calculerDelais(
  typeEvenement: TypeEvenement,
  typeProcedure: TypeProcedure,
  dateReference: Date
): DelaiCalcule[] {
  const regles =
    typeProcedure === TypeProcedure.REFERE && REGLES_REFERE[typeEvenement]
      ? REGLES_REFERE[typeEvenement]!
      : (REGLES[typeEvenement] ?? [])

  const now = Date.now()

  return regles.map((r) => {
    const dateLimite = new Date(dateReference)
    dateLimite.setDate(dateLimite.getDate() + r.dureeJours)

    const joursRestants = Math.ceil((dateLimite.getTime() - now) / 86_400_000)

    return {
      typeDelai: r.typeDelai,
      description: r.description,
      descriptionAr: r.descriptionAr,
      dateLimite,
      estCritique: joursRestants <= r.critiqueSousJours,
    }
  })
}
