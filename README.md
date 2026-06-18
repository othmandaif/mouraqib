# Mouraqib — مراقب

SaaS de surveillance judiciaire pour avocats marocains. Surveille automatiquement les dossiers sur **mahakim.ma**, calcule les délais procéduraux (CPC marocain), et envoie des alertes **WhatsApp** en temps réel.

---

## Fonctionnalités implémentées ✅

- **Authentification JWT** avec sessions révocables en base
- **Scraping mahakim.ma** via Playwright (Chromium headless)
- **NLP arabe** : 20 règles regex + fallback GPT-4o-mini
- **Calcul délais CPC** : APPEL, OPPOSITION, CASSATION, RÉFÉRÉ
- **Alertes WhatsApp** via Meta Cloud API
- **Digest matinal** quotidien (7h Maroc)
- **Vérification OTP WhatsApp** avant envoi
- **Paiement CMI** (SHA-512 HMAC, plans SOLO/PRO/CABINET)
- **Limites par plan** (5 / 20 / illimité dossiers)
- **Workers BullMQ** : scraper → NLP → délais → alertes (pipeline complet)
- **Dashboard KPIs** : dossiers actifs, délais critiques, événements du jour
- **Interface Next.js 14** complète : dashboard, dossiers, échéances, alertes, paramètres
- **73 tribunaux marocains** seedés en base
- **Tests unitaires** NLP + délais (Vitest)

## Fonctionnalités manquantes

### Critiques 🔴
| Feature | Fichier concerné | Note |
|---------|-----------------|------|
| Sélecteurs CSS mahakim.ma | `apps/api/src/services/scraper/mahakimScraper.ts` | À adapter après analyse manuelle |
| Stockage credentials en base | `apps/api/src/services/scraper/mahakimAuth.ts` | Actuellement in-memory |
| Contrat CMI | — | Nécessite accord commercial CMI Maroc |
| Validation délais CPC | `apps/api/src/services/deadlines/delaiRules.ts` | Faire relire par un avocat |
| Variables d'environnement prod | `.env` | Non configurées |

### Importantes 🟠
- Tests E2E (Playwright ou Cypress)
- Refresh token (JWT expire, pas de renouvellement)
- Rate limiting par IP
- Pagination sur toutes les listes
- Export PDF des échéances
- Sauvegarde base de données automatique
- Monitoring erreurs (Sentry)
- Logs structurés en production
- RGPD : suppression compte + données

### Futures 🟡
- Application mobile (React Native)
- Multi-avocats par cabinet
- Intégration Telegram en plus de WhatsApp
- OCR documents juridiques
- IA analyse pièces

---

## Démarrage rapide

### Prérequis

- Node.js 20+
- Docker + Docker Compose
- Un compte Meta Developer (WhatsApp API)
- Un compte OpenAI (clé API GPT-4o-mini)

### 1. Cloner le dépôt

```bash
git clone https://github.com/othmandaif/mouraqib.git
cd mouraqib
npm install          # installe tous les workspaces
```

### 2. Variables d'environnement

```bash
cp apps/api/.env.example apps/api/.env
```

Remplir `apps/api/.env` (voir tableau complet ci-dessous).

### 3. Démarrer PostgreSQL + Redis

```bash
docker-compose up -d postgres redis
```

### 4. Migrations et seed

```bash
cd apps/api
npm run db:migrate   # crée les tables
npm run db:seed      # insère les 73 tribunaux
```

### 5. Démarrer les serveurs de développement

```bash
# Terminal 1 — API (port 3001)
cd apps/api && npm run dev

# Terminal 2 — Frontend (port 3000)
cd apps/web && npm run dev
```

Ouvrir http://localhost:3000

### 6. Lancer les tests

```bash
cd apps/api && npm test
```

---

## Variables d'environnement

