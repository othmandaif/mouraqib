// Calculs de facturation, purs et testés. Montants en centimes de dirham (entiers) : pas d'erreur d'arrondi.

export interface LigneFacture {
  designation: string
  quantite: number
  prixUnitaireCentimes: number
}

export interface Totaux {
  totalHtCentimes: number
  tvaCentimes: number
  totalTtcCentimes: number
}

/** Taux proposés dans l'interface (CGI art. 98–100). Le taux est choisi sur chaque facture. */
export const TAUX_TVA = [0, 7, 10, 14, 20] as const

/** Total d'une ligne arrondi au centime (la quantité peut être décimale : 1,5 heure). */
export function totalLigne(l: LigneFacture): number {
  return Math.round(l.quantite * l.prixUnitaireCentimes)
}

/** HT = somme des lignes arrondies ; TVA arrondie une seule fois sur le total HT. */
export function calculerTotaux(lignes: LigneFacture[], tauxTva: number): Totaux {
  const totalHtCentimes = lignes.reduce((s, l) => s + totalLigne(l), 0)
  const tvaCentimes = Math.round((totalHtCentimes * tauxTva) / 100)
  return { totalHtCentimes, tvaCentimes, totalTtcCentimes: totalHtCentimes + tvaCentimes }
}

/** Numéro d'affichage : « 2026-0007 » (série annuelle, continue). */
export function formaterNumero(annee: number, rang: number): string {
  return `${annee}-${String(rang).padStart(4, '0')}`
}

/** Lignes d'un avoir : mêmes lignes, prix négatifs. */
export function lignesAvoir(lignes: LigneFacture[]): LigneFacture[] {
  return lignes.map((l) => ({ ...l, prixUnitaireCentimes: -l.prixUnitaireCentimes }))
}

export type EtatPaiement = 'NON_PAYEE' | 'PARTIELLE' | 'PAYEE'

export function etatPaiement(totalTtcCentimes: number, regleCentimes: number): EtatPaiement {
  if (totalTtcCentimes <= 0) return 'PAYEE'
  if (regleCentimes <= 0) return 'NON_PAYEE'
  return regleCentimes >= totalTtcCentimes ? 'PAYEE' : 'PARTIELLE'
}

/**
 * Solde d'un client ou d'un dossier.
 * - facture : total TTC des factures émises (avoirs négatifs compris) ;
 * - regle : tous les encaissements, y compris les provisions non imputées ;
 * - reste : facturé − réglé (négatif = avance du client) ;
 * - resteSurConvenu : honoraires convenus − réglé (null si rien n'est convenu).
 */
export function solde(factureCentimes: number, regleCentimes: number, convenuCentimes: number | null = null) {
  return {
    factureCentimes,
    regleCentimes,
    resteCentimes: factureCentimes - regleCentimes,
    resteSurConvenuCentimes: convenuCentimes == null ? null : convenuCentimes - regleCentimes,
  }
}

/** Saisie « 1 500,50 » ou 1500.5 → 150050 centimes ; null si illisible. */
export function versCentimes(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) : null
  if (typeof v !== 'string') return null
  const s = v.replace(/[\s  ]/g, '').replace(',', '.')
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null
  return Math.round(Number(s) * 100)
}
