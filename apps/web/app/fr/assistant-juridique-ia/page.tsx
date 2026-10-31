// Page « assistant » (français) : contenu dans components/pages/contenu.ts
import { PageSeo } from '@/components/pages/PageSeo'
import { metaPage } from '@/components/pages/seo'

export const metadata = metaPage('assistant', 'fr')

export default function Page() {
  return <PageSeo id="assistant" lang="fr" />
}