Fichier : `apps/api/.env`

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@localhost:5432/mouraqib` |
| `REDIS_URL` | ✅ | `redis://localhost:6379` |
| `JWT_SECRET` | ✅ | Chaîne aléatoire 256 bits minimum |
| `CREDENTIALS_ENCRYPTION_KEY` | ✅ | 32 bytes en hex (64 caractères) |
| `WHATSAPP_PHONE_NUMBER_ID` | ✅ | ID numéro Meta Business |
| `WHATSAPP_ACCESS_TOKEN` | ✅ | Token d'accès permanent Meta |
| `WHATSAPP_VERIFY_TOKEN` | ✅ | Token de vérification webhook Meta |
| `OPENAI_API_KEY` | ✅ | Clé API OpenAI (fallback NLP) |
| `CMI_MERCHANT_ID` | 🟠 | ID marchand CMI (paiement) |
| `CMI_STORE_KEY` | 🟠 | Clé secrète boutique CMI |
| `CMI_OK_URL` | 🟠 | URL redirect après paiement réussi |
| `CMI_FAIL_URL` | 🟠 | URL redirect après paiement échoué |
| `PORT` | — | Port API (défaut : 3001) |
| `NODE_ENV` | — | `development` ou `production` |

Fichier : `apps/web/.env.local`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL de l'API (ex: `http://localhost:3001`) |

---

## Architecture générale

```
┌─────────────────────────────────────────────────────┐
│                   Next.js 14 (web)                   │
│           Dashboard, Dossiers, Échéances              │
└────────────────────┬────────────────────────────────┘
                     │ HTTP REST /api/v1/*
┌────────────────────▼────────────────────────────────┐
│              Express API (apps/api)                  │
│   Auth · Dossiers · Échéances · Alertes · CMI        │
└──────┬─────────────────────────────┬────────────────┘
       │                             │
┌──────▼──────┐              ┌───────▼───────┐
│  PostgreSQL  │              │     Redis      │
│   (Prisma)   │              │   (BullMQ)     │
└─────────────┘              └───────┬───────┘
                                     │
        ┌────────────────────────────┼──────────────────────┐
        │                            │                      │
┌───────▼───────┐          ┌─────────▼─────┐    ┌──────────▼──────┐
│ scraperWorker  │          │  nlpWorker     │    │  alertWorker    │
│  (Playwright)  │──────────▶  (Regex+GPT)  │────▶  (WhatsApp)    │
└───────────────┘          └───────────────┘    └─────────────────┘
       ↕                                                ↕
  mahakim.ma                                   Meta Cloud API
```

**Pipeline automatique** (4h→30min→5min) :
1. `scraperWorker` scrape mahakim.ma → événements bruts
2. `nlpWorker` classifie les événements (regex arabe → GPT fallback)
3. `deadlineWorker` calcule les délais CPC
4. `alertWorker` envoie les alertes WhatsApp

---

## Structure complète des dossiers

