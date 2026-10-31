// Document HTML commun aux deux layouts racines :
// - app/(site)/layout.tsx → <html lang="ar" dir="rtl"> (landing arabe, connexion, espace connecté) ;
// - app/fr/layout.tsx     → <html lang="fr" dir="ltr"> (landing française et futures pages /fr/…).
// lang/dir sont ainsi corrects dans le HTML envoyé par le serveur (SEO), sans attendre le JavaScript.
// Passer d'une racine à l'autre (/ ↔ /fr) recharge la page entière : normal pour un changement de langue.
import { EtatConnexion } from '@/components/layout/EtatConnexion'
import { TitreTraduit } from '@/components/layout/TitreTraduit'
import type { Metadata, Viewport } from 'next'
import { SITE } from '@/lib/pagesPubliques'

// Mémorise la langue de la landing (/ = arabe, /fr = français) pour les pages de connexion qui suivent
// (visiteur non connecté) ; ailleurs, applique la langue choisie (lib/langue.ts, même clé) avant l'affichage.
// Ce script ne sert plus au SEO : sur / et /fr, lang/dir viennent déjà du serveur.
const SCRIPT_LANGUE = `try{var p=location.pathname,l=p==='/fr'||p.indexOf('/fr/')===0?'fr':p==='/'?'ar':null;if(l){if(!localStorage.getItem('malafipro_token'))localStorage.setItem('malafipro_langue',l)}else l=localStorage.getItem('malafipro_langue');if(l==='fr'){document.documentElement.lang='fr';document.documentElement.dir='ltr'}}catch(e){}`

export const metadataRacine: Metadata = {
  metadataBase: new URL(SITE), // URLs absolues pour Open Graph, canonical et sitemap
  title: { default: 'MalafiPro — ملفاتي · متابعة ملفات المحاكم المغربية', template: '%s · MalafiPro — ملفاتي' },
  description: 'ملفاتي يتابع ملفاتكم على محاكم، يحسب آجال الطعن، وينبّهكم على واتساب قبل آخر أجل.',
  applicationName: 'MalafiPro — ملفاتي',
  authors: [{ name: 'MalafiPro' }],
  creator: 'MalafiPro',
  category: 'legal',
  formatDetection: { telephone: false, email: false, address: false },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  // Search Console : NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION au build (balise meta de validation)
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } } : {}),
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  appleWebApp: { capable: true, title: 'MalafiPro', statusBarStyle: 'default' },
}

export const viewportRacine: Viewport = { themeColor: '#083B34', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export function Racine({ lang, children }: { lang: 'ar' | 'fr'; children: React.ReactNode }) {
  return (
    <html lang={lang} dir={lang === 'fr' ? 'ltr' : 'rtl'} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_LANGUE }} />
        {/* Polices : connexion ouverte tôt + feuille chargée en parallèle (au lieu d'un @import bloquant dans le CSS) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" />
      </head>
      <body>{children}<EtatConnexion /><TitreTraduit /></body>
    </html>
  )
}
