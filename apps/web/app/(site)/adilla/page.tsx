// Index des guides (arabe), servi à l'adresse publique /أدلة-المحامي (réécriture dans next.config.ts)
import { HubGuides } from '@/components/guides/GuideSeo'
import { metaHub } from '@/components/guides/seo'

export const metadata = metaHub('ar')

export default function Page() {
  return <HubGuides lang="ar" />
}