```
mouraqib/
├── apps/
│   ├── api/                         # Backend Express
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Schéma base de données (10 modèles)
│   │   │   ├── seed.ts              # Seed 73 tribunaux marocains
│   │   │   └── migrations/          # Migrations Prisma générées
│   │   ├── src/
│   │   │   ├── server.ts            # Point d'entrée API, Express app
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts          # requireAuth (JWT + session DB)
│   │   │   │   └── subscription.ts  # checkDossierLimit, requireActiveSubscription
│   │   │   ├── routes/
│   │   │   │   ├── index.ts         # Montage de tous les routeurs
│   │   │   │   ├── auth.ts          # register, login, logout, me, OTP WhatsApp
│   │   │   │   ├── dossiers.ts      # CRUD dossiers + scraping manuel
│   │   │   │   ├── echeances.ts     # Liste échéances, mark complete
│   │   │   │   ├── alertes.ts       # Historique alertes
│   │   │   │   ├── abonnements.ts   # Plans, checkout CMI, callback webhook
│   │   │   │   ├── dashboard.ts     # KPIs statistiques
│   │   │   │   ├── webhooks.ts      # Meta WhatsApp webhook verify + receive
│   │   │   │   └── admin.ts         # Backoffice admin (stats, plans, queues)
│   │   │   ├── services/
│   │   │   │   ├── scraper/
│   │   │   │   │   ├── mahakimScraper.ts   # Playwright scraping mahakim.ma
│   │   │   │   │   └── mahakimAuth.ts      # Gestion credentials chiffrés
│   │   │   │   ├── nlp/
│   │   │   │   │   ├── arabicRulesClassifier.ts  # 20 règles regex arabes
│   │   │   │   │   ├── llmClassifier.ts          # GPT-4o-mini fallback
│   │   │   │   │   ├── nlpService.ts             # Orchestration batch NLP
│   │   │   │   │   └── __tests__/
│   │   │   │   │       └── arabicRulesClassifier.test.ts  # 15 cas de test
│   │   │   │   ├── deadlines/
│   │   │   │   │   ├── delaiRules.ts             # Règles CPC marocain
│   │   │   │   │   ├── deadlineService.ts        # Génération + mise à jour échéances
│   │   │   │   │   └── __tests__/
│   │   │   │   │       └── delaiRules.test.ts    # 10 cas de test
│   │   │   │   ├── whatsapp/
│   │   │   │   │   └── whatsappService.ts        # Meta Cloud API, normalisation numéros
│   │   │   │   ├── alerts/
│   │   │   │   │   └── alertService.ts           # Envoi alertes, digest, retry
│   │   │   │   └── payment/
│   │   │   │       └── cmiPayment.ts             # Hash SHA-512, form CMI, vérif callback
│   │   │   ├── jobs/
│   │   │   │   ├── queues.ts                     # 4 files BullMQ + connexion Redis
│   │   │   │   ├── scheduler.ts                  # Crons : 4h, 30min, 5min, 6h UTC, 1h
│   │   │   │   └── workers/
│   │   │   │       ├── scraperWorker.ts          # Concurrency 1, déclenche NLP
│   │   │   │       ├── nlpWorker.ts              # Déclenche délais + alertes
│   │   │   │       └── alertWorker.ts            # send-pending, digest, nouveaux-événements
│   │   │   └── utils/
│   │   │       ├── dateUtils.ts                  # joursRestants, parseArabicDate, formatDate
│   │   │       └── logger.ts                     # Winston (JSON prod, colorisé dev)
│   │   ├── vitest.config.ts                      # Config tests unitaires
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── web/                         # Frontend Next.js 14
│       ├── app/
│       │   ├── layout.tsx           # Root layout HTML
│       │   ├── page.tsx             # Landing page (pricing MAD)
│       │   ├── (auth)/              # Pages sans sidebar
│       │   │   ├── login/page.tsx   # Formulaire connexion → JWT localStorage
│       │   │   └── register/page.tsx # Formulaire inscription
│       │   └── (app)/              # Pages avec sidebar (auth requise)
│       │       ├── layout.tsx       # Sidebar + ToastProvider + guard auth
│       │       ├── dashboard/page.tsx      # KPIs + délais critiques + dossiers
│       │       ├── dossiers/
│       │       │   ├── page.tsx            # Liste + ajout inline + scraping manuel
│       │       │   └── [id]/page.tsx       # Détail dossier (événements RTL + échéances)
│       │       ├── echeances/page.tsx      # Échéances groupées par urgence 🔴🟠🟡
│       │       ├── alertes/page.tsx        # Historique alertes colorisé
│       │       ├── parametres/
│       │       │   ├── page.tsx            # Profil + abonnement + lien WhatsApp
│       │       │   └── whatsapp/page.tsx   # Vérification OTP WhatsApp (2 étapes)
│       │       └── abonnement/
│       │           ├── page.tsx            # Sélection plan + formulaire CMI
│       │           ├── success/page.tsx    # Confirmation paiement réussi
│       │           └── echec/page.tsx      # Échec paiement + retry
│       ├── components/
│       │   └── Toast.tsx            # ToastProvider + useToast, auto-dismiss 4s
│       ├── hooks/
│       │   ├── useAuth.ts           # État user, login(), logout()
│       │   └── useApi.ts            # Hook fetch générique loading/error/data
│       ├── lib/
│       │   └── api.ts               # apiFetch<T>(), Bearer token, redirect 401
│       ├── next.config.ts           # Rewrite /api/* → API backend
│       └── package.json
│
├── packages/
│   └── shared/
│       └── types/
│           ├── dossier.ts           # TypeProcedure, DossierSummary, EcheanceSummary
│           └── evenement.ts         # TypeEvenement union, labels arabes avec emojis
│
├── docker-compose.yml               # PostgreSQL + Redis + API + Web
├── railway.toml                     # Déploiement Railway.app
├── CLAUDE.md                        # Instructions pour Claude Code
└── README.md                        # Ce fichier
```

