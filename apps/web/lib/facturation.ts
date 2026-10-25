import type { CSSProperties } from 'react'
// Types et libellés partagés par les pages Clients, Facturation et le pack du dossier.
// Montants reçus de l'API en centimes (entiers).

export type TypeClient = 'PERSONNE' | 'SOCIETE'
export type TypeFacture = 'FACTURE' | 'NOTE_HONORAIRES' | 'AVOIR'
export type StatutFacture = 'BROUILLON' | 'EMISE' | 'ANNULEE'
export type ModeReglement = 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'EFFET' | 'AUTRE'
export type EtatPaiement = 'NON_PAYEE' | 'PARTIELLE' | 'PAYEE'

export interface Client {
  id: string; type: TypeClient; nom: string; cin?: string | null; ice?: string | null; rc?: string | null; identifiantFiscal?: string | null
  representant?: string | null; telephone?: string | null; email?: string | null; adresse?: string | null; ville?: string | null; notes?: string | null; estArchive?: boolean
}
export interface Ligne { designation: string; quantite: number; prixUnitaireCentimes: number }
export interface Profil {
  existe: boolean; nom: string; barreau?: string | null; adresse?: string | null; ville?: string | null; telephone?: string | null; email?: string | null
  ice?: string | null; identifiantFiscal?: string | null; taxeProfessionnelle?: string | null; rib?: string | null; banque?: string | null; piedPage?: string | null
}
export interface Reglement { id: string; montantCentimes: number; date: string; mode: ModeReglement; reference?: string | null; note?: string | null; factureId?: string | null; facture?: { id?: string; numero: string | null } | null; client?: { id: string; nom: string }; dossier?: { id: string; numeroDossier: string } | null }
export interface Facture {
  id: string; type: TypeFacture; statut: StatutFacture; numero: string | null; clientId: string; dossierId: string | null
  dateEmission: string | null; dateEcheance: string | null; lignes: Ligne[]; tauxTva: number
  totalHtCentimes: number; tvaCentimes: number; totalTtcCentimes: number; modePaiement?: string | null; notes?: string | null
  emetteur?: Partial<Profil> | null; destinataire?: Partial<Client> | null
  client: { id: string; nom: string; type: TypeClient }; dossier: { id: string; numeroDossier: string } | null
  reglements: Reglement[]; regleCentimes: number; resteCentimes: number; etatPaiement: EtatPaiement | null
  avoir?: { id: string; numero: string | null } | null; factureOrigine?: { id: string; numero: string | null } | null
  createdAt: string
}
export interface Solde { factureCentimes: number; regleCentimes: number; resteCentimes: number; resteSurConvenuCentimes: number | null }

export const TAUX_TVA = [0, 7, 10, 14, 20]

export const TYPE_FACTURE: Record<TypeFacture, string> = { FACTURE: 'فاتورة', NOTE_HONORAIRES: 'مذكرة أتعاب', AVOIR: 'فاتورة مضادة' }
export const MODE: Record<ModeReglement, string> = { ESPECES: 'نقداً', CHEQUE: 'شيك', VIREMENT: 'تحويل بنكي', EFFET: 'كمبيالة', AUTRE: 'أخرى' }
export const ETAT: Record<EtatPaiement | 'BROUILLON' | 'ANNULEE', { label: string; bg: string; fg: string }> = {
  BROUILLON: { label: 'مسودة', bg: '#F1EFEA', fg: '#3B4A47' },
  NON_PAYEE: { label: 'غير مؤداة', bg: '#FDF1DC', fg: '#7A4E06' },
  PARTIELLE: { label: 'مؤداة جزئياً', bg: '#EAF0F5', fg: '#22476A' },
  PAYEE: { label: 'مؤداة', bg: '#E3F0EC', fg: '#0B4A40' },
  ANNULEE: { label: 'ملغاة', bg: '#F1EFEA', fg: '#5E6B67' },
}
export const etatFacture = (f: Pick<Facture, 'statut' | 'etatPaiement'>) => ETAT[f.statut === 'EMISE' ? (f.etatPaiement ?? 'NON_PAYEE') : f.statut]

/** 1155110 → « 11 551,10 » (format marocain, espace pour les milliers). */
export function dh(centimes: number | null | undefined, avecDevise = true): string {
  if (centimes == null) return '—'
  const s = (centimes / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[  ]/g, ' ')
  return avecDevise ? `${s} درهم` : s
}

/** Saisie « 1 500,50 » → 150050 ; null si illisible. */
export function versCentimes(v: string): number | null {
  const s = v.replace(/[\s  ]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  return Math.round(Number(s) * 100)
}
export const centimesVersSaisie = (c: number | null | undefined) => (c == null ? '' : (c / 100).toFixed(2).replace(/\.00$/, '').replace('.', ','))

export const totalLigne = (l: Ligne) => Math.round(l.quantite * l.prixUnitaireCentimes)
export function totaux(lignes: Ligne[], taux: number) {
  const ht = lignes.reduce((s, l) => s + totalLigne(l), 0)
  const tva = Math.round((ht * taux) / 100)
  return { ht, tva, ttc: ht + tva }
}

/** Champs de formulaire communs (tokens V2). */
export const INPUT: CSSProperties = { fontFamily: 'inherit', fontSize: 15, color: '#15201E', background: '#FFFFFF', border: '1px solid #CFCAC0', borderRadius: 10, minHeight: 46, padding: '0 12px', boxSizing: 'border-box', width: '100%', minWidth: 0 }
export const LABEL: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#3B4A47', minWidth: 0 }
export const CARTE: CSSProperties = { background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }
export const H2: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 600 }
