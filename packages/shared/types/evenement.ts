export type TypeEvenement =
  | 'RENVOI_SIMPLE' | 'RENVOI_EXPERT' | 'RENVOI_NOTIFICATION'
  | 'JUGEMENT_RENDU' | 'MISE_EN_DELIBERE' | 'ORDONNANCE_RENDUE'
  | 'NOTIFICATION_PARTIE' | 'SIGNIFICATION'
  | 'INSCRIPTION_ROLE' | 'MISE_EN_ETAT'
  | 'EXPERTISE_ORDONNEE' | 'EXPERTISE_DEPOSEE'
  | 'APPEL_INTERJET' | 'POURVOI_CASSATION'
  | 'RADIATION' | 'PEREMPTION' | 'DESISTEMENT'
  | 'AUTRE'

export interface EvenementBrut {
  id: string
  texteArabe: string
  typeEvenement?: TypeEvenement
  sousType?: string
  confiance?: number
  dateAudience?: string
  datePublicationGreffe: string
  estNouvel: boolean
  estTraite: boolean
}

export const TYPE_EVENEMENT_LABELS: Record<TypeEvenement, string> = {
  RENVOI_SIMPLE: '🔄 Renvoi',
  RENVOI_EXPERT: '🔬 Renvoi expertise',
  RENVOI_NOTIFICATION: '📨 Renvoi notification',
  JUGEMENT_RENDU: '⚖️ Jugement rendu',
  MISE_EN_DELIBERE: '🤔 Mise en délibéré',
  ORDONNANCE_RENDUE: '📜 Ordonnance',
  NOTIFICATION_PARTIE: '📬 Notification',
  SIGNIFICATION: '📮 Signification',
  INSCRIPTION_ROLE: '📝 Inscription au rôle',
  MISE_EN_ETAT: '📋 Mise en état',
  EXPERTISE_ORDONNEE: '🔬 Expertise ordonnée',
  EXPERTISE_DEPOSEE: '📊 Rapport expertise',
  APPEL_INTERJET: '📣 Appel interjeté',
  POURVOI_CASSATION: '🏛️ Pourvoi cassation',
  RADIATION: '❌ Radiation',
  PEREMPTION: '⏳ Péremption',
  DESISTEMENT: '🏳️ Désistement',
  AUTRE: '❓ Autre',
}