---

## Description de chaque fichier

### Backend API (`apps/api/src/`)

#### `server.ts`
Point d'entrée de l'API Express. Configure CORS, body parser JSON, monte tous les routeurs sous `/api/v1/`, importe les workers (démarrage automatique), démarre le scheduler cron, lance le serveur sur `PORT` (défaut 3001).

#### `middleware/auth.ts`
- `requireAuth` : vérifie le JWT dans `Authorization: Bearer`, contrôle que la session existe en base (révocation server-side), injecte `req.userId`.
- `requireRole(...roles)` : restreint aux rôles ADMIN.

#### `middleware/subscription.ts`
- `checkDossierLimit` : bloque si l'utilisateur a atteint la limite de dossiers de son plan (GRATUIT=5, SOLO=20, PRO/CABINET=illimité).
- `requireActiveSubscription` : bloque si pas d'abonnement actif.

#### `routes/auth.ts`
- `POST /register` : crée compte + abonnement GRATUIT + session JWT.
- `POST /login` : vérifie password bcrypt → JWT 30j + session DB.
- `POST /logout` : supprime session DB (JWT révoqué).
- `GET /me` : retourne profil + abonnement courant.
- `POST /whatsapp/send-otp` : génère OTP 6 chiffres, envoie via WhatsApp.
- `POST /whatsapp/verify-otp` : vérifie OTP, marque `whatsappVerifie=true`.

#### `routes/dossiers.ts`
- `GET /` : liste dossiers de l'utilisateur.
- `POST /` : ajoute dossier (vérifie limite plan).
- `GET /:id` : détail + événements du dossier.
- `PATCH /:id` : mise à jour dossier.
- `DELETE /:id` : supprime dossier.
- `POST /:id/scraper` : déclenche scraping manuel immédiat.
- `GET /:id/evenements` : événements bruts du dossier.

#### `routes/echeances.ts`
- `GET /` : liste des échéances en cours.
- `GET /critiques` : échéances à moins de 7 jours.
- `PATCH /:id/complete` : marque une échéance comme complète.

#### `routes/abonnements.ts`
- `GET /current` : abonnement actif de l'utilisateur.
- `GET /plans` : liste des plans avec tarifs.
- `POST /checkout` : génère le formulaire HTML CMI pour redirection vers la page de paiement.
- `POST /callback/cmi` : webhook CMI après paiement → active le plan.

#### `routes/dashboard.ts`
- `GET /stats` : retourne totalDossiers, delaisCritiques, evenementsAujourdhui, renvoisCetteSemaine.

#### `routes/webhooks.ts`
- `GET /whatsapp` : vérification challenge Meta (hub.challenge).
- `POST /whatsapp` : réception messages entrants WhatsApp (loggés, extensible).

#### `routes/admin.ts`
Protégé par `requireRole('ADMIN')`.
- `GET /stats` : statistiques globales (utilisateurs, dossiers, abonnements).
- `GET /users` : liste tous les utilisateurs.
- `POST /scrape/:dossierId` : force scraping d'un dossier.
- `POST /nlp` : force traitement NLP.
- `GET /queues` : état des files BullMQ.
- `PATCH /users/:id/plan` : changer le plan d'un utilisateur.

