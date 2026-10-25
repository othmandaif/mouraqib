// Préférences d'alertes (miroir côté interface de apps/api/src/services/alerts/preferences.ts)
export interface Canaux { whatsapp: boolean; app: boolean }
export interface Preferences {
  matrice: { delai48h: Canaux; nouveauDelai: Canaux; jugement: Canaux; audience: Canaux; surveiller: Canaux }
  digestActif: boolean
  digestHeure: string
  calmeDebut: string
  calmeFin: string
  rappels: number[]
}
