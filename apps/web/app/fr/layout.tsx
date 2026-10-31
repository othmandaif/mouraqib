// Layout racine français : /fr et ses sous-pages → <html lang="fr" dir="ltr"> côté serveur.
import { Racine, metadataRacine, viewportRacine } from '@/components/layout/Racine'
import '../globals.css'

export const metadata = metadataRacine
export const viewport = viewportRacine

export default function RootLayoutFr({ children }: { children: React.ReactNode }) {
  return <Racine lang="fr">{children}</Racine>
}
