// SEO de la landing : métadonnées par langue (hreflang), données structurées et places fondateurs.
import type { Metadata } from 'next'
import { BIENTOT, PRIX, type Contenu } from './contenu'
import { EMAIL, TEL } from './Landing'
import { SITE } from '@/lib/pagesPubliques'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Titres ≤ 60 caractères et descriptions ≤ 160 (sinon tronqués dans Google).
// Pas de mention du hors-ligne (encore « bientôt ») ni du prix fondateur (offre limitée) dans les extraits.
const META = {
  ar: {
    titre: 'ملفاتي MalafiPro — برنامج المحامي بالمغرب وآجال الطعن',
    description: `ملفاتي يتابع ملفاتكم على بوابة محاكم، يحسب آجال الاستئناف والتعرض والنقض، وينبّهكم على واتساب قبل آخر أجل. تجربة مجانية ${PRIX.essaiJours} يوماً.`,
    alt: 'ملفاتي MalafiPro على حاسوب محامٍ في مكتبه', locale: 'ar_MA', autre: 'fr_MA', url: '/',
  },
  fr: {
    titre: 'MalafiPro — Logiciel avocat au Maroc : mahakim et délais',
    description: `MalafiPro suit vos dossiers sur mahakim, calcule vos délais d’appel, d’opposition et de cassation et vous alerte sur WhatsApp. Essai gratuit ${PRIX.essaiJours} jours.`,
    alt: 'MalafiPro sur l’ordinateur d’un avocat dans son cabinet', locale: 'fr_MA', autre: 'ar_MA', url: '/fr',
  },
}

export function metaLanding(lang: 'ar' | 'fr'): Metadata {
  const m = META[lang]
  return {
    title: { absolute: m.titre },
    description: m.description,
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
  // Prix mensuels publics (PRIX = copie de l'API) ; unitCode MON = par mois
  const offre = (nom: string, prix: number) => ({
    '@type': 'Offer', name: nom, price: prix, priceCurrency: 'MAD', url: `${SITE}${m.url}`, availability: 'https://schema.org/InStock',
    priceSpecification: { '@type': 'UnitPriceSpecification', price: prix, priceCurrency: 'MAD', unitCode: 'MON' },
  })
  // Seules les fonctions déjà livrées (pas celles marquées « bientôt »)
  const livrees = t.fonctions.cartes.filter((c) => !(c.bientot && (c.icone === 'laptop' ? BIENTOT.horsLigne : BIENTOT.crm)))
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
        // Application web (navigateur, ordinateur et mobile) ; l'application PC hors ligne n'est pas encore livrée
        operatingSystem: 'Web', inLanguage: t.lang, url: `${SITE}${m.url}`, image: `${SITE}/og-malafipro.jpg`, description: m.description,
        featureList: livrees.map((c) => c.titre), publisher: { '@id': `${SITE}/#organisation` },
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
