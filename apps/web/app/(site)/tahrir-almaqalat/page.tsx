// Page « actes » (arabe) : contenu dans components/pages/contenu.ts
import { PageSeo } from '@/components/pages/PageSeo'
import { metaPage } from '@/components/pages/seo'

export const metadata = metaPage('actes', 'ar')

export default function Page() {
  return <PageSeo id="actes" lang="ar" />
}
