import type { MetadataRoute } from 'next'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://malafipro.ma').replace(/\/$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const maj = new Date()
  return [
    { url: `${SITE}/`, lastModified: maj, changeFrequency: 'weekly', priority: 1, alternates: { languages: { 'ar-MA': `${SITE}/`, 'fr-MA': `${SITE}/fr` } } },
    { url: `${SITE}/fr`, lastModified: maj, changeFrequency: 'weekly', priority: 0.9, alternates: { languages: { 'ar-MA': `${SITE}/`, 'fr-MA': `${SITE}/fr` } } },
    { url: `${SITE}/register`, lastModified: maj, changeFrequency: 'monthly', priority: 0.8 },
  ]
}