#### `services/scraper/mahakimScraper.ts`
Utilise Playwright avec navigateur Chromium. Se connecte à mahakim.ma avec les credentials de l'utilisateur, navigue vers le dossier, parse le HTML avec Cheerio pour extraire les événements. Délai 2.5s entre actions pour éviter détection. ⚠️ Les sélecteurs CSS sont des placeholders à adapter.

#### `services/scraper/mahakimAuth.ts`
Chiffrement AES-256-CBC pour les credentials. Classe `MahakimAuth` avec `storeCredentials()` et `getCredentials()`. ⚠️ Stockage in-memory (Map) — à migrer vers colonnes chiffrées en base pour la production.

#### `services/nlp/arabicRulesClassifier.ts`
20 règles regex ordonnées du plus spécifique au plus général. Couvre : JUGEMENT_RENDU, RENVOI, MISE_EN_DELIBERE, EXPERTISE, NOTIFICATION_PARTIE, APPEL_INTERJET, ORDONNANCE_RENDUE, CASSATION, AUDIENCE_TENUE, AUTRE. Retourne `ClassificationResult` avec confiance 0-1 et méthode `REGEX`.

#### `services/nlp/llmClassifier.ts`
Appel GPT-4o-mini via OpenAI SDK. Prompt système en français + arabe, `response_format: json_object`, temperature 0, max_tokens 80. Utilisé uniquement si la confiance regex < 0.75.

#### `services/nlp/nlpService.ts`
Récupère en batch de 100 les événements `statutNLP=EN_ATTENTE`, classe avec les règles puis LLM si nécessaire, met à jour en base.

#### `services/deadlines/delaiRules.ts`
Règles CPC marocain :
- JUGEMENT_RENDU → APPEL 30j, OPPOSITION 10j (REFERE : APPEL 15j)
- NOTIFICATION_PARTIE → APPEL 30j
- APPEL_INTERJET → CASSATION 30j
- ORDONNANCE_RENDUE → APPEL 15j
- MISE_EN_DELIBERE → AUTRE 60j

Calcule aussi `estCritique` (≤ 7 jours restants).

#### `services/deadlines/deadlineService.ts`
- `genererEcheances(dossierId)` : génère les échéances à partir des événements classifiés.
- `mettreAJourStatuts()` : passe les échéances expirées à `EXPIRE`.
- `getEcheancesUtilisateur(userId)` : liste pour le frontend.
- `marquerComplete(echeanceId, userId)` : marque comme faite.

#### `services/whatsapp/whatsappService.ts`
Appels Meta Cloud API `graph.facebook.com/v19.0`. Méthodes :
- `envoyerAlerteEvenement()` : alerte nouvel événement sur dossier.
- `envoyerAlerteDelai()` : alerte délai critique imminent.
- `envoyerDigestQuotidien()` : résumé matin avec tous les délais du jour.
- `envoyerCodeVerification()` : OTP pour vérifier le numéro WhatsApp.

Normalise les numéros marocains (0600... → 212600...).

#### `services/alerts/alertService.ts`
- `traiterNouveauxEvenements()` : pour chaque événement `estNouvel:true`, envoie WhatsApp + marque traité.
- `envoyerAlertesEnAttente()` : retry queue (max 3 tentatives, backoff).
- `genererAlertesDelaisCritiques()` : crée alertes pour échéances < 7j (déduplication).
- `envoyerDigestQuotidien()` : digest pour tous les utilisateurs avec WhatsApp vérifié.

#### `services/payment/cmiPayment.ts`
- Hash SHA-512 HMAC sur les champs CMI triés alphabétiquement.
- `generateCMIForm()` : génère le HTML du formulaire POST vers CMI.
- `verifyCMICallback()` : vérifie l'authenticité du callback webhook CMI.
- Plans : SOLO=190 MAD/mois, PRO=390 MAD/mois, CABINET=790 MAD/mois.

