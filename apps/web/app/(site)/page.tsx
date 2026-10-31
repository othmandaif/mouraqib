// Landing de vente en arabe (version française : /fr). Contenu et sections : components/landing/.
// Pas de faux témoignages ni de chiffres inventés : à ajouter seulement avec l'accord écrit d'avocats clients.
import { Landing } from '@/components/landing/Landing'
import { AR } from '@/components/landing/contenu'
import { jsonLd, metaLanding, placesRestantes } from '@/components/landing/seo'

export const metadata = metaLanding('ar')

export default async function LandingPage() {
  const restants = await placesRestantes()
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(AR)) }} />
      <Landing t={AR} restants={restants} />
    </>
  )
}
