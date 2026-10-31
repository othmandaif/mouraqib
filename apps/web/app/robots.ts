import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/pagesPubliques'

// Seules les pages publiques sont explorées ; l'espace connecté (dossiers des avocats) ne doit jamais l'être.
// Une seule règle « * » : elle s'applique aussi aux robots IA (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot,
// Google-Extended…). Ne pas ajouter de groupe propre à un robot sans recopier ces Disallow : un robot qui a son
// propre groupe ignore celui-ci.
// /register reste explorable (non bloqué) pour que Google lise sa balise noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard', '/dossiers', '/echeances', '/calendrier', '/assistant', '/documents', '/alertes', '/clients', '/facturation', '/parametres', '/abonnement', '/admin', '/onboarding', '/activer', '/login', '/mot-de-passe-provisoire'],
    }],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
