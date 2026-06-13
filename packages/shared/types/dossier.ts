export type TypeProcedure = 'CIVILE' | 'PENALE' | 'COMMERCIALE' | 'ADMINISTRATIVE' | 'TRAVAIL' | 'FAMILLE' | 'REFERE'

export type TypeDelai = 'APPEL' | 'OPPOSITION' | 'CASSATION' | 'TIERCE_OPPOSITION' | 'REQUETE_CIVILE' | 'NOTIFICATION_JUGEMENT' | 'EXECUTION_JUGEMENT' | 'EXPERTISE' | 'AUTRE'

export interface DossierSummary {
  id: string
  numeroDossier: string
  tribunal: string
  typeProcedure: TypeProcedure
  titreAffaire?: string
  estActif: boolean
  derniereVerif?: string
  updatedAt: string
}

export interface EcheanceSummary {
  id: string
  typeDelai: TypeDelai
  description: string
  dateLimite: string
  estCritique: boolean
  estExpire: boolean
  estComplete: boolean
}
