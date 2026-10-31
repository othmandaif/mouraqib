// Guide (français) : /fr/guides/<slug>. Contenu dans components/guides/contenu.fr.ts
import { notFound } from 'next/navigation'
import { GuideSeo } from '@/components/guides/GuideSeo'
import { metaGuide } from '@/components/guides/seo'
import { GUIDES } from '@/lib/guidesPublics'

export const dynamicParams = false
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slugFr }))

const trouver = (slug: string) => GUIDES.find((g) => g.slugFr === slug)

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = trouver((await params).slug)
  return g ? metaGuide(g.id, 'fr') : {}
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const g = trouver((await params).slug)
  if (!g) notFound()
  return <GuideSeo id={g.id} lang="fr" />
}
