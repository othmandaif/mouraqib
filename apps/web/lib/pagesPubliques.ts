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

/**
 * Pages « fonction » : une page par besoin réel du cabinet, en arabe (racine) et en français (/fr/…).
 * Contenu : components/pages/contenu.ts.
 * `ar` = adresse PUBLIQUE en écriture arabe ; `arRoute` = dossier interne en lettres latines dans app/(site)/ (Next.js ne sait pas
 * pré-générer un dossier au nom arabe : erreur « Invalid character »). next.config.ts réécrit `ar` vers `arRoute` et redirige
 * `arRoute` vers `ar`, pour qu'une seule adresse existe. Dans le HTML, les liens, le sitemap et le JSON-LD, `ar` est encodé en
 * UTF-8 (%D9%85…) comme l'attendent les moteurs : voir cheminPage.
 * `maj` = date réelle de dernière modification du contenu (alimente le lastmod du sitemap).
 */
export type PageId = 'suivi' | 'alertes' | 'clients' | 'facturation' | 'assistant' | 'actes'
export const PAGES_FONCTIONS: { id: PageId; ar: string; arRoute: string; fr: string; maj: string }[] = [
  { id: 'suivi', ar: '/متابعة-ملفات-محاكم', arRoute: '/mutabaat-mahakim', fr: '/fr/suivi-mahakim', maj: '2026-10-31' },
  { id: 'alertes', ar: '/تنبيهات-واتساب-للمحامي', arRoute: '/tanbihat-whatsapp', fr: '/fr/alertes-whatsapp-avocat', maj: '2026-10-31' },
  { id: 'clients', ar: '/إدارة-الموكلين', arRoute: '/idarat-almuwakkilin', fr: '/fr/gestion-clients-avocat', maj: '2026-10-31' },
  { id: 'facturation', ar: '/فواتير-المحامي-والأتعاب', arRoute: '/fawatir-wa-atab', fr: '/fr/facturation-honoraires-avocat', maj: '2026-10-31' },
  { id: 'assistant', ar: '/مساعد-قانوني-بالذكاء-الاصطناعي', arRoute: '/musaid-qanuni', fr: '/fr/assistant-juridique-ia', maj: '2026-10-31' },
  { id: 'actes', ar: '/تحرير-المقالات-القانونية', arRoute: '/tahrir-almaqalat', fr: '/fr/redaction-actes-avocat', maj: '2026-10-31' },
]
/** Chemin d'une page, encodé en UTF-8 : à utiliser pour tout lien, canonical, hreflang, sitemap et JSON-LD. */
export const encoder = (chemin: string) => encodeURI(chemin)
export const cheminPage = (id: PageId, lang: 'ar' | 'fr') => encoder(PAGES_FONCTIONS.find((p) => p.id === id)![lang])

/** Métadonnées d'une page publique bilingue : canonical + hreflang ar-MA / fr-MA / x-default (version arabe). */
export function metaPagePublique(lang: 'ar' | 'fr', chemins: { ar: string; fr: string }, titre: string, description: string) {
  return {
    title: { absolute: titre },
    description,
    alternates: { canonical: chemins[lang], languages: { 'ar-MA': chemins.ar, 'fr-MA': chemins.fr, 'x-default': chemins.ar } },
  }
}
