# MOURAQIB — Spécification Technique Complète
## Agent de Surveillance Procédurale pour Avocats Marocains

> **Pour l'agent IA / Claude Code :** Ce document est un guide d'implémentation exhaustif. Lis-le intégralement avant d'écrire la moindre ligne de code. Chaque section est une étape séquentielle. Ne passe à l'étape suivante que lorsque la précédente est testée et validée.

---

## TABLE DES MATIÈRES

1. [Vue d'ensemble du projet](#1-vue-densemble)
2. [Stack technique recommandée](#2-stack-technique)
3. [Architecture système](#3-architecture-système)
4. [Phase 1 — Infrastructure & Base de données](#4-phase-1--infrastructure--base-de-données)
5. [Phase 2 — Collecte (Scraping mahakim.ma)](#5-phase-2--collecte-scraping-mahakimma)
6. [Phase 3 — Moteur NLP (Compréhension arabe)](#6-phase-3--moteur-nlp-compréhension-arabe)
7. [Phase 4 — Moteur de délais procéduraux](#7-phase-4--moteur-de-délais-procéduraux)
8. [Phase 5 — Système d'alertes WhatsApp](#8-phase-5--système-dalertes-whatsapp)
9. [Phase 6 — API Backend](#9-phase-6--api-backend)
10. [Phase 7 — Interface Web (Dashboard)](#10-phase-7--interface-web-dashboard)
11. [Phase 8 — Système d'abonnement & Paiement](#11-phase-8--système-dabonnement--paiement)
12. [Phase 9 — Jobs planifiés & Orchestration](#12-phase-9--jobs-planifiés--orchestration)
13. [Phase 10 — Tests & Déploiement](#13-phase-10--tests--déploiement)
14. [Variables d'environnement](#14-variables-denvironnement)
15. [Structure des dossiers](#15-structure-des-dossiers)

---

## 1. Vue d'ensemble

### Objectif
Mouraqib est une plateforme SaaS qui surveille automatiquement les dossiers judiciaires sur le portail mahakim.ma, interprète les événements de procédure en arabe, calcule les délais légaux qui en découlent, et envoie des alertes proactives aux avocats via WhatsApp.

### Flux principal
```
mahakim.ma → Scraper → NLP Arabe → Moteur de délais → WhatsApp
                ↓                        ↓
           Base de données          Dashboard Web
```

### Personas utilisateurs
- **Avocat Solo** : surveille 20–100 dossiers, reçoit alertes sur son téléphone
- **Cabinet** : plusieurs avocats, un associé-gérant voit tous les délais critiques
- **Secrétaire** : peut consulter le dashboard mais ne reçoit pas d'alertes directes

---

## 2. Stack Technique

### Backend
- **Runtime** : Node.js 20+ avec TypeScript
- **Framework** : Express.js ou Fastify
- **Base de données** : PostgreSQL 15+ (principal) + Redis (cache & queues)
- **ORM** : Prisma
- **Job Queue** : BullMQ (sur Redis)
- **Scraping** : Playwright (pour JavaScript rendering) + Cheerio (parsing HTML)
- **NLP** : OpenAI API (GPT-4o-mini pour classification arabe) — voir Phase 3

### Frontend
- **Framework** : Next.js 14 (App Router)
- **UI** : Tailwind CSS + shadcn/ui
- **Graphiques** : Recharts
- **Langue interface** : Arabe (RTL) en priorité, Français secondaire

### Infrastructure
- **Hébergement** : Railway.app ou Render.com (MVP) → AWS/VPS (scale)
- **Base de données** : Supabase (PostgreSQL managé) ou Railway PostgreSQL
- **Redis** : Upstash (serverless) ou Railway Redis
- **Emails** : Resend
- **WhatsApp** : Meta Cloud API (officiel) ou Green API (plus simple pour MVP)

### Paiement
- **CMI** (Centre Monétique Interbancaire) pour cartes marocaines
- **PayPal** comme fallback
- **Stripe** si clients internationaux

---

## 3. Architecture Système

```
┌─────────────────────────────────────────────────────┐
│                   CLIENTS                           │
│   Next.js Dashboard  │  WhatsApp  │  Email          │
└──────────┬──────────────────┬─────────────────────┘
           │                  │
┌──────────▼──────────────────▼─────────────────────┐
│                   API LAYER (Express/Fastify)       │
│  /auth  /dossiers  /alertes  /abonnements           │
└──────────┬─────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│                SERVICES LAYER                        │
│  ScraperService │ NLPService │ DeadlineService       │
│  AlertService   │ AuthService │ SubscriptionService  │
└──────────┬──────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│              DATA LAYER                              │
│  PostgreSQL (données)  │  Redis (cache/queues)        │
└─────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│              BACKGROUND JOBS (BullMQ)                │
│  scrape-dossiers (cron)  │  send-alerts              │
│  classify-events          │  digest-quotidien         │
└─────────────────────────────────────────────────────┘
```

---

## 4. Phase 1 — Infrastructure & Base de données

### 4.1 Initialisation du projet

```bash
# Créer le monorepo
mkdir mouraqib && cd mouraqib
npm init -y
mkdir apps/api apps/web packages/shared

# Backend
cd apps/api
npm init -y
npm install express prisma @prisma/client bullmq ioredis zod bcryptjs jsonwebtoken
npm install -D typescript @types/node @types/express ts-node nodemon

# Frontend
cd ../web
npx create-next-app@latest . --typescript --tailwind --app

# Shared types
cd ../../packages/shared
npm init -y
npm install -D typescript
```

### 4.2 Schéma Prisma (Base de données complète)

Créer le fichier `apps/api/prisma/schema.prisma` :

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── UTILISATEURS ────────────────────────────────────────────────────────────

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  nom           String
  prenom        String
  telephone     String?  // Format: +212XXXXXXXXX
  whatsappNumero String? // Peut différer du téléphone
  whatsappVerifie Boolean @default(false)
  role          UserRole @default(AVOCAT)
  
  cabinet       Cabinet? @relation(fields: [cabinetId], references: [id])
  cabinetId     String?
  
  abonnement    Abonnement?
  dossiers      Dossier[]
  alertes       Alerte[]
  sessions      Session[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([email])
  @@index([cabinetId])
}

enum UserRole {
  AVOCAT
  SECRETAIRE
  ASSOCIE_GERANT
  ADMIN
}

model Cabinet {
  id        String   @id @default(cuid())
  nom       String
  adresse   String?
  ville     String?
  
  membres   User[]
  dossiers  Dossier[]
  abonnement Abonnement?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  @@index([token])
  @@index([userId])
}

// ─── DOSSIERS ────────────────────────────────────────────────────────────────

model Dossier {
  id              String   @id @default(cuid())
  numeroDossier   String   // Numéro sur mahakim.ma
  tribunal        String   // Code tribunal (ex: "TPI_CASA_ANFA")
  typeProcedure   TypeProcedure @default(CIVILE)
  titreAffaire    String?
  partieAdverse   String?
  
  // Suivi
  estActif        Boolean  @default(true)
  derniereVerif   DateTime?
  prochaineVerif  DateTime?
  
  // Relations
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  cabinetId       String?
  cabinet         Cabinet? @relation(fields: [cabinetId], references: [id])
  
  evenements      Evenement[]
  echeances       Echeance[]
  alertes         Alerte[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([numeroDossier, tribunal, userId])
  @@index([userId])
  @@index([numeroDossier])
}

enum TypeProcedure {
  CIVILE
  PENALE
  COMMERCIALE
  ADMINISTRATIVE
  TRAVAIL
  FAMILLE
  REFERE
}

// ─── ÉVÉNEMENTS PROCÉDURAUX ───────────────────────────────────────────────────

model Evenement {
  id                String          @id @default(cuid())
  dossierId         String
  dossier           Dossier         @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  
  // Données brutes de mahakim.ma
  texteArabe        String          // Texte original du greffe en arabe
  dateAudience      DateTime?       // Date de l'audience mentionnée
  datePublicationGreffe DateTime    // Date à laquelle le greffe a publié
  
  // Après classification NLP
  typeEvenement     TypeEvenement?
  sousType          String?
  confiance         Float?          // Score de confiance du classifieur (0-1)
  
  // Métadonnées
  estNouvel         Boolean         @default(true)
  estTraite         Boolean         @default(false)
  raw               Json?           // Données brutes de scraping
  
  echeancesGenerees Echeance[]
  alertes           Alerte[]
  
  createdAt         DateTime        @default(now())
  
  @@index([dossierId])
  @@index([typeEvenement])
  @@index([estTraite])
}

enum TypeEvenement {
  // Renvois & Reports
  RENVOI_SIMPLE              // تأخير
  RENVOI_EXPERT              // إحالة للخبرة
  RENVOI_NOTIFICATION        // تأجيل للتبليغ
  
  // Décisions
  JUGEMENT_RENDU             // صدور الحكم
  MISE_EN_DELIBERE           // حجز للمداولة
  ORDONNANCE_RENDUE
  
  // Notifications
  NOTIFICATION_PARTIE        // تبليغ
  SIGNIFICATION
  
  // Inscriptions & Procédures
  INSCRIPTION_ROLE           // إدراج
  MISE_EN_ETAT
  EXPERTISE_ORDONNEE
  EXPERTISE_DEPOSEE
  
  // Appels & Recours
  APPEL_INTERJET             // طعن بالاستئناف
  POURVOI_CASSATION          // طعن بالنقض
  
  // Clôture
  RADIATION
  PEREMPTION
  DESISTEMENT
  
  // Inconnu
  AUTRE
}

// ─── ÉCHÉANCES & DÉLAIS ───────────────────────────────────────────────────────

model Echeance {
  id              String         @id @default(cuid())
  dossierId       String
  dossier         Dossier        @relation(fields: [dossierId], references: [id], onDelete: Cascade)
  evenementId     String?
  evenement       Evenement?     @relation(fields: [evenementId], references: [id])
  
  typeDelai       TypeDelai
  description     String         // Ex: "Délai d'appel - 30 jours"
  descriptionAr   String?        // En arabe
  
  dateDepart      DateTime       // Point de départ du délai
  dateLimite      DateTime       // Date d'expiration calculée
  
  estCritique     Boolean        @default(false)  // < 7 jours
  estExpire       Boolean        @default(false)
  estComplete     Boolean        @default(false)  // Avocat a coché "fait"
  
  alertesEnvoyees Alerte[]
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  
  @@index([dossierId])
  @@index([dateLimite])
  @@index([estCritique])
}

enum TypeDelai {
  APPEL                // 30 jours (15 en référé)
  OPPOSITION           // 10 jours
  CASSATION            // 30 jours
  TIERCE_OPPOSITION    // 30 jours
  REQUETE_CIVILE       // 3 mois
  NOTIFICATION_JUGEMENT // délai variable
  EXECUTION_JUGEMENT   // 30 jours
  EXPERTISE            // délai fixé par le juge
  AUTRE
}

// ─── ALERTES ─────────────────────────────────────────────────────────────────

model Alerte {
  id            String       @id @default(cuid())
  userId        String
  user          User         @relation(fields: [userId], references: [id])
  dossierId     String?
  dossier       Dossier?     @relation(fields: [dossierId], references: [id])
  evenementId   String?
  evenement     Evenement?   @relation(fields: [evenementId], references: [id])
  echeanceId    String?
  echeance      Echeance?    @relation(fields: [echeanceId], references: [id])
  
  canal         CanalAlerte
  typeAlerte    TypeAlerte
  message       String
  messageAr     String?
  
  statut        StatutAlerte @default(EN_ATTENTE)
  tentatives    Int          @default(0)
  erreur        String?
  
  envoyeAt      DateTime?
  createdAt     DateTime     @default(now())
  
  @@index([userId])
  @@index([statut])
  @@index([canal])
}

enum CanalAlerte {
  WHATSAPP
  EMAIL
  IN_APP
}

enum TypeAlerte {
  NOUVEL_EVENEMENT      // Événement détecté sur mahakim
  DELAI_APPROCHE_7J     // Délai dans 7 jours
  DELAI_APPROCHE_3J     // Délai dans 3 jours
  DELAI_APPROCHE_1J     // Délai demain
  DELAI_EXPIRE          // Délai expiré
  DIGEST_QUOTIDIEN      // Résumé matinal
  RENVOI_DETECTE        // Audience renvoyée (évite déplacement)
}

enum StatutAlerte {
  EN_ATTENTE
  ENVOYEE
  ECHEC
  IGNOREE
}

// ─── ABONNEMENTS ─────────────────────────────────────────────────────────────

model Abonnement {
  id              String            @id @default(cuid())
  userId          String?           @unique
  user            User?             @relation(fields: [userId], references: [id])
  cabinetId       String?           @unique
  cabinet         Cabinet?          @relation(fields: [cabinetId], references: [id])
  
  plan            PlanAbonnement
  statut          StatutAbonnement  @default(ACTIF)
  
  maxDossiers     Int               // -1 = illimité
  
  dateDebut       DateTime          @default(now())
  dateFin         DateTime?
  dateRenouvellement DateTime?
  
  paiements       Paiement[]
  
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

enum PlanAbonnement {
  GRATUIT     // 10 dossiers, sans alertes WhatsApp
  SOLO        // 190 DH/mois, 100 dossiers
  PRO         // 390 DH/mois, illimité + délais
  CABINET     // 790 DH/mois, multi-users
}

enum StatutAbonnement {
  ACTIF
  SUSPENDU
  ANNULE
  EXPIRE
}

model Paiement {
  id              String   @id @default(cuid())
  abonnementId    String
  abonnement      Abonnement @relation(fields: [abonnementId], references: [id])
  
  montant         Float
  devise          String   @default("MAD")
  methode         String   // "CMI", "PAYPAL", "VIREMENT"
  referenceExterne String? // ID de la transaction chez le prestataire
  
  statut          String   // "REUSSI", "ECHEC", "EN_ATTENTE"
  
  createdAt       DateTime @default(now())
}

// ─── RÉFÉRENTIEL TRIBUNAUX ────────────────────────────────────────────────────

model Tribunal {
  id          String   @id @default(cuid())
  code        String   @unique  // Ex: "TPI_CASA_ANFA"
  nom         String   // En français
  nomAr       String   // En arabe
  ville       String
  type        String   // "TPI", "CA", "TCS", "TC", "TA"
  urlMahakim  String?  // URL spécifique sur le portail
  
  @@index([ville])
}
```

### 4.3 Migrations et seed

```bash
# Après avoir créé le schéma
cd apps/api
npx prisma migrate dev --name init
npx prisma generate

# Créer le fichier seed
```

Créer `apps/api/prisma/seed.ts` :

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Insérer les tribunaux marocains principaux
  const tribunaux = [
    { code: 'TPI_CASA_ANFA', nom: 'TPI Casablanca Anfa', nomAr: 'المحكمة الابتدائية الدار البيضاء عين السبع', ville: 'Casablanca', type: 'TPI' },
    { code: 'TPI_CASA_CENTRE', nom: 'TPI Casablanca Centre', nomAr: 'المحكمة الابتدائية الدار البيضاء المركز', ville: 'Casablanca', type: 'TPI' },
    { code: 'CA_CASA', nom: 'Cour d\'Appel de Casablanca', nomAr: 'محكمة الاستئناف الدار البيضاء', ville: 'Casablanca', type: 'CA' },
    { code: 'TPI_RABAT', nom: 'TPI Rabat', nomAr: 'المحكمة الابتدائية الرباط', ville: 'Rabat', type: 'TPI' },
    { code: 'CA_RABAT', nom: 'Cour d\'Appel de Rabat', nomAr: 'محكمة الاستئناف الرباط', ville: 'Rabat', type: 'CA' },
    { code: 'TPI_MARRAKECH', nom: 'TPI Marrakech', nomAr: 'المحكمة الابتدائية مراكش', ville: 'Marrakech', type: 'TPI' },
    { code: 'TPI_FES', nom: 'TPI Fès', nomAr: 'المحكمة الابتدائية فاس', ville: 'Fès', type: 'TPI' },
    { code: 'TC_CASA', nom: 'Tribunal de Commerce Casablanca', nomAr: 'المحكمة التجارية الدار البيضاء', ville: 'Casablanca', type: 'TC' },
    // Ajouter les ~90 autres TPI du Maroc ici
  ]
  
  for (const t of tribunaux) {
    await prisma.tribunal.upsert({
      where: { code: t.code },
      update: t,
      create: t,
    })
  }
  
  console.log('Seed terminé ✓')
}

main().finally(() => prisma.$disconnect())
```

---

## 5. Phase 2 — Collecte (Scraping mahakim.ma)

> **Important :** Avant de coder, vérifie les conditions d'utilisation du portail mahakim.ma. Utilise un délai entre les requêtes (2–3 secondes). Identifie-toi honnêtement dans le User-Agent. Limite les requêtes à 1 requête/2s par IP.

### 5.1 Analyse du portail mahakim.ma

Le portail affiche les informations d'un dossier via une URL de type :
```
https://www.mahakim.ma/fr/suivi-dossier?numero=[NUM_DOSSIER]&tribunal=[CODE]
```

À inspecter manuellement et adapter selon la structure HTML réelle.

### 5.2 Service de scraping

Créer `apps/api/src/services/scraper/mahakimScraper.ts` :

```typescript
import { chromium, Browser, Page } from 'playwright'
import * as cheerio from 'cheerio'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

// Configuration
const CONFIG = {
  BASE_URL: 'https://www.mahakim.ma',
  DELAY_BETWEEN_REQUESTS_MS: 2500,  // Respecter le serveur
  MAX_RETRIES: 3,
  TIMEOUT_MS: 30000,
  USER_AGENT: 'MouraqibBot/1.0 (Lawyer deadline assistant; contact@mouraqib.ma)'
}

export interface DossierData {
  numeroDossier: string
  tribunal: string
  titreAffaire?: string
  evenements: EvenementBrut[]
}

export interface EvenementBrut {
  texteArabe: string
  dateAudience?: Date
  datePublication: Date
  rawHtml?: string
}

export class MahakimScraper {
  private browser: Browser | null = null

  async init() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    logger.info('Browser Playwright initialisé')
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  /**
   * Scrape un dossier unique sur mahakim.ma
   * IMPORTANT: Adapter le sélecteur CSS selon la structure HTML réelle du portail
   */
  async scrapeDossier(numeroDossier: string, tribunal: string): Promise<DossierData | null> {
    if (!this.browser) throw new Error('Browser non initialisé')

    const page = await this.browser.newPage()
    
    try {
      await page.setExtraHTTPHeaders({
        'User-Agent': CONFIG.USER_AGENT
      })

      // Construire l'URL de recherche — ADAPTER selon la structure réelle du portail
      const url = `${CONFIG.BASE_URL}/fr/suivi-dossier?numero=${encodeURIComponent(numeroDossier)}&tribunal=${encodeURIComponent(tribunal)}`
      
      logger.debug(`Scraping: ${url}`)
      
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: CONFIG.TIMEOUT_MS 
      })

      // Attendre que le contenu se charge
      // ADAPTER CE SÉLECTEUR selon le HTML réel de mahakim.ma
      await page.waitForSelector('[data-dossier-content], .dossier-info, #dossier-details', {
        timeout: 10000
      }).catch(() => logger.warn(`Sélecteur dossier non trouvé pour ${numeroDossier}`))

      const html = await page.content()
      return this.parseDossierHtml(html, numeroDossier, tribunal)

    } catch (error) {
      logger.error(`Erreur scraping dossier ${numeroDossier}:`, error)
      return null
    } finally {
      await page.close()
      // Délai de politesse
      await sleep(CONFIG.DELAY_BETWEEN_REQUESTS_MS)
    }
  }

  /**
   * Parser le HTML d'une page dossier
   * IMPORTANT: Adapter les sélecteurs CSS selon la structure HTML réelle
   */
  private parseDossierHtml(html: string, numeroDossier: string, tribunal: string): DossierData {
    const $ = cheerio.load(html)
    const evenements: EvenementBrut[] = []

    // ⚠️ CES SÉLECTEURS SONT DES EXEMPLES — les adapter au HTML réel de mahakim.ma
    // Inspecter manuellement la page pour trouver les bons sélecteurs
    
    // Exemple: chaque ligne d'événement dans un tableau
    $('table.historique-audiences tr, .audience-row, [data-audience]').each((_, el) => {
      const row = $(el)
      
      // Extraire le texte arabe de la mention de greffe
      // ADAPTER selon les colonnes réelles du tableau
      const texteArabe = row.find('.mention-greffe, td:nth-child(3), [data-mention]').text().trim()
      const dateStr = row.find('.date-audience, td:nth-child(1), [data-date]').text().trim()
      const datePubStr = row.find('.date-publication, td:nth-child(2), [data-date-pub]').text().trim()
      
      if (!texteArabe) return

      const dateAudience = parseDateArabe(dateStr)
      const datePublication = parseDateArabe(datePubStr) || new Date()

      evenements.push({
        texteArabe,
        dateAudience: dateAudience || undefined,
        datePublication,
        rawHtml: row.html() || undefined
      })
    })

    const titreAffaire = $('[data-titre-affaire], .titre-affaire, .case-title').text().trim() || undefined

    return {
      numeroDossier,
      tribunal,
      titreAffaire,
      evenements: evenements.reverse() // Du plus ancien au plus récent
    }
  }

  /**
   * Scraper tous les dossiers actifs d'un utilisateur
   */
  async scraperTousDossiers(userId: string): Promise<void> {
    const dossiers = await prisma.dossier.findMany({
      where: { userId, estActif: true },
      include: { evenements: { orderBy: { datePublicationGreffe: 'desc' }, take: 1 } }
    })

    logger.info(`Scraping ${dossiers.length} dossiers pour user ${userId}`)

    for (const dossier of dossiers) {
      try {
        const data = await this.scrapeDossier(dossier.numeroDossier, dossier.tribunal)
        if (!data) continue

        await this.sauvegarderNouveauxEvenements(dossier.id, data.evenements, dossier.evenements[0]?.datePublicationGreffe)

        await prisma.dossier.update({
          where: { id: dossier.id },
          data: { derniereVerif: new Date() }
        })
      } catch (error) {
        logger.error(`Erreur traitement dossier ${dossier.numeroDossier}:`, error)
      }
    }
  }

  private async sauvegarderNouveauxEvenements(
    dossierId: string,
    evenements: EvenementBrut[],
    derniereDateConnue?: Date
  ): Promise<number> {
    let nbNouveaux = 0

    for (const ev of evenements) {
      // Ne sauvegarder que les événements plus récents que le dernier connu
      if (derniereDateConnue && ev.datePublication <= derniereDateConnue) continue

      await prisma.evenement.create({
        data: {
          dossierId,
          texteArabe: ev.texteArabe,
          dateAudience: ev.dateAudience,
          datePublicationGreffe: ev.datePublication,
          raw: ev.rawHtml ? { html: ev.rawHtml } : undefined,
          estNouvel: true,
          estTraite: false,
        }
      })
      nbNouveaux++
    }

    if (nbNouveaux > 0) {
      logger.info(`${nbNouveaux} nouveaux événements sauvegardés pour dossier ${dossierId}`)
    }

    return nbNouveaux
  }
}

// ─── UTILITAIRES ─────────────────────────────────────────────────────────────

/**
 * Parser les dates en format arabe/français présentes sur mahakim.ma
 * Formats possibles: "15/03/2024", "15-03-2024", "١٥/٠٣/٢٠٢٤"
 */
function parseDateArabe(dateStr: string): Date | null {
  if (!dateStr) return null

  // Convertir les chiffres arabes en occidentaux si nécessaire
  const normalized = dateStr
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .trim()

  // Essayer différents formats
  const formats = [
    /(\d{2})\/(\d{2})\/(\d{4})/,  // JJ/MM/AAAA
    /(\d{2})-(\d{2})-(\d{4})/,     // JJ-MM-AAAA
    /(\d{4})-(\d{2})-(\d{2})/,     // AAAA-MM-JJ
  ]

  for (const format of formats) {
    const match = normalized.match(format)
    if (match) {
      const [_, a, b, c] = match
      // Déterminer l'ordre selon le format
      const date = format.toString().startsWith('/((\\d{4})') 
        ? new Date(`${a}-${b}-${c}`)
        : new Date(`${c}-${b}-${a}`)
      
      if (!isNaN(date.getTime())) return date
    }
  }

  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

### 5.3 Gestion des sessions mahakim.ma

Si le portail nécessite une authentification (à vérifier), créer `apps/api/src/services/scraper/mahakimAuth.ts` :

```typescript
/**
 * Si mahakim.ma nécessite une connexion pour consulter certains dossiers,
 * gérer la session ici. Sinon, ignorer ce fichier.
 * 
 * IMPORTANT: Ne jamais stocker les credentials avocat en clair.
 * Utiliser le chiffrement AES-256 pour les mots de passe stockés.
 */

import * as crypto from 'crypto'

const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY! // 32 bytes hex
const IV_LENGTH = 16

export function encryptCredential(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptCredential(encrypted: string): string {
  const [ivHex, encryptedHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encryptedBuffer = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]).toString()
}
```

---

## 6. Phase 3 — Moteur NLP (Compréhension Arabe)

### 6.1 Stratégie de classification

La classification fonctionne en deux temps :
1. **Règles regex** pour les cas clairs (>80% des cas) — rapide, gratuit
2. **LLM (GPT-4o-mini)** pour les cas ambigus ou inconnus — payant, fallback

### 6.2 Classifieur à règles

Créer `apps/api/src/services/nlp/arabicRulesClassifier.ts` :

```typescript
import { TypeEvenement } from '@prisma/client'

interface ClassificationResult {
  typeEvenement: TypeEvenement
  sousType?: string
  confiance: number
  methode: 'REGEX' | 'LLM' | 'FALLBACK'
}

// Dictionnaire de patterns arabes → TypeEvenement
// COMPLÉTER avec les variantes réelles observées sur mahakim.ma
const PATTERNS: Array<{
  pattern: RegExp
  type: TypeEvenement
  sousType?: string
  confiance: number
}> = [
  // ── Renvois ──
  { 
    pattern: /تأخير|تأجيل|إرجاء|رُجئت|أُجلت/i,
    type: TypeEvenement.RENVOI_SIMPLE,
    confiance: 0.9
  },
  {
    pattern: /تأخير.*خبرة|إحالة.*خبير|خبرة.*فنية/i,
    type: TypeEvenement.RENVOI_EXPERT,
    confiance: 0.92
  },
  {
    pattern: /تأجيل.*للتبليغ|تأخير.*للإعلام/i,
    type: TypeEvenement.RENVOI_NOTIFICATION,
    confiance: 0.90
  },
  
  // ── Délibéré & Jugements ──
  {
    pattern: /حجز للمداولة|احتجاز للمداولة|للمداولة/i,
    type: TypeEvenement.MISE_EN_DELIBERE,
    confiance: 0.95
  },
  {
    pattern: /صدر الحكم|صدور الحكم|حكم بتاريخ|قضت المحكمة/i,
    type: TypeEvenement.JUGEMENT_RENDU,
    confiance: 0.95
  },
  {
    pattern: /صدر الأمر|أمر قضائي/i,
    type: TypeEvenement.ORDONNANCE_RENDUE,
    confiance: 0.90
  },
  
  // ── Notifications ──
  {
    pattern: /تبليغ|إعلام|إخطار/i,
    type: TypeEvenement.NOTIFICATION_PARTIE,
    confiance: 0.85
  },
  {
    pattern: /تبليغ.*الحكم|إعلام.*بالحكم/i,
    type: TypeEvenement.NOTIFICATION_PARTIE,
    sousType: 'NOTIFICATION_JUGEMENT',
    confiance: 0.92
  },
  
  // ── Inscriptions ──
  {
    pattern: /إدراج|أُدرج|تسجيل.*الجلسة/i,
    type: TypeEvenement.INSCRIPTION_ROLE,
    confiance: 0.88
  },
  
  // ── Expertises ──
  {
    pattern: /ندب.*خبير|تعيين.*خبير|خبرة.*مأمور بها/i,
    type: TypeEvenement.EXPERTISE_ORDONNEE,
    confiance: 0.90
  },
  {
    pattern: /إيداع.*تقرير.*الخبرة|تقرير.*الخبير.*مودع/i,
    type: TypeEvenement.EXPERTISE_DEPOSEE,
    confiance: 0.90
  },
  
  // ── Recours ──
  {
    pattern: /استئناف|طعن.*استئناف/i,
    type: TypeEvenement.APPEL_INTERJET,
    confiance: 0.93
  },
  {
    pattern: /نقض|طعن.*بالنقض|محكمة النقض/i,
    type: TypeEvenement.POURVOI_CASSATION,
    confiance: 0.93
  },
  
  // ── Fin ──
  {
    pattern: /شطب|محو|طرح/i,
    type: TypeEvenement.RADIATION,
    confiance: 0.88
  },
  {
    pattern: /سقوط.*الدعوى|انقضاء.*الدعوى/i,
    type: TypeEvenement.PEREMPTION,
    confiance: 0.88
  },
  {
    pattern: /تنازل|تخلٍّ.*عن|سحب.*الدعوى/i,
    type: TypeEvenement.DESISTEMENT,
    confiance: 0.88
  },
]

export function classifyWithRules(texteArabe: string): ClassificationResult | null {
  for (const { pattern, type, sousType, confiance } of PATTERNS) {
    if (pattern.test(texteArabe)) {
      return {
        typeEvenement: type,
        sousType,
        confiance,
        methode: 'REGEX'
      }
    }
  }
  return null
}
```

### 6.3 Classifieur LLM (fallback)

Créer `apps/api/src/services/nlp/llmClassifier.ts` :

```typescript
import OpenAI from 'openai'
import { TypeEvenement } from '@prisma/client'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Tu es un expert en procédure judiciaire marocaine. 
Tu dois classifier des mentions de greffe en arabe marocain judiciaire.

Types disponibles:
- RENVOI_SIMPLE : simple report d'audience
- RENVOI_EXPERT : renvoi pour expertise
- RENVOI_NOTIFICATION : renvoi pour notification d'une partie
- JUGEMENT_RENDU : jugement prononcé
- MISE_EN_DELIBERE : affaire mise en délibéré
- ORDONNANCE_RENDUE : ordonnance rendue
- NOTIFICATION_PARTIE : notification/signification à une partie
- INSCRIPTION_ROLE : inscription au rôle
- EXPERTISE_ORDONNEE : expertise ordonnée par le juge
- EXPERTISE_DEPOSEE : rapport d'expertise déposé
- APPEL_INTERJET : appel interjeté
- POURVOI_CASSATION : pourvoi en cassation
- RADIATION : radiation du rôle
- PEREMPTION : péremption de l'instance
- DESISTEMENT : désistement
- AUTRE : aucune des catégories ci-dessus

Réponds UNIQUEMENT en JSON: {"type": "TYPE_ICI", "confiance": 0.0-1.0, "explication": "courte explication"}`

export async function classifyWithLLM(texteArabe: string): Promise<{
  typeEvenement: TypeEvenement
  confiance: number
  methode: 'LLM'
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Classifie cette mention de greffe: "${texteArabe}"` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 150
    })

    const result = JSON.parse(response.choices[0].message.content!)
    const type = result.type as TypeEvenement
    
    // Valider que le type est dans l'enum
    if (!Object.values(TypeEvenement).includes(type)) {
      return { typeEvenement: TypeEvenement.AUTRE, confiance: 0.5, methode: 'LLM' }
    }

    return {
      typeEvenement: type,
      confiance: result.confiance || 0.7,
      methode: 'LLM'
    }
  } catch (error) {
    return { typeEvenement: TypeEvenement.AUTRE, confiance: 0.3, methode: 'LLM' }
  }
}
```

### 6.4 Service NLP principal

Créer `apps/api/src/services/nlp/nlpService.ts` :

```typescript
import { PrismaClient } from '@prisma/client'
import { classifyWithRules } from './arabicRulesClassifier'
import { classifyWithLLM } from './llmClassifier'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

// Seuil en dessous duquel on appelle le LLM
const CONFIDENCE_THRESHOLD = 0.75

export class NLPService {
  /**
   * Classify tous les événements non traités
   */
  async traiterEvenementsEnAttente(): Promise<void> {
    const evenements = await prisma.evenement.findMany({
      where: { estTraite: false, typeEvenement: null },
      take: 100,  // Traiter par batch
      orderBy: { createdAt: 'asc' }
    })

    logger.info(`${evenements.length} événements à classifier`)

    for (const ev of evenements) {
      try {
        // Essai règles d'abord
        let result = classifyWithRules(ev.texteArabe)
        
        // Fallback LLM si confiance insuffisante
        if (!result || result.confiance < CONFIDENCE_THRESHOLD) {
          logger.debug(`LLM fallback pour: "${ev.texteArabe.substring(0, 50)}..."`)
          result = await classifyWithLLM(ev.texteArabe)
        }

        await prisma.evenement.update({
          where: { id: ev.id },
          data: {
            typeEvenement: result.typeEvenement,
            sousType: result.sousType,
            confiance: result.confiance,
            estTraite: true,
          }
        })
      } catch (error) {
        logger.error(`Erreur classification événement ${ev.id}:`, error)
      }
    }
  }

  /**
   * Retourner des stats de classification pour monitoring
   */
  async getClassificationStats() {
    const stats = await prisma.evenement.groupBy({
      by: ['typeEvenement'],
      _count: { id: true }
    })
    return stats
  }
}
```

---

## 7. Phase 4 — Moteur de Délais Procéduraux

### 7.1 Règles de délais (Code de Procédure Civile Marocain)

Créer `apps/api/src/services/deadlines/delaiRules.ts` :

```typescript
import { TypeEvenement, TypeProcedure, TypeDelai } from '@prisma/client'

export interface RegleDelai {
  typeDelai: TypeDelai
  description: string
  descriptionAr: string
  dureeJours: number
  estCritiqueSiInferieuraJours: number  // Alerte si < N jours
  pointDeDepart: 'DATE_JUGEMENT' | 'DATE_NOTIFICATION' | 'DATE_AUDIENCE' | 'DATE_PUBLICATION'
}

// Table des délais selon le CPC marocain
// SOURCES: Code de Procédure Civile (Dahir 1974), CPC Pénal
// IMPORTANT: Ces délais sont indicatifs — faire valider par un avocat marocain

export const REGLES_DELAIS: Record<string, RegleDelai[]> = {
  
  [TypeEvenement.JUGEMENT_RENDU]: [
    {
      typeDelai: TypeDelai.APPEL,
      description: 'Délai d\'appel — 30 jours à compter de la notification',
      descriptionAr: 'أجل الاستئناف - 30 يوماً من تاريخ التبليغ',
      dureeJours: 30,
      estCritiqueSiInferieuraJours: 7,
      pointDeDepart: 'DATE_NOTIFICATION'
    },
    {
      typeDelai: TypeDelai.OPPOSITION,
      description: 'Délai d\'opposition (si jugement par défaut) — 10 jours',
      descriptionAr: 'أجل التعرض - 10 أيام',
      dureeJours: 10,
      estCritiqueSiInferieuraJours: 3,
      pointDeDepart: 'DATE_NOTIFICATION'
    }
  ],

  [TypeEvenement.NOTIFICATION_PARTIE]: [
    {
      typeDelai: TypeDelai.APPEL,
      description: 'Délai d\'appel — 30 jours à compter de la notification',
      descriptionAr: 'أجل الاستئناف - 30 يوماً من تاريخ التبليغ',
      dureeJours: 30,
      estCritiqueSiInferieuraJours: 7,
      pointDeDepart: 'DATE_NOTIFICATION'
    }
  ],

  [TypeEvenement.APPEL_INTERJET]: [
    {
      typeDelai: TypeDelai.CASSATION,
      description: 'Délai de pourvoi en cassation — 30 jours',
      descriptionAr: 'أجل الطعن بالنقض - 30 يوماً',
      dureeJours: 30,
      estCritiqueSiInferieuraJours: 7,
      pointDeDepart: 'DATE_NOTIFICATION'
    }
  ]
}

// Délais spéciaux pour le référé (TypeProcedure.REFERE)
export const REGLES_DELAIS_REFERE: Partial<typeof REGLES_DELAIS> = {
  [TypeEvenement.JUGEMENT_RENDU]: [
    {
      typeDelai: TypeDelai.APPEL,
      description: 'Délai d\'appel en référé — 15 jours',
      descriptionAr: 'أجل الاستئناف في الأمور المستعجلة - 15 يوماً',
      dureeJours: 15,
      estCritiqueSiInferieuraJours: 4,
      pointDeDepart: 'DATE_NOTIFICATION'
    }
  ]
}

/**
 * Calculer les délais pour un événement donné
 */
export function calculerDelais(
  typeEvenement: TypeEvenement,
  typeProcedure: TypeProcedure,
  dateReference: Date
): Array<{ typeDelai: TypeDelai; description: string; descriptionAr: string; dateLimite: Date; estCritique: boolean }> {
  
  // Utiliser les règles référé si applicable
  const regles = typeProcedure === TypeProcedure.REFERE && REGLES_DELAIS_REFERE[typeEvenement]
    ? REGLES_DELAIS_REFERE[typeEvenement]!
    : (REGLES_DELAIS[typeEvenement] || [])

  return regles.map(regle => {
    const dateLimite = new Date(dateReference)
    dateLimite.setDate(dateLimite.getDate() + regle.dureeJours)
    
    const joursRestants = Math.ceil((dateLimite.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    
    return {
      typeDelai: regle.typeDelai,
      description: regle.description,
      descriptionAr: regle.descriptionAr,
      dateLimite,
      estCritique: joursRestants <= regle.estCritiqueSiInferieuraJours
    }
  })
}
```

### 7.2 Service de gestion des délais

Créer `apps/api/src/services/deadlines/deadlineService.ts` :

```typescript
import { PrismaClient, TypeEvenement } from '@prisma/client'
import { calculerDelais } from './delaiRules'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export class DeadlineService {
  /**
   * Générer les échéances pour tous les événements classifiés non traités
   */
  async genererEcheances(): Promise<void> {
    const evenements = await prisma.evenement.findMany({
      where: {
        typeEvenement: { not: null },
        estTraite: true,
        echeancesGenerees: { none: {} }
      },
      include: { dossier: true }
    })

    for (const ev of evenements) {
      if (!ev.typeEvenement) continue

      const dateRef = ev.dateAudience || ev.datePublicationGreffe
      const delais = calculerDelais(
        ev.typeEvenement,
        ev.dossier.typeProcedure,
        dateRef
      )

      for (const delai of delais) {
        await prisma.echeance.create({
          data: {
            dossierId: ev.dossierId,
            evenementId: ev.id,
            typeDelai: delai.typeDelai,
            description: delai.description,
            descriptionAr: delai.descriptionAr,
            dateDepart: dateRef,
            dateLimite: delai.dateLimite,
            estCritique: delai.estCritique,
            estExpire: delai.dateLimite < new Date(),
          }
        })
      }
    }
  }

  /**
   * Mettre à jour le statut critique/expiré des échéances
   */
  async mettreAJourStatuts(): Promise<void> {
    const now = new Date()
    const dans7Jours = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Marquer comme expirées
    await prisma.echeance.updateMany({
      where: {
        dateLimite: { lt: now },
        estExpire: false,
        estComplete: false
      },
      data: { estExpire: true }
    })

    // Marquer comme critiques
    await prisma.echeance.updateMany({
      where: {
        dateLimite: { lt: dans7Jours, gte: now },
        estCritique: false,
        estComplete: false
      },
      data: { estCritique: true }
    })
  }

  /**
   * Retourner les échéances d'un utilisateur triées par urgence
   */
  async getEcheancesUtilisateur(userId: string) {
    return prisma.echeance.findMany({
      where: {
        dossier: { userId },
        estExpire: false,
        estComplete: false
      },
      include: {
        dossier: { select: { numeroDossier: true, tribunal: true, titreAffaire: true } },
        evenement: { select: { texteArabe: true, typeEvenement: true } }
      },
      orderBy: { dateLimite: 'asc' }
    })
  }
}
```

---

## 8. Phase 5 — Système d'alertes WhatsApp

### 8.1 Intégration Meta Cloud API (Recommandé)

Créer `apps/api/src/services/whatsapp/whatsappService.ts` :

```typescript
import axios from 'axios'

const META_API_URL = 'https://graph.facebook.com/v19.0'
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!

export interface WhatsAppMessage {
  to: string       // Format: 212XXXXXXXXX (sans +)
  template?: string
  body?: string
}

export class WhatsAppService {
  /**
   * Envoyer une alerte immédiate pour un nouvel événement critique
   */
  async envoyerAlerteEvenement(params: {
    telephone: string
    numeroDossier: string
    tribunal: string
    texteEvenement: string
    typeEvenement: string
    dateLimite?: Date
  }): Promise<boolean> {
    const message = this.formaterMessageEvenement(params)
    return this.envoyer(params.telephone, message)
  }

  /**
   * Envoyer le digest matinal
   */
  async envoyerDigestQuotidien(params: {
    telephone: string
    nomAvocat: string
    nbDossiersBouges: number
    echeancesCritiques: Array<{ numeroDossier: string; description: string; joursRestants: number }>
    renvoisDetectes: Array<{ numeroDossier: string; tribunal: string }>
  }): Promise<boolean> {
    const message = this.formaterDigest(params)
    return this.envoyer(params.telephone, message)
  }

  private formaterMessageEvenement(params: {
    numeroDossier: string
    tribunal: string
    texteEvenement: string
    typeEvenement: string
    dateLimite?: Date
  }): string {
    let msg = `⚖️ *MOURAQIB — Alerte Dossier*\n\n`
    msg += `📁 Dossier: *${params.numeroDossier}*\n`
    msg += `🏛️ Tribunal: ${params.tribunal}\n`
    msg += `📋 Événement: ${params.typeEvenement}\n`
    msg += `📝 Greffe: _${params.texteEvenement}_\n`
    
    if (params.dateLimite) {
      const joursRestants = Math.ceil((params.dateLimite.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      msg += `\n⏰ *Délai: ${joursRestants} jours restants*\n`
      msg += `📅 Échéance: ${params.dateLimite.toLocaleDateString('fr-MA')}\n`
    }

    msg += `\n🔗 Voir le dossier: https://app.mouraqib.ma/dossier/${params.numeroDossier}`
    return msg
  }

  private formaterDigest(params: {
    nomAvocat: string
    nbDossiersBouges: number
    echeancesCritiques: Array<{ numeroDossier: string; description: string; joursRestants: number }>
    renvoisDetectes: Array<{ numeroDossier: string; tribunal: string }>
  }): string {
    const today = new Date().toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long' })
    
    let msg = `☀️ *Bonjour Maître ${params.nomAvocat}*\n`
    msg += `📅 ${today}\n\n`
    
    msg += `📊 *Résumé matinal MOURAQIB*\n\n`
    
    if (params.nbDossiersBouges > 0) {
      msg += `📁 *${params.nbDossiersBouges} dossier(s) ont bougé* cette nuit\n\n`
    }

    if (params.echeancesCritiques.length > 0) {
      msg += `⚠️ *DÉLAIS CRITIQUES:*\n`
      for (const e of params.echeancesCritiques.slice(0, 5)) {
        const emoji = e.joursRestants <= 1 ? '🔴' : e.joursRestants <= 3 ? '🟠' : '🟡'
        msg += `${emoji} Dossier ${e.numeroDossier}: ${e.description} — *J-${e.joursRestants}*\n`
      }
      msg += '\n'
    }

    if (params.renvoisDetectes.length > 0) {
      msg += `🚫 *RENVOIS DÉTECTÉS (évitez le déplacement):*\n`
      for (const r of params.renvoisDetectes) {
        msg += `• ${r.numeroDossier} @ ${r.tribunal}\n`
      }
    }

    msg += `\n🔗 Tableau de bord: https://app.mouraqib.ma/dashboard`
    return msg
  }

  private async envoyer(telephone: string, message: string): Promise<boolean> {
    // Nettoyer le numéro de téléphone
    const numero = telephone.replace(/[^0-9]/g, '').replace(/^0/, '212')

    try {
      const response = await axios.post(
        `${META_API_URL}/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: numero,
          type: 'text',
          text: { body: message, preview_url: false }
        },
        {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )
      return response.status === 200
    } catch (error: any) {
      console.error('WhatsApp send error:', error?.response?.data || error.message)
      return false
    }
  }

  /**
   * Vérifier un numéro WhatsApp (envoyer un code de confirmation)
   */
  async envoyerCodeVerification(telephone: string, code: string): Promise<boolean> {
    const message = `🔐 *MOURAQIB — Code de vérification*\n\nVotre code: *${code}*\n\nCe code expire dans 10 minutes.`
    return this.envoyer(telephone, message)
  }
}
```

### 8.2 Service d'orchestration des alertes

Créer `apps/api/src/services/alerts/alertService.ts` :

```typescript
import { PrismaClient, TypeAlerte, CanalAlerte, StatutAlerte } from '@prisma/client'
import { WhatsAppService } from '../whatsapp/whatsappService'

const prisma = new PrismaClient()
const whatsapp = new WhatsAppService()

export class AlertService {
  /**
   * Générer et envoyer les alertes pour les nouveaux événements
   */
  async traiterNouveauxEvenements(): Promise<void> {
    const evenements = await prisma.evenement.findMany({
      where: { estNouvel: true, estTraite: true },
      include: {
        dossier: {
          include: { user: true }
        }
      }
    })

    for (const ev of evenements) {
      const user = ev.dossier.user
      if (!user.whatsappNumero || !user.whatsappVerifie) continue

      // Créer l'alerte en base
      const alerte = await prisma.alerte.create({
        data: {
          userId: user.id,
          dossierId: ev.dossierId,
          evenementId: ev.id,
          canal: CanalAlerte.WHATSAPP,
          typeAlerte: TypeAlerte.NOUVEL_EVENEMENT,
          message: `Nouvel événement: ${ev.typeEvenement} — ${ev.texteArabe}`,
          statut: StatutAlerte.EN_ATTENTE
        }
      })

      // Envoyer via WhatsApp
      const success = await whatsapp.envoyerAlerteEvenement({
        telephone: user.whatsappNumero,
        numeroDossier: ev.dossier.numeroDossier,
        tribunal: ev.dossier.tribunal,
        texteEvenement: ev.texteArabe,
        typeEvenement: ev.typeEvenement || 'Inconnu',
      })

      await prisma.alerte.update({
        where: { id: alerte.id },
        data: { 
          statut: success ? StatutAlerte.ENVOYEE : StatutAlerte.ECHEC,
          envoyeAt: success ? new Date() : undefined
        }
      })

      // Marquer l'événement comme traité
      await prisma.evenement.update({
        where: { id: ev.id },
        data: { estNouvel: false }
      })
    }
  }

  /**
   * Envoyer les alertes de délais approchants
   */
  async envoyerAlertesDelais(): Promise<void> {
    const maintenant = new Date()
    const seuilsJours = [7, 3, 1]

    for (const joursRestants of seuilsJours) {
      const dateDebut = new Date(maintenant.getTime() + (joursRestants - 0.5) * 24 * 60 * 60 * 1000)
      const dateFin = new Date(maintenant.getTime() + (joursRestants + 0.5) * 24 * 60 * 60 * 1000)

      const echeances = await prisma.echeance.findMany({
        where: {
          dateLimite: { gte: dateDebut, lt: dateFin },
          estExpire: false,
          estComplete: false
        },
        include: {
          dossier: { include: { user: true } }
        }
      })

      for (const echeance of echeances) {
        const user = echeance.dossier.user
        if (!user.whatsappNumero || !user.whatsappVerifie) continue

        const typeAlerte = joursRestants === 7 ? TypeAlerte.DELAI_APPROCHE_7J
          : joursRestants === 3 ? TypeAlerte.DELAI_APPROCHE_3J
          : TypeAlerte.DELAI_APPROCHE_1J

        // Vérifier qu'on n'a pas déjà envoyé cette alerte
        const alerteExistante = await prisma.alerte.findFirst({
          where: { echeanceId: echeance.id, typeAlerte }
        })
        if (alerteExistante) continue

        await prisma.alerte.create({
          data: {
            userId: user.id,
            dossierId: echeance.dossierId,
            echeanceId: echeance.id,
            canal: CanalAlerte.WHATSAPP,
            typeAlerte,
            message: echeance.description,
            statut: StatutAlerte.ENVOYEE,
            envoyeAt: new Date()
          }
        })
      }
    }
  }

  /**
   * Envoyer le digest quotidien à tous les utilisateurs actifs
   */
  async envoyerDigestsQuotidiens(): Promise<void> {
    const utilisateurs = await prisma.user.findMany({
      where: {
        whatsappVerifie: true,
        whatsappNumero: { not: null },
        abonnement: { statut: 'ACTIF' }
      },
      include: {
        dossiers: {
          where: { estActif: true },
          include: {
            echeances: {
              where: { estExpire: false, estComplete: false },
              orderBy: { dateLimite: 'asc' },
              take: 10
            },
            evenements: {
              where: { estNouvel: true },
              take: 1
            }
          }
        }
      }
    })

    for (const user of utilisateurs) {
      const dossiersBouges = user.dossiers.filter(d => d.evenements.length > 0).length
      
      const echeancesCritiques = user.dossiers
        .flatMap(d => d.echeances.filter(e => e.estCritique))
        .map(e => ({
          numeroDossier: user.dossiers.find(d => d.id === e.dossierId)?.numeroDossier || '',
          description: e.description,
          joursRestants: Math.ceil((e.dateLimite.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        }))
        .sort((a, b) => a.joursRestants - b.joursRestants)

      if (dossiersBouges === 0 && echeancesCritiques.length === 0) continue

      await whatsapp.envoyerDigestQuotidien({
        telephone: user.whatsappNumero!,
        nomAvocat: user.nom,
        nbDossiersBouges: dossiersBouges,
        echeancesCritiques,
        renvoisDetectes: []
      })
    }
  }
}
```

---

## 9. Phase 6 — API Backend

### 9.1 Structure des routes

Créer `apps/api/src/routes/index.ts` :

```typescript
import { Router } from 'express'
import authRouter from './auth'
import dossiersRouter from './dossiers'
import echeancesRouter from './echeances'
import alertesRouter from './alertes'
import abonnementsRouter from './abonnements'
import adminRouter from './admin'

const router = Router()

router.use('/auth', authRouter)
router.use('/dossiers', dossiersRouter)
router.use('/echeances', echeancesRouter)
router.use('/alertes', alertesRouter)
router.use('/abonnements', abonnementsRouter)
router.use('/admin', adminRouter)

export default router
```

### 9.2 Routes dossiers (exemple complet)

Créer `apps/api/src/routes/dossiers.ts` :

```typescript
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth'
import { checkSubscriptionLimit } from '../middleware/subscription'

const router = Router()
const prisma = new PrismaClient()

// Schémas de validation
const AjouterDossierSchema = z.object({
  numeroDossier: z.string().min(1).max(50),
  tribunal: z.string().min(1),
  typeProcedure: z.enum(['CIVILE', 'PENALE', 'COMMERCIALE', 'ADMINISTRATIVE', 'TRAVAIL', 'FAMILLE', 'REFERE']).optional(),
  titreAffaire: z.string().optional(),
  partieAdverse: z.string().optional(),
})

// GET /api/dossiers — Liste tous les dossiers de l'utilisateur
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const dossiers = await prisma.dossier.findMany({
    where: { userId: req.user!.id, estActif: true },
    include: {
      echeances: {
        where: { estExpire: false, estComplete: false },
        orderBy: { dateLimite: 'asc' },
        take: 3
      },
      evenements: {
        orderBy: { datePublicationGreffe: 'desc' },
        take: 1
      },
      _count: { select: { evenements: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  res.json({ dossiers })
})

// POST /api/dossiers — Ajouter un dossier
router.post('/', requireAuth, checkSubscriptionLimit, async (req: Request, res: Response) => {
  const parse = AjouterDossierSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: 'Données invalides', details: parse.error })
  }

  const { numeroDossier, tribunal, typeProcedure, titreAffaire, partieAdverse } = parse.data

  // Vérifier que le dossier n'est pas déjà suivi
  const existe = await prisma.dossier.findFirst({
    where: { numeroDossier, tribunal, userId: req.user!.id }
  })
  if (existe) {
    return res.status(409).json({ error: 'Ce dossier est déjà dans votre liste' })
  }

  const dossier = await prisma.dossier.create({
    data: {
      numeroDossier,
      tribunal,
      typeProcedure: typeProcedure || 'CIVILE',
      titreAffaire,
      partieAdverse,
      userId: req.user!.id,
      prochaineVerif: new Date()  // Scraper immédiatement
    }
  })

  // Déclencher le scraping immédiat en arrière-plan
  // (via BullMQ queue, voir Phase 9)
  
  res.status(201).json({ dossier })
})

// DELETE /api/dossiers/:id — Supprimer un dossier
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const dossier = await prisma.dossier.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  })
  
  if (!dossier) {
    return res.status(404).json({ error: 'Dossier non trouvé' })
  }

  await prisma.dossier.update({
    where: { id: req.params.id },
    data: { estActif: false }
  })

  res.json({ success: true })
})

export default router
```

### 9.3 Middleware d'authentification

Créer `apps/api/src/middleware/auth.ts` :

```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string }
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  const token = authHeader.substring(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expirée' })
    }

    req.user = { id: session.user.id, email: session.user.email, role: session.user.role }
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalide' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès refusé' })
  }
  next()
}
```

### 9.4 Middleware de vérification d'abonnement

Créer `apps/api/src/middleware/subscription.ts` :

```typescript
import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const LIMITES_PLAN: Record<string, number> = {
  GRATUIT: 10,
  SOLO: 100,
  PRO: -1,     // Illimité
  CABINET: -1  // Illimité
}

export async function checkSubscriptionLimit(req: Request, res: Response, next: NextFunction) {
  const abonnement = await prisma.abonnement.findUnique({
    where: { userId: req.user!.id }
  })

  const plan = abonnement?.plan || 'GRATUIT'
  const limite = LIMITES_PLAN[plan] ?? 10

  if (limite === -1) return next()  // Illimité

  const nbDossiers = await prisma.dossier.count({
    where: { userId: req.user!.id, estActif: true }
  })

  if (nbDossiers >= limite) {
    return res.status(403).json({
      error: 'Limite de dossiers atteinte',
      limite,
      plan,
      upgrade_url: 'https://app.mouraqib.ma/abonnement'
    })
  }

  next()
}
```

---

## 10. Phase 7 — Interface Web (Dashboard)

### 10.1 Structure des pages Next.js

```
apps/web/app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (app)/
│   ├── layout.tsx          # Layout avec sidebar + auth guard
│   ├── dashboard/page.tsx  # Vue principale
│   ├── dossiers/
│   │   ├── page.tsx        # Liste des dossiers
│   │   └── [id]/page.tsx   # Détail dossier
│   ├── echeances/page.tsx  # Calendrier des délais
│   ├── alertes/page.tsx    # Historique des alertes
│   └── parametres/
│       ├── page.tsx        # Paramètres compte
│       └── whatsapp/page.tsx # Vérification WhatsApp
├── layout.tsx
└── page.tsx                # Landing page
```

### 10.2 Dashboard principal

Créer `apps/web/app/(app)/dashboard/page.tsx` :

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/useApi'

// Composants principaux du dashboard
export default function DashboardPage() {
  const { data: stats, loading } = useApi('/api/dashboard/stats')
  const { data: echeances } = useApi('/api/echeances?critiques=true')
  const { data: dossiersBouges } = useApi('/api/dossiers?bouges=true')

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-6" dir="rtl">
      {/* Bannière d'alerte si délais critiques */}
      {echeances?.critiques > 0 && (
        <AlertBanner count={echeances.critiques} />
      )}

      {/* KPIs en haut */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard 
          title="Dossiers actifs" 
          value={stats?.totalDossiers} 
          icon="📁" 
        />
        <KPICard 
          title="Délais critiques" 
          value={stats?.delaisCritiques} 
          icon="⚠️" 
          critical={stats?.delaisCritiques > 0}
        />
        <KPICard 
          title="Événements aujourd'hui" 
          value={stats?.evenementsAujourdhui} 
          icon="📋" 
        />
        <KPICard 
          title="Renvois détectés" 
          value={stats?.renvoisCetteSemaine} 
          icon="🔄" 
        />
      </div>

      {/* Délais imminents */}
      <section>
        <h2 className="text-xl font-bold mb-4">⏰ Délais imminents</h2>
        <EcheancesTable echeances={echeances?.items || []} />
      </section>

      {/* Dossiers récemment mis à jour */}
      <section>
        <h2 className="text-xl font-bold mb-4">📋 Dossiers avec nouveaux événements</h2>
        <DossiersList dossiers={dossiersBouges?.dossiers || []} />
      </section>
    </div>
  )
}
```

### 10.3 Composant d'ajout de dossier (démo 60 secondes)

Ce composant est central pour la démo — il montre la magie en 60 secondes.

Créer `apps/web/components/AjouterDossierForm.tsx` :

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TRIBUNAUX = [
  { code: 'TPI_CASA_ANFA', label: 'TPI Casablanca Anfa' },
  { code: 'CA_CASA', label: 'Cour d\'Appel Casablanca' },
  { code: 'TPI_RABAT', label: 'TPI Rabat' },
  // ... tous les tribunaux
]

export function AjouterDossierForm({ onSuccess }: { onSuccess?: () => void }) {
  const [numeroDossier, setNumeroDossier] = useState('')
  const [tribunal, setTribunal] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const router = useRouter()

  const handleSubmit = async () => {
    if (!numeroDossier || !tribunal) return
    setLoading(true)

    try {
      const res = await fetch('/api/dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroDossier, tribunal })
      })
      const data = await res.json()
      
      if (res.ok) {
        setResult(data.dossier)
        // Montrer le résultat pendant 2s puis rediriger
        setTimeout(() => {
          router.push(`/dossiers/${data.dossier.id}`)
          onSuccess?.()
        }, 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-6 bg-white rounded-xl shadow-lg" dir="rtl">
      <h3 className="text-lg font-semibold">أضف ملفاً جديداً للمراقبة</h3>
      <p className="text-sm text-gray-600">Ajouter un dossier à surveiller</p>
      
      <div>
        <label className="block text-sm font-medium mb-1">رقم الملف</label>
        <input
          type="text"
          value={numeroDossier}
          onChange={(e) => setNumeroDossier(e.target.value)}
          placeholder="Ex: 123/2024"
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">المحكمة</label>
        <select
          value={tribunal}
          onChange={(e) => setTribunal(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">Sélectionner un tribunal</option>
          {TRIBUNAUX.map(t => (
            <option key={t.code} value={t.code}>{t.label}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !numeroDossier || !tribunal}
        className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold 
                   hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? '🔍 Vérification sur mahakim.ma...' : '+ Ajouter et surveiller'}
      </button>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          ✅ Dossier ajouté ! Surveillance activée. Vous recevrez vos alertes WhatsApp.
        </div>
      )}
    </div>
  )
}
```

---

## 11. Phase 8 — Système d'abonnement & Paiement

### 11.1 Intégration CMI (Centre Monétique Interbancaire)

Créer `apps/api/src/services/payment/cmiPayment.ts` :

```typescript
import crypto from 'crypto'
import axios from 'axios'

// ⚠️ L'intégration CMI nécessite un contrat commercial avec CMI Maroc
// Documentation: https://www.cmi.co.ma

const CMI_CONFIG = {
  merchantId: process.env.CMI_MERCHANT_ID!,
  storeKey: process.env.CMI_STORE_KEY!,
  apiUrl: process.env.CMI_API_URL || 'https://payment.cmi.co.ma/fim/est3Dgate',
}

export function generateCMIPaymentForm(params: {
  amount: number
  orderId: string
  description: string
  callbackUrl: string
  okUrl: string
  failUrl: string
}): string {
  // Construire le formulaire de paiement CMI
  // Adapter selon la documentation CMI fournie lors du contrat
  const hashData = `${CMI_CONFIG.storeKey}${params.orderId}${params.amount}${CMI_CONFIG.merchantId}`
  const hash = crypto.createHash('sha512').update(hashData).digest('hex').toUpperCase()

  return `
    <form method="POST" action="${CMI_CONFIG.apiUrl}" id="cmi-form">
      <input type="hidden" name="clientid" value="${CMI_CONFIG.merchantId}" />
      <input type="hidden" name="amount" value="${params.amount}" />
      <input type="hidden" name="oid" value="${params.orderId}" />
      <input type="hidden" name="okUrl" value="${params.okUrl}" />
      <input type="hidden" name="failUrl" value="${params.failUrl}" />
      <input type="hidden" name="callbackUrl" value="${params.callbackUrl}" />
      <input type="hidden" name="hash" value="${hash}" />
      <input type="hidden" name="currency" value="504" />  <!-- MAD -->
      <input type="hidden" name="lang" value="fr" />
      <input type="hidden" name="storetype" value="3D_PAY_HOSTING" />
    </form>
    <script>document.getElementById('cmi-form').submit();</script>
  `
}
```

### 11.2 Routes de paiement

```typescript
// POST /api/abonnements/checkout
router.post('/checkout', requireAuth, async (req, res) => {
  const { plan } = req.body

  const TARIFS: Record<string, number> = {
    SOLO: 190,
    PRO: 390,
    CABINET: 790
  }

  const montant = TARIFS[plan]
  if (!montant) return res.status(400).json({ error: 'Plan invalide' })

  const orderId = `MOURAQIB-${req.user!.id}-${Date.now()}`
  
  const formHtml = generateCMIPaymentForm({
    amount: montant,
    orderId,
    description: `Mouraqib ${plan} — 1 mois`,
    callbackUrl: `${process.env.API_URL}/api/abonnements/callback/cmi`,
    okUrl: `${process.env.WEB_URL}/abonnement/success`,
    failUrl: `${process.env.WEB_URL}/abonnement/echec`,
  })

  res.json({ formHtml, orderId })
})

// POST /api/abonnements/callback/cmi — Webhook CMI
router.post('/callback/cmi', async (req, res) => {
  // Vérifier la signature CMI
  // Activer l'abonnement en base
  // Envoyer email de confirmation
  res.send('ACTION=POSTAUTH')  // Réponse attendue par CMI
})
```

---

## 12. Phase 9 — Jobs planifiés & Orchestration

### 12.1 Configuration BullMQ

Créer `apps/api/src/jobs/queues.ts` :

```typescript
import { Queue, Worker, QueueScheduler } from 'bullmq'
import { Redis } from 'ioredis'

const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })

// Définition des queues
export const scraperQueue = new Queue('scraper', { connection })
export const nlpQueue = new Queue('nlp', { connection })
export const alertQueue = new Queue('alerts', { connection })
export const digestQueue = new Queue('digest', { connection })

// Schedulers (nécessaires pour les tâches récurrentes)
export const scraperScheduler = new QueueScheduler('scraper', { connection })
export const alertScheduler = new QueueScheduler('alerts', { connection })
```

### 12.2 Workers

Créer `apps/api/src/jobs/workers/scraperWorker.ts` :

```typescript
import { Worker, Job } from 'bullmq'
import { MahakimScraper } from '../../services/scraper/mahakimScraper'
import { PrismaClient } from '@prisma/client'
import { nlpQueue } from '../queues'
import { Redis } from 'ioredis'

const prisma = new PrismaClient()
const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })

const scraper = new MahakimScraper()
scraper.init()

export const scraperWorker = new Worker('scraper', async (job: Job) => {
  const { userId, dossierId } = job.data

  if (dossierId) {
    // Scraper un dossier spécifique
    const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
    if (!dossier) return

    await scraper.scraperTousDossiers(userId)
  } else if (userId) {
    // Scraper tous les dossiers d'un utilisateur
    await scraper.scraperTousDossiers(userId)
  } else {
    // Job global: scraper tous les utilisateurs actifs
    const users = await prisma.user.findMany({
      where: { abonnement: { statut: 'ACTIF' } },
      select: { id: true }
    })
    
    for (const user of users) {
      await scraperQueue.add('scrape-user', { userId: user.id }, {
        delay: Math.random() * 60000  // Étaler les requêtes sur 1 minute
      })
    }
  }

  // Déclencher le NLP après scraping
  await nlpQueue.add('classify-events', {})

}, { connection, concurrency: 3 })
```

### 12.3 Planification des cron jobs

Créer `apps/api/src/jobs/scheduler.ts` :

```typescript
import { scraperQueue, alertQueue, digestQueue } from './queues'

export async function initScheduler() {
  // Scraping quotidien de tous les dossiers — 7h et 13h
  await scraperQueue.add('global-scrape-morning', {}, {
    repeat: { cron: '0 7 * * *', tz: 'Africa/Casablanca' },
    jobId: 'global-scrape-morning'
  })
  
  await scraperQueue.add('global-scrape-afternoon', {}, {
    repeat: { cron: '0 13 * * *', tz: 'Africa/Casablanca' },
    jobId: 'global-scrape-afternoon'
  })

  // Vérification des délais et envoi d'alertes — toutes les 4h
  await alertQueue.add('check-deadlines', {}, {
    repeat: { cron: '0 */4 * * *', tz: 'Africa/Casablanca' },
    jobId: 'check-deadlines'
  })

  // Digest quotidien — 7h30
  await digestQueue.add('daily-digest', {}, {
    repeat: { cron: '30 7 * * *', tz: 'Africa/Casablanca' },
    jobId: 'daily-digest'
  })

  console.log('✅ Scheduler initialisé')
}
```

---

## 13. Phase 10 — Tests & Déploiement

### 13.1 Tests essentiels à écrire

```bash
# Installer les dépendances de test
npm install -D vitest @vitest/coverage-v8 supertest

# Tests prioritaires:
# 1. arabicRulesClassifier.test.ts — tester avec de vraies mentions de greffe
# 2. delaiRules.test.ts — vérifier tous les calculs de délais
# 3. scraper.test.ts — mocker les réponses HTML de mahakim.ma
# 4. api/dossiers.test.ts — tester CRUD avec base de données de test
# 5. whatsapp.test.ts — vérifier le formatage des messages
```

Exemple de test NLP critique :

```typescript
// apps/api/src/services/nlp/__tests__/arabicRulesClassifier.test.ts
import { describe, it, expect } from 'vitest'
import { classifyWithRules } from '../arabicRulesClassifier'
import { TypeEvenement } from '@prisma/client'

describe('Classification arabe des mentions de greffe', () => {
  it('doit reconnaître un renvoi simple', () => {
    const textes = ['تأخير', 'القضية مؤجلة', 'أُجلت القضية إلى جلسة قادمة']
    textes.forEach(texte => {
      const result = classifyWithRules(texte)
      expect(result?.typeEvenement).toBe(TypeEvenement.RENVOI_SIMPLE)
      expect(result?.confiance).toBeGreaterThan(0.7)
    })
  })

  it('doit reconnaître une mise en délibéré', () => {
    const result = classifyWithRules('حجز للمداولة')
    expect(result?.typeEvenement).toBe(TypeEvenement.MISE_EN_DELIBERE)
  })

  it('doit reconnaître un jugement rendu', () => {
    const result = classifyWithRules('صدر الحكم الابتدائي')
    expect(result?.typeEvenement).toBe(TypeEvenement.JUGEMENT_RENDU)
  })

  // IMPORTANT: Ajouter des tests avec de vraies mentions collectées sur mahakim.ma
  // pendant la phase de développement
})
```

### 13.2 Dockerfile

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY apps/api/prisma ./prisma

# Playwright pour scraping
RUN npx playwright install chromium --with-deps

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### 13.3 docker-compose.yml (développement local)

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: mouraqib_dev
      POSTGRES_USER: mouraqib
      POSTGRES_PASSWORD: mouraqib_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://mouraqib:mouraqib_pass@postgres:5432/mouraqib_dev
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./apps/api/src:/app/src

  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    depends_on:
      - api

volumes:
  postgres_data:
```

### 13.4 Déploiement Railway.app (recommandé pour le MVP)

```bash
# Installer Railway CLI
npm install -g @railway/cli
railway login

# Créer le projet
railway init mouraqib

# Ajouter les services
railway add postgresql
railway add redis

# Déployer
railway up

# Variables d'environnement à configurer dans Railway dashboard
```

---

## 14. Variables d'environnement

Créer `.env.example` à la racine :

```bash
# ─── BASE DE DONNÉES ──────────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/mouraqib_dev"
REDIS_URL="redis://localhost:6379"

# ─── AUTHENTIFICATION ─────────────────────────────
JWT_SECRET="your-super-secret-jwt-key-256-bits"
CREDENTIALS_ENCRYPTION_KEY="your-32-byte-hex-key-for-aes-256"

# ─── WHATSAPP (Meta Cloud API) ────────────────────
WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"
WHATSAPP_ACCESS_TOKEN="your-permanent-access-token"
WHATSAPP_VERIFY_TOKEN="your-webhook-verify-token"

# ─── OPENAI (NLP fallback) ────────────────────────
OPENAI_API_KEY="sk-..."

# ─── PAIEMENT CMI ────────────────────────────────
CMI_MERCHANT_ID="your-cmi-merchant-id"
CMI_STORE_KEY="your-cmi-store-key"
CMI_API_URL="https://payment.cmi.co.ma/fim/est3Dgate"

# ─── EMAILS ───────────────────────────────────────
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@mouraqib.ma"

# ─── URLS ─────────────────────────────────────────
API_URL="https://api.mouraqib.ma"
WEB_URL="https://app.mouraqib.ma"
NODE_ENV="production"
PORT="3001"
```

---

## 15. Structure des dossiers

```
mouraqib/
├── apps/
│   ├── api/                          # Backend Node.js + TypeScript
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Schéma base de données
│   │   │   ├── migrations/           # Migrations auto-générées
│   │   │   └── seed.ts               # Données initiales
│   │   ├── src/
│   │   │   ├── server.ts             # Point d'entrée Express
│   │   │   ├── routes/               # Routes API REST
│   │   │   │   ├── auth.ts
│   │   │   │   ├── dossiers.ts
│   │   │   │   ├── echeances.ts
│   │   │   │   ├── alertes.ts
│   │   │   │   └── abonnements.ts
│   │   │   ├── services/
│   │   │   │   ├── scraper/          # Phase 2
│   │   │   │   │   ├── mahakimScraper.ts
│   │   │   │   │   └── mahakimAuth.ts
│   │   │   │   ├── nlp/              # Phase 3
│   │   │   │   │   ├── arabicRulesClassifier.ts
│   │   │   │   │   ├── llmClassifier.ts
│   │   │   │   │   └── nlpService.ts
│   │   │   │   ├── deadlines/        # Phase 4
│   │   │   │   │   ├── delaiRules.ts
│   │   │   │   │   └── deadlineService.ts
│   │   │   │   ├── whatsapp/         # Phase 5
│   │   │   │   │   └── whatsappService.ts
│   │   │   │   ├── alerts/           # Phase 5
│   │   │   │   │   └── alertService.ts
│   │   │   │   └── payment/          # Phase 8
│   │   │   │       └── cmiPayment.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   └── subscription.ts
│   │   │   ├── jobs/                 # Phase 9
│   │   │   │   ├── queues.ts
│   │   │   │   ├── scheduler.ts
│   │   │   │   └── workers/
│   │   │   │       ├── scraperWorker.ts
│   │   │   │       ├── nlpWorker.ts
│   │   │   │       └── alertWorker.ts
│   │   │   └── utils/
│   │   │       ├── logger.ts
│   │   │       └── dateUtils.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                          # Frontend Next.js 14
│       ├── app/
│       │   ├── (auth)/               # Pages sans layout app
│       │   ├── (app)/                # Pages avec layout app
│       │   └── layout.tsx
│       ├── components/
│       │   ├── ui/                   # shadcn/ui components
│       │   ├── DossierCard.tsx
│       │   ├── EcheancesTable.tsx
│       │   ├── AjouterDossierForm.tsx
│       │   └── WhatsAppVerification.tsx
│       ├── hooks/
│       │   ├── useApi.ts
│       │   └── useAuth.ts
│       └── package.json
│
├── packages/
│   └── shared/                       # Types partagés API/Web
│       └── types/
│           ├── dossier.ts
│           └── evenement.ts
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ORDRE D'IMPLÉMENTATION RECOMMANDÉ

```
Semaine 1-2 : Phase 1 (DB) + Phase 6 partielle (auth + CRUD dossiers)
Semaine 3   : Phase 2 (Scraper) — nécessite analyse manuelle de mahakim.ma
Semaine 4   : Phase 3 (NLP) + Phase 4 (délais)
Semaine 5   : Phase 5 (WhatsApp) + Phase 9 (jobs)
Semaine 6   : Phase 7 (Dashboard) — MVP fonctionnel
Semaine 7   : Phase 8 (Paiement) + Phase 10 (déploiement)
```

## POINTS D'ATTENTION CRITIQUES

1. **Scraping éthique** : Respecter les délais entre requêtes. Si mahakim.ma bloque, contacter le Ministère de la Justice pour un accès API officiel.

2. **Précision juridique** : Faire valider les délais calculés (Phase 4) par au moins deux avocats marocains. Une erreur ici est une faute professionnelle pour l'avocat.

3. **Numéros WhatsApp** : Vérifier les numéros par OTP avant d'envoyer des alertes. Ne jamais envoyer à un numéro non vérifié.

4. **RGPD/loi 09-08** : Les données des dossiers judiciaires sont sensibles. Chiffrer en base, journaliser les accès, prévoir une politique de suppression des données.

5. **Zéro faux positif sur les délais critiques** : Mieux vaut une alerte de trop que pas d'alerte. Configurer les seuils généreusement.

6. **Patterns NLP** : Les patterns regex (Phase 3) devront être complétés avec de vraies mentions collectées sur mahakim.ma pendant 1-2 semaines de tests.
```
