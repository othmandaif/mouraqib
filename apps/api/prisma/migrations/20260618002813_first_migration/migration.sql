-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('AVOCAT', 'SECRETAIRE', 'ASSOCIE_GERANT', 'ADMIN');

-- CreateEnum
CREATE TYPE "TypeProcedure" AS ENUM ('CIVILE', 'PENALE', 'COMMERCIALE', 'ADMINISTRATIVE', 'TRAVAIL', 'FAMILLE', 'REFERE');

-- CreateEnum
CREATE TYPE "TypeEvenement" AS ENUM ('RENVOI_SIMPLE', 'RENVOI_EXPERT', 'RENVOI_NOTIFICATION', 'JUGEMENT_RENDU', 'MISE_EN_DELIBERE', 'ORDONNANCE_RENDUE', 'NOTIFICATION_PARTIE', 'SIGNIFICATION', 'INSCRIPTION_ROLE', 'MISE_EN_ETAT', 'EXPERTISE_ORDONNEE', 'EXPERTISE_DEPOSEE', 'APPEL_INTERJET', 'POURVOI_CASSATION', 'RADIATION', 'PEREMPTION', 'DESISTEMENT', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeDelai" AS ENUM ('APPEL', 'OPPOSITION', 'CASSATION', 'TIERCE_OPPOSITION', 'REQUETE_CIVILE', 'NOTIFICATION_JUGEMENT', 'EXECUTION_JUGEMENT', 'EXPERTISE', 'AUTRE');

-- CreateEnum
CREATE TYPE "CanalAlerte" AS ENUM ('WHATSAPP', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "TypeAlerte" AS ENUM ('NOUVEL_EVENEMENT', 'DELAI_CRITIQUE', 'DELAI_APPROCHE_7J', 'DELAI_APPROCHE_3J', 'DELAI_APPROCHE_1J', 'DELAI_EXPIRE', 'DIGEST_QUOTIDIEN', 'RENVOI_DETECTE');

-- CreateEnum
CREATE TYPE "StatutAlerte" AS ENUM ('EN_ATTENTE', 'ENVOYEE', 'ECHEC', 'IGNOREE');

-- CreateEnum
CREATE TYPE "PlanAbonnement" AS ENUM ('GRATUIT', 'SOLO', 'PRO', 'CABINET');

-- CreateEnum
CREATE TYPE "StatutAbonnement" AS ENUM ('ACTIF', 'SUSPENDU', 'ANNULE', 'EXPIRE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT,
    "whatsappNumero" TEXT,
    "whatsappVerifie" BOOLEAN NOT NULL DEFAULT false,
    "role" "UserRole" NOT NULL DEFAULT 'AVOCAT',
    "cabinetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cabinet" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "ville" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cabinet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "numeroDossier" TEXT NOT NULL,
    "tribunal" TEXT NOT NULL,
    "typeProcedure" "TypeProcedure" NOT NULL DEFAULT 'CIVILE',
    "titreAffaire" TEXT,
    "partieAdverse" TEXT,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "derniereVerif" TIMESTAMP(3),
    "prochaineVerif" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "cabinetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evenement" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "texteArabe" TEXT NOT NULL,
    "dateAudience" TIMESTAMP(3),
    "datePublicationGreffe" TIMESTAMP(3) NOT NULL,
    "typeEvenement" "TypeEvenement",
    "sousType" TEXT,
    "confiance" DOUBLE PRECISION,
    "estNouvel" BOOLEAN NOT NULL DEFAULT true,
    "estTraite" BOOLEAN NOT NULL DEFAULT false,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evenement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Echeance" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "evenementId" TEXT,
    "typeDelai" "TypeDelai" NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "dateDepart" TIMESTAMP(3) NOT NULL,
    "dateLimite" TIMESTAMP(3) NOT NULL,
    "estCritique" BOOLEAN NOT NULL DEFAULT false,
    "estExpire" BOOLEAN NOT NULL DEFAULT false,
    "estComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Echeance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerte" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dossierId" TEXT,
    "evenementId" TEXT,
    "echeanceId" TEXT,
    "canal" "CanalAlerte" NOT NULL,
    "typeAlerte" "TypeAlerte" NOT NULL,
    "message" TEXT NOT NULL,
    "messageAr" TEXT,
    "statut" "StatutAlerte" NOT NULL DEFAULT 'EN_ATTENTE',
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "erreur" TEXT,
    "envoyeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alerte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abonnement" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "cabinetId" TEXT,
    "plan" "PlanAbonnement" NOT NULL,
    "statut" "StatutAbonnement" NOT NULL DEFAULT 'ACTIF',
    "maxDossiers" INTEGER NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3),
    "dateRenouvellement" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "abonnementId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'MAD',
    "methode" TEXT NOT NULL,
    "referenceExterne" TEXT,
    "statut" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tribunal" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "nomAr" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "urlMahakim" TEXT,

    CONSTRAINT "Tribunal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_cabinetId_idx" ON "User"("cabinetId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Dossier_userId_idx" ON "Dossier"("userId");

-- CreateIndex
CREATE INDEX "Dossier_numeroDossier_idx" ON "Dossier"("numeroDossier");

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_numeroDossier_tribunal_userId_key" ON "Dossier"("numeroDossier", "tribunal", "userId");

-- CreateIndex
CREATE INDEX "Evenement_dossierId_idx" ON "Evenement"("dossierId");

-- CreateIndex
CREATE INDEX "Evenement_typeEvenement_idx" ON "Evenement"("typeEvenement");

-- CreateIndex
CREATE INDEX "Evenement_estTraite_idx" ON "Evenement"("estTraite");

-- CreateIndex
CREATE INDEX "Echeance_dossierId_idx" ON "Echeance"("dossierId");

-- CreateIndex
CREATE INDEX "Echeance_dateLimite_idx" ON "Echeance"("dateLimite");

-- CreateIndex
CREATE INDEX "Echeance_estCritique_idx" ON "Echeance"("estCritique");

-- CreateIndex
CREATE INDEX "Alerte_userId_idx" ON "Alerte"("userId");

-- CreateIndex
CREATE INDEX "Alerte_statut_idx" ON "Alerte"("statut");

-- CreateIndex
CREATE INDEX "Alerte_canal_idx" ON "Alerte"("canal");

-- CreateIndex
CREATE UNIQUE INDEX "Abonnement_cabinetId_key" ON "Abonnement"("cabinetId");

-- CreateIndex
CREATE UNIQUE INDEX "Tribunal_code_key" ON "Tribunal"("code");

-- CreateIndex
CREATE INDEX "Tribunal_ville_idx" ON "Tribunal"("ville");

-- CreateIndex
CREATE INDEX "Tribunal_type_idx" ON "Tribunal"("type");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evenement" ADD CONSTRAINT "Evenement_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echeance" ADD CONSTRAINT "Echeance_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Echeance" ADD CONSTRAINT "Echeance_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "Evenement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_evenementId_fkey" FOREIGN KEY ("evenementId") REFERENCES "Evenement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_echeanceId_fkey" FOREIGN KEY ("echeanceId") REFERENCES "Echeance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "Abonnement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
