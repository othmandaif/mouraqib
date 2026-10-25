import { EtatConnexion } from '@/components/layout/EtatConnexion'
import type { Metadata, Viewport } from 'next'
import './globals.css'

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
    <html lang="ar" dir="rtl">
      <head>
        {/* Polices : connexion ouverte tôt + feuille chargée en parallèle (au lieu d'un @import bloquant dans le CSS) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" />
      </head>
      <body>{children}<EtatConnexion /></body>
    </html>
  )
}
