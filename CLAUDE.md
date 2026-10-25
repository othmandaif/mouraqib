# MalafiPro — ملفاتي

> Anciennement **Mouraqib**. Voir la section « Marque » plus bas.

SaaS de surveillance judiciaire pour avocats marocains. Surveille mahakim.ma, calcule les délais CPC, envoie des alertes WhatsApp.

## Marque — MalafiPro

Nouveau nom (octobre 2026) : **MalafiPro — ملفاتي** (« mes dossiers »). Ancien nom : Mouraqib (مراقب).
Guide complet : [`docs/MARQUE.md`](docs/MARQUE.md).

- **Couleurs** : Vert Malafi `#0E5A4E` (primaire), Vert profond `#083B34` (fonds sombres), **Ambre Signal `#F2A93B` (uniquement alertes, badges, délais proches)**, Encre `#15201E` (texte), Papier `#F5F3EE` (fond), Menthe `#E3F0EC`, Gris ardoise `#5E6B67`, Rouge délai `#C0392B`.
- **Jamais de texte blanc sur l'ambre** (contraste 2,0) — texte sur ambre = Encre.
- **Orange Action `#F69320`** (oct. 2026) : bouton principal et élément actif de la barre latérale (classe `.mp-action`, texte **blanc**, gras) ; options choisies (classe `.mp-choix` : fond `#FEF0DC` + liseré `#C2620C`, texte Encre). Le vert reste la structure ; l'ambre reste réservé aux alertes. Variables dans `apps/web/app/globals.css`.
- **Logo** : dossier vert avec étiquette + pastille ambre cochée. Polices : IBM Plex Sans Arabic (UI), Inter (latin, chiffres).
- **Seuls identifiants techniques encore nommés `mouraqib`** (volontairement) : dépôt GitHub, base Docker `mouraqib_dev` / utilisateur `mouraqib` / conteneur (**ne pas renommer** : données). Tout le reste est `malafipro` : packages `@malafipro/*`, domaine `malafipro.ma`, clé `localStorage('malafipro_token')` (l'ancienne clé `mouraqib_token` est relue puis supprimée par `lib/api.ts`).
- **Contact commercial (production)** : WhatsApp +212607167594, contact@malafipro.ma.

## Architecture

```
apps/api/   — Express + TypeScript + Prisma + BullMQ
apps/web/   — Next.js 14 App Router + Tailwind
packages/shared/ — Types TypeScript partagés
```

## Commandes essentielles

```bash
# Démarrer l'environnement local
docker-compose up -d            # PostgreSQL + Redis

# API
cd apps/api
npm run db:migrate              # Appliquer migrations Prisma
npm run db:seed                 # Insérer les 73 tribunaux
npm run dev                     # Dev server :3001

# Frontend
cd apps/web
npm run dev                     # Next.js :3000

# Tests
cd apps/api && npm test         # Vitest (NLP + délais)
```

## Variables d'environnement requises

Copier `.env.example` → `.env` et remplir :
- `DATABASE_URL`, `REDIS_URL`
- `JWT_SECRET` (256 bits min), `CREDENTIALS_ENCRYPTION_KEY` (32 bytes hex)
- `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`
- `OPENAI_API_KEY` (fallback NLP)
- `CONTACT_COMMERCIAL_TEL`, `CONTACT_COMMERCIAL_EMAIL` (vente directe : contact affiché aux avocats)
- `WHATSAPP_APP_SECRET` (facultatif : signature des webhooks Meta)

## Structure API

| Route | Description |
|-------|-------------|
| POST `/api/v1/auth/register` | Créer un compte |
| POST `/api/v1/auth/login` | Connexion → JWT |
| GET `/api/v1/dossiers` | Liste dossiers surveillés |
| POST `/api/v1/dossiers` | Ajouter un dossier |
| GET `/api/v1/echeances` | Délais en cours |
| PATCH `/api/v1/echeances/:id/complete` | Marquer fait |
| GET `/api/v1/dashboard/stats` | KPIs dashboard |
| GET `/api/v1/webhooks/whatsapp` | Vérification webhook Meta |
| GET `/api/v1/abonnements/current` | Offre, état, contact commercial |
| GET/POST `/api/v1/admin/comptes` | Commercial : comptes, offres (rôle ADMIN) |
| POST `/api/v1/admin/comptes/:id/paiements` | Commercial : paiement reçu (virement, chèque) |
| GET `/api/v1/admin/sante` | Santé de la chaîne des délais |
| POST `/api/v1/admin/comptes/:id/activer` | Activer une demande d'inscription (offre, période offerte) |
| POST `/api/v1/admin/comptes/:id/desactiver` · `/reactiver` | Couper / rouvrir l'accès (sessions fermées, plus de synchro ni d'alertes) |
| DELETE `/api/v1/admin/demandes/:id` | Refuser une demande (supprimée) |
| GET/POST/DELETE `/api/v1/admin/depenses` · GET `/admin/compta?annee=` | Comptabilité : dépenses et synthèse mensuelle |

## Points d'attention critiques

1. **Scraping** : les sélecteurs CSS dans `mahakimScraper.ts` sont à adapter après analyse manuelle de mahakim.ma
2. **Délais légaux** : faire valider `delaiRules.ts` par un avocat marocain avant prod
3. **Vente directe** : pas de paiement en ligne. L'inscription sur le site crée une **demande** (`User.statut = EN_ATTENTE`, connexion refusée) ; le commercial l'appelle puis l'active dans `/admin` (onglet طلبات التسجيل). Il peut aussi créer un compte à la main (lien d'activation). Offres dans `services/abonnements/offres.ts`
4. **Credentials mahakim** : actuellement stockées en mémoire → ajouter colonnes chiffrées en base pour prod
5. **WhatsApp** : vérifier les numéros OTP avant tout envoi

## Conventions

- Toujours TypeScript strict.
- Zod pour valider toutes les entrées API.
- Chaque service dans `apps/api/src/services/`.
- Ne jamais logger les données sensibles (numéros de dossier, noms).
- Spécification d'origine : `MOURAQIB_BUILD_SPEC.md` (nom de fichier historique, conservé).
- ⚠️ Windows ignore la casse des noms de fichiers : un import doit avoir exactement la même casse que le fichier, sinon l'API plante sous Linux (Railway/Docker). Pour renommer en changeant seulement la casse : `git mv A.ts tmp.ts` puis `git mv tmp.ts a.ts`. Ne jamais créer deux fichiers qui ne diffèrent que par la casse (ex. `CLAUDE.md` / `claude.md`).

## Prisma

```bash
# Après modification du schema
npx prisma generate
npx prisma migrate dev --name <description>
```

## Workers BullMQ

Les workers démarrent automatiquement avec le serveur. Queues :
- `scraper` — Playwright scraping mahakim.ma (concurrency 1)
- `nlp` — Classification Arabic rules + GPT-4o-mini
- `deadlines` — Calcul et mise à jour des délais
- `alerts` — Envoi WhatsApp (retry 3x)

Scheduler cron : scraping 4h, NLP 30min, alertes 5min, digest 7h, délais 1h.
