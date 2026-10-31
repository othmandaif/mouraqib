// Page « clients » (arabe) : contenu dans components/pages/contenu.ts
import { PageSeo } from '@/components/pages/PageSeo'
import { metaPage } from '@/components/pages/seo'

export const metadata = metaPage('clients', 'ar')

export default function Page() {
  return <PageSeo id="clients" lang="ar" />
}
