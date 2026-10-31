import { EtatConnexion } from '@/components/layout/EtatConnexion'
import { TitreTraduit } from '@/components/layout/TitreTraduit'
import type { Metadata, Viewport } from 'next'
import './globals.css'

// Langue choisie (lib/langue.ts, même clé) appliquée AVANT l'affichage : pas de saut arabe → français.
// La landing a sa langue dans l'adresse (/ = arabe, /fr = français) : elle fixe aussi celle des pages
// de connexion qui suivent (visiteur non connecté) ; une fois connecté, la langue du compte (Paramètres) l'emporte.
const SCRIPT_LANGUE = `try{var p=location.pathname,l=p==='/fr'||p.indexOf('/fr/')===0?'fr':p==='/'?'ar':null;if(l){if(!localStorage.getItem('malafipro_token'))localStorage.setItem('malafipro_langue',l)}else l=localStorage.getItem('malafipro_langue');if(l==='fr'){document.documentElement.lang='fr';document.documentElement.dir='ltr'}}catch(e){}`

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://malafipro.ma').replace(/\/$/, '')

export const metadata: Metadata = {
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

export const viewport: Viewport = { themeColor: '#083B34', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // La langue choisie (français) est appliquée avant l'affichage par le script ci-dessous
    <html lang="ar" dir="rtl" suppressHydrationWarning>
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
