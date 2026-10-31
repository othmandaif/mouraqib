// Layout racine arabe : landing (/), pages d'accès et espace connecté → <html lang="ar" dir="rtl"> côté serveur.
// La version française publique a sa propre racine : app/fr/layout.tsx.
import { Racine, metadataRacine, viewportRacine } from '@/components/layout/Racine'
import '../globals.css'

export const metadata = metadataRacine
export const viewport = viewportRacine

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <Racine lang="ar">{children}</Racine>
}
