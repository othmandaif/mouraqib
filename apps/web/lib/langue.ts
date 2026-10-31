'use client'
/**
 * Langue de l'interface : arabe (par défaut) ou français.
 *
 * - C'est un réglage du COMPTE (User.langue, modifié dans Paramètres). Une copie locale (localStorage) permet
 *   l'affichage immédiat et sert aux pages hors connexion ; useAuth la met à jour depuis le compte.
 * - Le sens de lecture est porté par <html dir> : appliqué avant l'affichage par le script de components/layout/Racine.tsx,
 *   puis par changerLangue(). Les écrans n'écrivent plus dir="rtl" en dur.
 * - t('نص عربي', { n: 3 }) → texte français (lib/i18n/fr.ts) si la langue est « fr », sinon l'arabe.
 *   Les variables s'écrivent {n} dans les deux langues. tx() accepte des éléments React comme variables.
 * - Les textes venus de mahakim (actes, tribunaux, parties) restent en arabe : on ne les passe pas à t().
 */
import { Fragment, createElement, useSyncExternalStore, type ReactNode } from 'react'
import { FR } from '@/lib/i18n/fr'

export type Langue = 'ar' | 'fr'
const CLE = 'malafipro_langue' // même clé que le script de components/layout/Racine.tsx

/** Langue courante hors composant (messages d'erreur, utilitaires). */
export function langueCourante(): Langue {
  try { return localStorage.getItem(CLE) === 'fr' ? 'fr' : 'ar' } catch { return 'ar' }
}

export function changerLangue(l: Langue) {
  try { localStorage.setItem(CLE, l) } catch {}
  document.documentElement.lang = l
  document.documentElement.dir = l === 'fr' ? 'ltr' : 'rtl'
  window.dispatchEvent(new Event('mp:langue'))
}

const manquants = new Set<string>()
function chercher(langue: Langue, ar: string): string {
  if (langue !== 'fr' || !/[\u0600-\u06FF]/.test(ar)) return ar // déjà traduit (ex. texte passé deux fois)
  const fr = FR[ar]
  if (fr === undefined && process.env.NODE_ENV !== 'production' && !manquants.has(ar)) {
    manquants.add(ar)
    console.warn('[i18n] traduction manquante :', ar)
  }
  return fr ?? ar
}

/** Traduction d'un texte, variables {nom} remplacées. */
export function traduire(langue: Langue, ar: string, vars?: Record<string, string | number>): string {
  const s = chercher(langue, ar)
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : s
}

/** Comme traduire(), mais les variables peuvent être des éléments (ex. <span className="num">). */
export function traduireX(langue: Langue, ar: string, vars: Record<string, ReactNode>): ReactNode {
  const morceaux = chercher(langue, ar).split(/\{(\w+)\}/g)
  return createElement(Fragment, null, ...morceaux.map((m, i) => (i % 2 ? createElement(Fragment, { key: i }, vars[m]) : m)))
}

/** Hors composant : traduction dans la langue courante (messages d'erreur, toasts construits ailleurs). */
export const t = (ar: string, vars?: Record<string, string | number>) => traduire(langueCourante(), ar, vars)
export const tx = (ar: string, vars: Record<string, ReactNode>) => traduireX(langueCourante(), ar, vars)

const abonner = (f: () => void) => { window.addEventListener('mp:langue', f); return () => window.removeEventListener('mp:langue', f) }

export function useLangue() {
  const langue = useSyncExternalStore(abonner, langueCourante, () => 'ar' as Langue)
  return {
    langue,
    dir: (langue === 'fr' ? 'ltr' : 'rtl') as 'ltr' | 'rtl',
    /** Locale des dates et nombres affichés */
    locale: langue === 'fr' ? 'fr-MA' : 'ar-MA',
    t: (ar: string, vars?: Record<string, string | number>) => traduire(langue, ar, vars),
    tx: (ar: string, vars: Record<string, ReactNode>) => traduireX(langue, ar, vars),
    changerLangue,
  }
}