#### `jobs/queues.ts`
4 files BullMQ : `scraperQueue`, `nlpQueue`, `alertQueue`, `deadlineQueue`. Connexion Redis partagée. Options par défaut : removeOnComplete 10, removeOnFail 50.

#### `jobs/scheduler.ts`
Utilise `upsertJobScheduler` de BullMQ pour créer 5 crons :
- Scraping : toutes les 4 heures
- NLP : toutes les 30 minutes
- Alertes pending : toutes les 5 minutes
- Digest matinal : 6h UTC (= 7h Maroc hiver, 7h été)
- Mise à jour délais : toutes les heures

#### `jobs/workers/scraperWorker.ts`
Concurrency 1 (Playwright = 1 browser à la fois). Récupère tous les dossiers actifs, scrape chacun, puis ajoute un job NLP dans la file.

#### `jobs/workers/nlpWorker.ts`
Lance `nlpService.traiterEvenementsEnAttente()`, puis enchaîne `deadlineQueue` et `alertQueue('nouveaux-evenements')` avec délais (1s et 2s) pour laisser le temps d'écrire en base.

#### `jobs/workers/alertWorker.ts`
Gère 3 types de jobs :
- `send-pending` : `alertService.envoyerAlertesEnAttente()`
- `digest-quotidien` : `alertService.envoyerDigestQuotidien()`
- `nouveaux-evenements` : `alertService.traiterNouveauxEvenements()`

Gère aussi le deadlineWorker (`generate-deadlines`, `update-statuses`).

#### `utils/dateUtils.ts`
- `joursRestants(date)` : nombre de jours jusqu'à une date.
- `parseArabicDate(str)` : parse une date en chiffres arabes (٢٠٢٤...).
- `normalizeArabicNumerals(str)` : convertit ٠١٢... → 012...
- `formatDateFr/Ar(date)` : formatage localisé.

#### `utils/logger.ts`
Winston logger. Production : JSON structuré. Développement : colorisé avec timestamps. Niveaux : error, warn, info, debug.

### Frontend Web (`apps/web/`)

#### `app/page.tsx`
Page d'accueil publique. Présentation du produit avec 3 plans tarifaires en MAD (GRATUIT, SOLO 190 MAD, PRO 390 MAD). Liens vers login et register.

#### `app/(auth)/login/page.tsx`
Formulaire email/password → appel `POST /api/v1/auth/login` → stocke JWT dans localStorage → redirige vers `/dashboard`.

#### `app/(auth)/register/page.tsx`
Formulaire nom/barreaux/email/password → `POST /api/v1/auth/register` → login automatique.

#### `app/(app)/layout.tsx`
Layout avec sidebar fixe (navigation, profil, déconnexion). Guard d'authentification : redirige vers `/login` si pas de user. Encapsule dans `ToastProvider`. Affiche alerte orange si WhatsApp non vérifié.

#### `app/(app)/dashboard/page.tsx`
4 cartes KPI (dossiers, délais critiques, événements du jour, renvois semaine). Bannière rouge si délais critiques. Grille des dossiers avec statut.

#### `app/(app)/dossiers/page.tsx`
Liste des dossiers avec formulaire inline d'ajout (numéro, tribunal, type procédure). Bouton "Scraper maintenant" par dossier.

#### `app/(app)/dossiers/[id]/page.tsx`
Détail d'un dossier. Onglets : Échéances (timeline) + Événements (texte arabe RTL, badges de classification NLP).

#### `app/(app)/echeances/page.tsx`
Toutes les échéances groupées : 🔴 Critiques (< 7j), 🟠 Urgentes (< 30j), 🟡 Normales. Bouton "Marquer fait" par échéance.

#### `app/(app)/alertes/page.tsx`
Historique des alertes avec statut colorisé (ENVOYEE=vert, EN_ATTENTE=orange, ECHEC=rouge).

