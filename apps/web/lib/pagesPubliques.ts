// Pages publiques du site (source unique pour le sitemap et le pied de page de la landing).
// lastmod : date RÉELLE de la dernière modification du contenu de la page. À mettre à jour à chaque changement
// de texte (pas à chaque build : une date qui change sans raison n'est plus prise en compte par Google).

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://malafipro.ma').replace(/\/$/, '')

/** Landing arabe (/) et française (/fr) : dernière modification du contenu. */
export const MAJ_LANDING = '2026-10-31'

type PageConfiance = { ar: string; fr: string; titreAr: string; titreFr: string; publiee: boolean; maj: string }

/**
 * Pages de confiance prévues (À propos, mentions légales, confidentialité, CGU).
 * Elles n'existent pas encore : aucun contenu juridique n'est inventé. Pour en publier une :
 * 1. créer app/<chemin>/page.tsx et app/fr/<chemin>/page.tsx avec le texte validé (metadata : metaPagePublique) ;
 * 2. passer `publiee` à true et renseigner `maj` → elle entre dans le sitemap (avec hreflang) et dans le pied de page.
 */
export const PAGES_CONFIANCE: PageConfiance[] = [
  { ar: '/a-propos', fr: '/fr/a-propos', titreAr: 'من نحن', titreFr: 'À propos', publiee: false, maj: '' },
  { ar: '/mentions-legales', fr: '/fr/mentions-legales', titreAr: 'الإشعار القانوني', titreFr: 'Mentions légales', publiee: false, maj: '' },
  { ar: '/confidentialite', fr: '/fr/confidentialite', titreAr: 'سياسة الخصوصية', titreFr: 'Confidentialité', publiee: false, maj: '' },
  { ar: '/cgu', fr: '/fr/cgu', titreAr: 'شروط الاستعمال', titreFr: 'CGU', publiee: false, maj: '' },
]

export const pagesConfiancePubliees = () => PAGES_CONFIANCE.filter((p) => p.publiee)

/** Métadonnées d'une page publique bilingue : canonical + hreflang ar-MA / fr-MA / x-default (version arabe). */
export function metaPagePublique(lang: 'ar' | 'fr', chemins: { ar: string; fr: string }, titre: string, description: string) {
  return {
    title: titre,
    description,
    alternates: { canonical: chemins[lang], languages: { 'ar-MA': chemins.ar, 'fr-MA': chemins.fr, 'x-default': chemins.ar } },
  }
}
