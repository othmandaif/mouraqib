import { TypeEvenement, TypeProcedure, TypeDelai } from '@prisma/client'
import { finDeDelai, joursCalendaires } from '../../utils/dateMaroc'

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

/**
 * @param dateAction  date de l'acte au greffe (jugement, notification…) : point de départ des recours.
 * @param dateAudience date de la prochaine audience, utilisée seulement par les règles « DATE_AUDIENCE ».
 *
 * Prudence : les recours partent de la date de l'acte (jamais d'une audience future, qui
 * repousserait la limite au-delà du délai légal). La limite = 23:59:59 heure du Maroc du dernier jour.
 * Le délai n'est PAS calculé « franc » ni prorogé après un jour férié : on retient la date la plus
 * tôt possible. ⚠️ À valider par un avocat.
 */
/** Types d'événements qui créent au moins un délai (évite de relire tous les renvois chaque heure). */
export const TYPES_AVEC_DELAIS = Array.from(new Set([...Object.keys(REGLES), ...Object.keys(REGLES_REFERE)])) as TypeEvenement[]

export function calculerDelais(
  typeEvenement: TypeEvenement,
  typeProcedure: TypeProcedure,
  dateAction: Date,
  dateAudience?: Date | null,
): (DelaiCalcule & { dateDepart: Date })[] {
  const regles =
    typeProcedure === TypeProcedure.REFERE && REGLES_REFERE[typeEvenement]
      ? REGLES_REFERE[typeEvenement]!
      : (REGLES[typeEvenement] ?? [])

  return regles.map((r) => {
    const dateDepart = r.pointDeDepart === 'DATE_AUDIENCE' ? (dateAudience ?? dateAction) : dateAction
    const dateLimite = finDeDelai(dateDepart, r.dureeJours)
    return {
      typeDelai: r.typeDelai,
      description: r.description,
      descriptionAr: r.descriptionAr,
      dateDepart,
      dateLimite,
      estCritique: joursCalendaires(dateLimite) <= r.critiqueSousJours,
    }
  })
}

/**
 * Design V2 « Agir ou surveiller » : à qui appartient le délai ?
 * - Opposition : ouverte contre la partie défaillante, en pratique le défendeur.
 *   Client demandeur → délai de l'adversaire (SURVEILLER) ; défendeur ou inconnu → AGIR.
 * - Autres délais : la partie qui perd peut agir ; on ne le sait pas → AGIR par défaut,
 *   l'avocat peut basculer le délai à la main (PATCH /echeances/:id/camp).
 * ⚠️ Règle à faire valider par un avocat, comme le reste de ce fichier.
 */
export function campPour(typeDelai: TypeDelai, roleClient: 'DEMANDEUR' | 'DEFENDEUR' | 'INCONNU'): 'AGIR' | 'SURVEILLER' {
  if (typeDelai === TypeDelai.OPPOSITION && roleClient === 'DEMANDEUR') return 'SURVEILLER'
  return 'AGIR'
}

/** L'opposition n'existe que contre un jugement par défaut (غيابي). */
export function delaiApplicable(typeDelai: TypeDelai, nature: 'CONTRADICTOIRE' | 'DEFAUT' | null | undefined): boolean {
  return !(typeDelai === TypeDelai.OPPOSITION && nature === 'CONTRADICTOIRE')
}
