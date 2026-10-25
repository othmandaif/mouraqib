import type { MetadataRoute } from 'next'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://malafipro.ma').replace(/\/$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const maj = new Date()
  return [
    { url: `${SITE}/`, lastModified: maj, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/register`, lastModified: maj, changeFrequency: 'monthly', priority: 0.8 },
  ]
}
