import type { Abonnement, PlanAbonnement } from '@prisma/client'

/** Offres vendues par le commercial (pas de paiement en ligne). Prix en DH par mois. */
export const OFFRES: Record<PlanAbonnement, { nomAr: string; prix: number | null; prixFondateur: number | null; maxDossiers: number; utilisateurs: number }> = {
  // maxDossiers = valeur par défaut à la création (-1 = illimité) ; l'administrateur peut fixer une limite par compte
  SOLO: { nomAr: 'فردي', prix: 290, prixFondateur: 149, maxDossiers: -1, utilisateurs: 1 },
  CABINET: { nomAr: 'مكتب', prix: 790, prixFondateur: 449, maxDossiers: -1, utilisateurs: 5 },
  SUR_MESURE: { nomAr: 'مكتب+ أو تثبيت محلي', prix: null, prixFondateur: null, maxDossiers: -1, utilisateurs: -1 },
  // Anciennes offres, gardées pour les comptes existants
  PRO: { nomAr: 'احترافي', prix: 390, prixFondateur: null, maxDossiers: -1, utilisateurs: 1 },
  GRATUIT: { nomAr: 'تجريبي', prix: 0, prixFondateur: null, maxDossiers: 3, utilisateurs: 1 },
}

export const ESSAI_INSCRIPTION_JOURS = 30 // compte créé seul depuis le site
export const ESSAI_FONDATEUR_MOIS = 3
export const GRACE_JOURS = 15 // après la fin : les alertes continuent, l'ajout de dossiers est bloqué

export type EtatAbonnement = 'ESSAI' | 'PAYE' | 'A_RENOUVELER' | 'GRACE' | 'EXPIRE'

/** Fin de la couverture = la plus tardive entre la période offerte et la période payée. */
export function finCouverture(a: Pick<Abonnement, 'essaiJusquAu' | 'payeJusquAu' | 'dateFin'>): Date | null {
  const dates = [a.essaiJusquAu, a.payeJusquAu].filter(Boolean) as Date[]
  if (!dates.length) return a.dateFin ?? null
  return new Date(Math.max(...dates.map((d) => d.getTime())))
}

export function etatAbonnement(a: Pick<Abonnement, 'essaiJusquAu' | 'payeJusquAu' | 'dateFin'>, maintenant = new Date()) {
  const fin = finCouverture(a)
  if (!fin) return { etat: 'PAYE' as EtatAbonnement, fin: null, joursRestants: null }
  const joursRestants = Math.ceil((fin.getTime() - maintenant.getTime()) / 86_400_000)
  const paye = !!a.payeJusquAu && a.payeJusquAu >= maintenant
  let etat: EtatAbonnement
  if (joursRestants < -GRACE_JOURS) etat = 'EXPIRE'
  else if (joursRestants < 0) etat = 'GRACE'
  else if (joursRestants <= 7) etat = 'A_RENOUVELER'
  else etat = paye ? 'PAYE' : 'ESSAI'
  return { etat, fin, joursRestants }
}

/** Ajoute `mois` mois à la couverture payée, à partir d'aujourd'hui ou de la fin actuelle si elle est plus tard. */
export function prolonger(payeJusquAu: Date | null, mois: number, maintenant = new Date()): Date {
  const base = payeJusquAu && payeJusquAu > maintenant ? new Date(payeJusquAu) : new Date(maintenant)
  // setMonth seul déborde : 31 janvier + 1 mois donnait le 3 mars. On s'arrête au dernier jour du mois.
  const jour = base.getUTCDate()
  base.setUTCDate(1)
  base.setUTCMonth(base.getUTCMonth() + mois)
  const dernier = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate()
  base.setUTCDate(Math.min(jour, dernier))
  return base
}