#### `app/(app)/parametres/page.tsx`
3 sections : Profil (nom, email), Abonnement (plan actuel + bouton upgrade), WhatsApp (lien vers vérification).

#### `app/(app)/parametres/whatsapp/page.tsx`
Flux 2 étapes : (1) saisir numéro marocain → envoie OTP WhatsApp, (2) saisir code OTP → vérifie et active.

#### `app/(app)/abonnement/page.tsx`
Sélection plan avec boutons radio. Soumission → `POST /api/v1/abonnements/checkout` → reçoit formulaire HTML CMI → injection dans DOM → auto-submit vers CMI.

#### `app/(app)/abonnement/success/page.tsx`
Page de retour succès CMI. Confirme activation et liste les fonctionnalités maintenant actives.

#### `app/(app)/abonnement/echec/page.tsx`
Page de retour échec CMI. Explique les causes possibles et propose de réessayer.

#### `components/Toast.tsx`
Système de notifications toast. `ToastProvider` avec contexte React. `useToast()` expose `toast(message, type)`. 4 types : success, error, info, warning. Auto-dismiss 4 secondes. Bouton fermeture manuel.

#### `hooks/useAuth.ts`
Gestion état authentification. Charge l'utilisateur depuis `GET /api/v1/auth/me` au démarrage. `login(token)` stocke JWT. `logout()` appelle l'API puis nettoie localStorage.

#### `hooks/useApi.ts`
Hook générique `useApi<T>(url)` : state loading/error/data + fonction `refetch()`. Appelle `apiFetch` automatiquement.

#### `lib/api.ts`
`apiFetch<T>(path, options)` : ajoute automatiquement `Authorization: Bearer <token>` depuis localStorage. Redirige vers `/login` si réponse 401.

#### `next.config.ts`
Rewrite : toutes les requêtes `/api/*` sont redirigées vers `NEXT_PUBLIC_API_URL/api/v1/*`. Permet au frontend de ne pas connaître l'URL de l'API en production.

### Packages partagés (`packages/shared/`)

#### `types/dossier.ts`
Types TypeScript partagés API ↔ Web :
- `TypeProcedure` : enum procédures (CIVIL, COMMERCIAL, PÉNAL...)
- `TypeDelai` : enum types de délais (APPEL, OPPOSITION, CASSATION...)
- `DossierSummary` : résumé dossier pour les listes
- `EcheanceSummary` : résumé échéance pour les listes

#### `types/evenement.ts`
- `TypeEvenement` : union type de tous les types d'événements
- `EvenementBrut` : événement tel que retourné par le scraper
- `TYPE_EVENEMENT_LABELS` : dictionnaire type → label arabe + emoji pour l'affichage

### Racine du projet

#### `docker-compose.yml`
Services : postgres (port 5432), redis (port 6379), api (port 3001), web (port 3000). Volumes persistants pour postgres. Variables d'environnement par service.

#### `railway.toml`
Configuration Railway.app : 2 services (api et web), commandes de build et start, variables d'environnement requises, healthcheck paths.

#### `CLAUDE.md`
Instructions pour Claude Code : architecture, commandes essentielles, points d'attention critiques, workflow Prisma.

---

