import type { MetadataRoute } from 'next'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://malafipro.ma').replace(/\/$/, '')

// Seules les pages publiques sont explorées ; l'espace connecté (dossiers des avocats) ne doit jamais l'être
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: ['/', '/register'],
      disallow: ['/api/', '/dashboard', '/dossiers', '/echeances', '/calendrier', '/assistant', '/documents', '/alertes', '/parametres', '/abonnement', '/admin', '/onboarding', '/activer', '/login', '/mot-de-passe-provisoire'],
    }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
