// Page « alertes » (arabe) : contenu dans components/pages/contenu.ts
import { PageSeo } from '@/components/pages/PageSeo'
import { metaPage } from '@/components/pages/seo'

export const metadata = metaPage('alertes', 'ar')

export default function Page() {
  return <PageSeo id="alertes" lang="ar" />
}
