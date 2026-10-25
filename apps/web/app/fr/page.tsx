// Landing de vente en français (version arabe : /).
import { Landing } from '@/components/landing/Landing'
import { FR } from '@/components/landing/contenu'
import { jsonLd, metaLanding, placesRestantes } from '@/components/landing/seo'

export const metadata = metaLanding('fr')

export default async function LandingPageFr() {
  const restants = await placesRestantes()
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(FR)) }} />
      <Landing t={FR} restants={restants} />
    </>
  )
}
