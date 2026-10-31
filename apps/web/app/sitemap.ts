import type { MetadataRoute } from 'next'
import { MAJ_LANDING, SITE, pagesConfiancePubliees } from '@/lib/pagesPubliques'
import { entreesSitemap } from '@/components/pages/seo'
import { entreesSitemapGuides } from '@/components/guides/seo'

// Pages indexables uniquement (/register est en noindex : absente du sitemap).
// lastmod = date réelle de modification du contenu (lib/pagesPubliques.ts), pas la date du build.
export default function sitemap(): MetadataRoute.Sitemap {
  const langues = (ar: string, fr: string) => ({ languages: { 'ar-MA': `${SITE}${ar}`, 'fr-MA': `${SITE}${fr}`, 'x-default': `${SITE}${ar}` } })
  const landing = langues('/', '/fr')
  return [
    { url: `${SITE}/`, lastModified: MAJ_LANDING, changeFrequency: 'weekly', priority: 1, alternates: landing },
    { url: `${SITE}/fr`, lastModified: MAJ_LANDING, changeFrequency: 'weekly', priority: 0.9, alternates: landing },
    ...entreesSitemap(),
    ...entreesSitemapGuides(),
    ...pagesConfiancePubliees().flatMap((p) => [
      { url: `${SITE}${p.ar}`, lastModified: p.maj, changeFrequency: 'yearly' as const, priority: 0.3, alternates: langues(p.ar, p.fr) },
      { url: `${SITE}${p.fr}`, lastModified: p.maj, changeFrequency: 'yearly' as const, priority: 0.3, alternates: langues(p.ar, p.fr) },
    ]),
  ]
}
