// SEO des pages « fonction » : métadonnées (canonical, hreflang ar-MA / fr-MA / x-default) et données structurées.
import type { Metadata } from 'next'
import type { Langue } from '@/components/landing/contenu'
import { PAGES_FONCTIONS, SITE, cheminPage, type PageId } from '@/lib/pagesPubliques'
import { PAGES, UI } from './contenu'

const LOCALE = { ar: { loc: 'ar_MA', autre: 'fr_MA' }, fr: { loc: 'fr_MA', autre: 'ar_MA' } } as const

export function metaPage(id: PageId, lang: Langue): Metadata {
  const p = PAGES[id][lang]
  const ar = cheminPage(id, 'ar'), fr = cheminPage(id, 'fr')
  const url = lang === 'ar' ? ar : fr
  return {
    title: { absolute: p.titre },
    description: p.description,
    alternates: { canonical: url, languages: { 'ar-MA': ar, 'fr-MA': fr, 'x-default': ar } },
    openGraph: {
      type: 'website', locale: LOCALE[lang].loc, alternateLocale: [LOCALE[lang].autre], url, siteName: 'MalafiPro — ملفاتي',
      title: p.titre, description: p.description,
      images: [{ url: '/og-malafipro.jpg', width: 1200, height: 630, alt: 'MalafiPro — ملفاتي' }],
    },
    twitter: { card: 'summary_large_image', title: p.titre, description: p.description, images: ['/og-malafipro.jpg'] },
  }
}

/** WebPage + fil d'Ariane + FAQPage. La FAQ du JSON-LD est exactement la FAQ affichée sur la page. L'organisation et le site sont
 *  décrits (avec les prix) dans le JSON-LD de la landing : on y renvoie par @id au lieu de les répéter. */
export function jsonLdPage(id: PageId, lang: Langue) {
  const p = PAGES[id][lang]
  const url = `${SITE}${cheminPage(id, lang)}`
  const accueil = lang === 'ar' ? SITE : `${SITE}/fr`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `${url}#page`, url, name: p.titre, description: p.description, inLanguage: lang === 'ar' ? 'ar-MA' : 'fr-MA',
        isPartOf: { '@id': `${SITE}/#site` }, publisher: { '@id': `${SITE}/#organisation` }, breadcrumb: { '@id': `${url}#fil` },
      },
      {
        '@type': 'BreadcrumbList', '@id': `${url}#fil`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: UI[lang].accueil, item: accueil },
          { '@type': 'ListItem', position: 2, name: p.nav, item: url },
        ],
      },
      { '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: lang, mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })) },
    ],
  }
}

/** Entrées du sitemap : une URL par langue, avec les alternates réciproques. */
export const entreesSitemap = () => PAGES_FONCTIONS.flatMap((p) => {
  const languages = { 'ar-MA': `${SITE}${p.ar}`, 'fr-MA': `${SITE}${p.fr}`, 'x-default': `${SITE}${p.ar}` }
  return [p.ar, p.fr].map((chemin) => ({ url: `${SITE}${chemin}`, lastModified: p.maj, changeFrequency: 'monthly' as const, priority: 0.7, alternates: { languages } }))
})