## Référence API complète

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/v1/auth/register` | — | Créer un compte |
| POST | `/api/v1/auth/login` | — | Connexion → JWT |
| POST | `/api/v1/auth/logout` | ✅ | Déconnexion (révoque session) |
| GET | `/api/v1/auth/me` | ✅ | Profil utilisateur |
| POST | `/api/v1/auth/whatsapp/send-otp` | ✅ | Envoyer code OTP WhatsApp |
| POST | `/api/v1/auth/whatsapp/verify-otp` | ✅ | Vérifier code OTP |
| GET | `/api/v1/dossiers` | ✅ | Liste des dossiers |
| POST | `/api/v1/dossiers` | ✅ | Créer un dossier |
| GET | `/api/v1/dossiers/:id` | ✅ | Détail d'un dossier |
| PATCH | `/api/v1/dossiers/:id` | ✅ | Modifier un dossier |
| DELETE | `/api/v1/dossiers/:id` | ✅ | Supprimer un dossier |
| POST | `/api/v1/dossiers/:id/scraper` | ✅ | Scraping manuel immédiat |
| GET | `/api/v1/dossiers/:id/evenements` | ✅ | Événements du dossier |
| GET | `/api/v1/echeances` | ✅ | Liste des échéances |
| GET | `/api/v1/echeances/critiques` | ✅ | Échéances urgentes (< 7j) |
| PATCH | `/api/v1/echeances/:id/complete` | ✅ | Marquer échéance comme faite |
| GET | `/api/v1/alertes` | ✅ | Historique des alertes |
| GET | `/api/v1/abonnements/current` | ✅ | Abonnement actif |
| GET | `/api/v1/abonnements/plans` | ✅ | Liste des plans tarifaires |
| POST | `/api/v1/abonnements/checkout` | ✅ | Générer formulaire paiement CMI |
| POST | `/api/v1/abonnements/callback/cmi` | — | Webhook callback CMI |
| GET | `/api/v1/dashboard/stats` | ✅ | KPIs tableau de bord |
| GET | `/api/v1/webhooks/whatsapp` | — | Vérification webhook Meta |
| POST | `/api/v1/webhooks/whatsapp` | — | Réception messages WhatsApp |
| GET | `/api/v1/admin/stats` | 🔒 | Stats globales (admin) |
| GET | `/api/v1/admin/users` | 🔒 | Liste utilisateurs (admin) |
| POST | `/api/v1/admin/scrape/:id` | 🔒 | Force scraping (admin) |
| POST | `/api/v1/admin/nlp` | 🔒 | Force NLP (admin) |
| GET | `/api/v1/admin/queues` | 🔒 | État files BullMQ (admin) |
| PATCH | `/api/v1/admin/users/:id/plan` | 🔒 | Changer plan utilisateur (admin) |

✅ = JWT requis | 🔒 = Admin seulement | — = Public

---

## Déploiement

### Railway.app (recommandé)

```bash
# Installer Railway CLI
npm install -g @railway/cli
railway login
railway init

# Lier les variables d'environnement
railway variables set DATABASE_URL=...
railway variables set JWT_SECRET=...
# ... autres variables

railway up
```

### Docker Compose (production)

```bash
docker-compose -f docker-compose.yml up -d
```

### Variables obligatoires en production

En plus des variables de développement, ajouter :
- `NODE_ENV=production`
- `CMI_OK_URL=https://votre-domaine.com/abonnement/success`
- `CMI_FAIL_URL=https://votre-domaine.com/abonnement/echec`

---

## Points d'attention critiques ⚠️

1. **Sélecteurs CSS** : `mahakimScraper.ts` utilise des sélecteurs CSS placeholder. Il faut inspecter manuellement le HTML de mahakim.ma et adapter les sélecteurs avant toute utilisation en production.

2. **Délais légaux** : `delaiRules.ts` implémente les délais du CPC marocain selon les sources disponibles. Ces règles **doivent être validées par un avocat marocain** avant mise en production — une erreur ici peut avoir des conséquences juridiques graves.

3. **Contrat CMI** : L'intégration CMI nécessite un contrat commercial avec le Centre Monétique Interbancaire Maroc. Les credentials CMI ne peuvent pas être obtenus sans ce contrat.

4. **Credentials mahakim.ma** : Actuellement stockés en mémoire (Map JavaScript) — ils sont perdus à chaque redémarrage du serveur. Pour la production, ajouter des colonnes `mahakimLoginChiffre` et `mahakimPasswordChiffre` dans le modèle `User` et utiliser `mahakimAuth.ts` pour le chiffrement/déchiffrement.

5. **RGPD** : Les données traitées (noms de parties, jugements) sont des données personnelles et potentiellement sensibles. Implémenter : politique de confidentialité, droit à l'effacement, consentement explicite, DPO si nécessaire.
