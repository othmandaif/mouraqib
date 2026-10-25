// SEO de la landing : métadonnées par langue (hreflang), données structurées et places fondateurs.
import type { Metadata } from 'next'
import { PRIX, type Contenu } from './contenu'
import { EMAIL, TEL } from './Landing'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://malafipro.ma').replace(/\/$/, '')
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const META = {
  ar: {
    titre: 'ملفاتي MalafiPro — برنامج المحامي في المغرب: متابعة محاكم، آجال الطعن، الموكلون والوثائق',
    description: 'ملفاتي يتابع ملفاتكم على محاكم تلقائياً، يحسب آجال الاستئناف والتعرض والنقض، ينبّهكم على واتساب، ويجمع موكليكم وأتعابكم ووثائقكم. سحابة أو على حاسوبكم بدون إنترنت. تجربة مجانية 20 يوماً، من 149 درهماً في الشهر.',
    keywords: ['برنامج للمحامين', 'برنامج مكتب المحاماة', 'محاكم', 'متابعة الملفات', 'آجال الطعن', 'أجل الاستئناف', 'إدارة الموكلين', 'أتعاب المحامي', 'تنبيهات واتساب', 'مساعد قانوني بالذكاء الاصطناعي'],
    alt: 'ملفاتي MalafiPro على حاسوب محامٍ في مكتبه', locale: 'ar_MA', autre: 'fr_MA', url: '/',
  },
  fr: {
    titre: 'MalafiPro — Logiciel pour avocats au Maroc : suivi mahakim, délais, clients et documents',
    description: 'MalafiPro suit vos dossiers sur mahakim, calcule vos délais d’appel, d’opposition et de cassation, vous alerte sur WhatsApp et gère vos clients, honoraires et documents. Cloud ou sur votre PC, même hors ligne. Essai gratuit 20 jours, dès 149 DH/mois.',
    keywords: ['logiciel avocat Maroc', 'logiciel cabinet d’avocats', 'suivi dossiers mahakim', 'délais de recours', 'CRM avocat', 'gestion honoraires avocat', 'logiciel avocat hors ligne', 'alertes WhatsApp avocat', 'IA juridique Maroc'],
    alt: 'MalafiPro sur l’ordinateur d’un avocat dans son cabinet', locale: 'fr_MA', autre: 'ar_MA', url: '/fr',
  },
}

export function metaLanding(lang: 'ar' | 'fr'): Metadata {
  const m = META[lang]
  return {
    title: { absolute: m.titre },
    description: m.description,
    keywords: m.keywords,
    alternates: { canonical: m.url, languages: { 'ar-MA': '/', 'fr-MA': '/fr', 'x-default': '/' } },
    openGraph: {
      type: 'website', locale: m.locale, alternateLocale: [m.autre], url: m.url, siteName: 'MalafiPro — ملفاتي',
      title: m.titre, description: m.description,
      images: [{ url: '/og-malafipro.jpg', width: 1200, height: 630, alt: m.alt }],
    },
    twitter: { card: 'summary_large_image', title: m.titre, description: m.description, images: ['/og-malafipro.jpg'] },
  }
}

export function jsonLd(t: Contenu) {
  const m = META[t.lang]
  const offre = (nom: string, prix: number) => ({ '@type': 'Offer', name: nom, price: prix, priceCurrency: 'MAD', url: `${SITE}${m.url}`, availability: 'https://schema.org/InStock' })
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': `${SITE}/#organisation`, name: 'MalafiPro', alternateName: 'ملفاتي', url: SITE, logo: `${SITE}/icon-512.png`, email: EMAIL,
        contactPoint: { '@type': 'ContactPoint', telephone: TEL, email: EMAIL, contactType: 'sales', areaServed: 'MA', availableLanguage: ['ar', 'fr'] },
      },
      { '@type': 'WebSite', '@id': `${SITE}/#site`, url: SITE, name: 'MalafiPro — ملفاتي', inLanguage: ['ar', 'fr'], publisher: { '@id': `${SITE}/#organisation` } },
      {
        '@type': 'SoftwareApplication', name: 'MalafiPro — ملفاتي', applicationCategory: 'BusinessApplication', applicationSubCategory: 'Legal practice management',
        operatingSystem: 'Web, Android, iOS, Windows', inLanguage: t.lang, url: `${SITE}${m.url}`, image: `${SITE}/og-malafipro.jpg`, description: m.description,
        featureList: t.fonctions.cartes.map((c) => c.titre), publisher: { '@id': `${SITE}/#organisation` },
        offers: [offre(t.tarifs.offres[0].nom, PRIX.solo.mois), offre(t.tarifs.offres[1].nom, PRIX.cabinet.mois)],
      },
      { '@type': 'FAQPage', inLanguage: t.lang, mainEntity: t.faq.items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })) },
    ],
  }
}

/** Places fondateurs restantes (mises à jour toutes les 10 min) ; null si l'API ne répond pas. */
export async function placesRestantes(): Promise<number | null> {
  try {
    const r = await fetch(`${API}/api/v1/abonnements/fondateurs`, { next: { revalidate: 600 } })
    if (!r.ok) return null
    return (await r.json()).restants as number
  } catch { return null }
}
