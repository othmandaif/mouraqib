# MOURAQIB — Sentinelle procédurale pour avocats marocains

## C'est quoi ce projet
SaaS qui surveille mahakim.ma, classe les événements de procédure en arabe,
calcule les délais légaux (CPC marocain), et alerte via WhatsApp.

## Stack
- Backend: Node.js 20 + TypeScript + Express + Prisma + PostgreSQL + Redis + BullMQ
- Frontend: Next.js 14 (App Router) + Tailwind + shadcn/ui
- Scraping: Playwright + Cheerio
- NLP: règles regex arabe + GPT-4o-mini fallback
- WhatsApp: Meta Cloud API
- Paiement: CMI (Maroc)

## Commandes
- `npm run dev` — démarrer en développement
- `npx prisma migrate dev` — appliquer les migrations
- `npx prisma studio` — interface base de données
- `npm test` — lancer les tests

## Spécification complète
Lire MOURAQIB_BUILD_SPEC.md avant toute implémentation.
Suivre les phases dans l'ordre : Phase 1 → 2 → 3...

## Conventions
- Toujours TypeScript strict
- Zod pour valider toutes les entrées API
- Chaque service dans apps/api/src/services/
- Ne jamais logger les données sensibles (numéros de dossier, noms)