// SEO des guides : métadonnées (canonical, hreflang ar-MA / fr-MA / x-default), JSON-LD (Article, CollectionPage, fil d'Ariane,
// FAQPage identique à la FAQ affichée) et entrées du sitemap.
import type { Metadata } from 'next'
import type { Langue } from '@/components/landing/contenu'
import { SITE, encoder } from '@/lib/pagesPubliques'
import { GUIDES, HUB_GUIDES, cheminGuide, cheminHub, type GuideId } from '@/lib/guidesPublics'
import { GUIDES_TEXTES, UI_GUIDES } from './contenu'

const LOCALE = { ar: { loc: 'ar_MA', autre: 'fr_MA' }, fr: { loc: 'fr_MA', autre: 'ar_MA' } } as const
const INLANG = { ar: 'ar-MA', fr: 'fr-MA' } as const
const accueil = (lang: Langue) => (lang === 'ar' ? SITE : `${SITE}/fr`)
const nomAccueil = (lang: Langue) => (lang === 'ar' ? 'ملفاتي' : 'MalafiPro')

function meta(titre: string, description: string, ar: string, fr: string, lang: Langue, type: 'website' | 'article'): Metadata {
  const url = lang === 'ar' ? ar : fr
  return {
    title: { absolute: titre },
    description,
    alternates: { canonical: url, languages: { 'ar-MA': ar, 'fr-MA': fr, 'x-default': ar } },
    openGraph: {
      type, locale: LOCALE[lang].loc, alternateLocale: [LOCALE[lang].autre], url, siteName: 'MalafiPro — ملفاتي', title: titre, description,
      images: [{ url: '/og-malafipro.jpg', width: 1200, height: 630, alt: 'MalafiPro — ملفاتي' }],
    },
    twitter: { card: 'summary_large_image', title: titre, description, images: ['/og-malafipro.jpg'] },
  }
}

export const metaGuide = (id: GuideId, lang: Langue) => {
  const g = GUIDES_TEXTES[lang][id]
  return meta(g.titre, g.description, cheminGuide(id, 'ar'), cheminGuide(id, 'fr'), lang, 'article')
}
export const metaHub = (lang: Langue) => {
  const ui = UI_GUIDES[lang]
  return meta(ui.hubTitre, ui.hubDescription, cheminHub('ar'), cheminHub('fr'), lang, 'website')
}

/** Article + fil d'Ariane + FAQPage. Auteur = l'organisation (aucun auteur individuel tant qu'un relecteur réel n'est pas confirmé). */
export function jsonLdGuide(id: GuideId, lang: Langue) {
  const g = GUIDES_TEXTES[lang][id]
  const ui = UI_GUIDES[lang]
  const url = `${SITE}${cheminGuide(id, lang)}`
  const maj = GUIDES.find((x) => x.id === id)!.maj
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article', '@id': `${url}#article`, url, headline: g.h1, name: g.titre, description: g.description, inLanguage: INLANG[lang],
        datePublished: maj, dateModified: maj, mainEntityOfPage: url, image: `${SITE}/og-malafipro.jpg`,
        author: { '@id': `${SITE}/#organisation` }, publisher: { '@id': `${SITE}/#organisation` }, isPartOf: { '@id': `${SITE}/#site` },
        citation: g.sources.map((s) => s.url), breadcrumb: { '@id': `${url}#fil` },
      },
      {
        '@type': 'BreadcrumbList', '@id': `${url}#fil`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: nomAccueil(lang), item: accueil(lang) },
          { '@type': 'ListItem', position: 2, name: ui.hubNav, item: `${SITE}${cheminHub(lang)}` },
          { '@type': 'ListItem', position: 3, name: g.nav, item: url },
        ],
      },
      { '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: lang, mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })) },
    ],
  }
}

export function jsonLdHub(lang: Langue) {
  const ui = UI_GUIDES[lang]
  const url = `${SITE}${cheminHub(lang)}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage', '@id': `${url}#page`, url, name: ui.hubTitre, description: ui.hubDescription, inLanguage: INLANG[lang],
        isPartOf: { '@id': `${SITE}/#site` }, publisher: { '@id': `${SITE}/#organisation` }, breadcrumb: { '@id': `${url}#fil` },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: GUIDES.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}${cheminGuide(x.id, lang)}`, name: GUIDES_TEXTES[lang][x.id].h1 })),
        },
      },
      {
        '@type': 'BreadcrumbList', '@id': `${url}#fil`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: nomAccueil(lang), item: accueil(lang) },
          { '@type': 'ListItem', position: 2, name: ui.hubNav, item: url },
        ],
      },
    ],
  }
}

/** Sitemap : index + 6 guides, une URL par langue, alternates réciproques. */
export const entreesSitemapGuides = () => [HUB_GUIDES, ...GUIDES].flatMap((p) => {
  const languages = { 'ar-MA': `${SITE}${encoder(p.ar)}`, 'fr-MA': `${SITE}${encoder(p.fr)}`, 'x-default': `${SITE}${encoder(p.ar)}` }
  return [p.ar, p.fr].map((chemin) => ({ url: `${SITE}${encoder(chemin)}`, lastModified: p.maj, changeFrequency: 'monthly' as const, priority: 0.6, alternates: { languages } }))
})
