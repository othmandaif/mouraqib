// Index des guides (français) : contenu dans components/guides/
import { HubGuides } from '@/components/guides/GuideSeo'
import { metaHub } from '@/components/guides/seo'

export const metadata = metaHub('fr')

export default function Page() {
  return <HubGuides lang="fr" />
}
