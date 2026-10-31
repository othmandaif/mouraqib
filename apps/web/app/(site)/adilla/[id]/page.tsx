// Guide (arabe), servi à l'adresse publique /أدلة-المحامي/<slug-arabe> (réécriture dans next.config.ts).
// Contenu dans components/guides/contenu.ar.ts
import { notFound } from 'next/navigation'
import { GuideSeo } from '@/components/guides/GuideSeo'
import { metaGuide } from '@/components/guides/seo'
import { GUIDES } from '@/lib/guidesPublics'

export const dynamicParams = false
export const generateStaticParams = () => GUIDES.map((g) => ({ id: g.id }))

const trouver = (id: string) => GUIDES.find((g) => g.id === id)

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const g = trouver((await params).id)
  return g ? metaGuide(g.id, 'ar') : {}
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const g = trouver((await params).id)
  if (!g) notFound()
  return <GuideSeo id={g.id} lang="ar" />
}
