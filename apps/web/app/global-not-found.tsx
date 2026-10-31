// Page 404 des adresses inconnues. Avec deux layouts racines ((site) en arabe, fr en français), Next n'a plus de
// layout commun pour ces adresses : ce fichier fournit le document complet (option experimental.globalNotFound).
import type { Metadata } from 'next'
import { metadataRacine, viewportRacine } from '@/components/layout/Racine'
import './globals.css'

export const metadata: Metadata = { ...metadataRacine, title: 'الصفحة غير موجودة · Page introuvable', robots: { index: false, follow: true } }
export const viewport = viewportRacine

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center', fontFamily: "'IBM Plex Sans Arabic', 'IBM Plex Sans', sans-serif" }}>
          <h1 style={{ margin: 0 }}>الصفحة غير موجودة</h1>
          <p lang="fr" dir="ltr" style={{ margin: 0, color: '#3B4A47' }}>Page introuvable</p>
          <p style={{ margin: 0, display: 'flex', gap: 20 }}>
            <a href="/">الصفحة الرئيسية</a>
            <a href="/fr" lang="fr" hrefLang="fr">Accueil</a>
          </p>
        </main>
      </body>
    </html>
  )
}
