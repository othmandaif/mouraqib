-- CRM (clients, journal des échanges) et facturation (factures, notes d'honoraires, avoirs, règlements).
-- Migration additive : aucune donnée existante modifiée.

-- CreateEnum
CREATE TYPE "TypeClient" AS ENUM ('PERSONNE', 'SOCIETE');
CREATE TYPE "TypeInteraction" AS ENUM ('APPEL', 'RENDEZ_VOUS', 'MESSAGE', 'EMAIL', 'NOTE');
CREATE TYPE "TypeFacture" AS ENUM ('FACTURE', 'NOTE_HONORAIRES', 'AVOIR');
CREATE TYPE "StatutFacture" AS ENUM ('BROUILLON', 'EMISE', 'ANNULEE');
CREATE TYPE "ModeReglement" AS ENUM ('ESPECES', 'CHEQUE', 'VIREMENT', 'EFFET', 'AUTRE');

-- AlterTable
ALTER TABLE "Dossier" ADD COLUMN "clientId" TEXT,
ADD COLUMN "honorairesConvenusCentimes" INTEGER;

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cabinetId" TEXT,
    "type" "TypeClient" NOT NULL DEFAULT 'PERSONNE',
    "nom" TEXT NOT NULL,
    "cin" TEXT,
    "ice" TEXT,
    "rc" TEXT,
    "identifiantFiscal" TEXT,
    "representant" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "notes" TEXT,
    "estArchive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteractionClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dossierId" TEXT,
    "userId" TEXT NOT NULL,
    "type" "TypeInteraction" NOT NULL DEFAULT 'NOTE',
    "resume" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InteractionClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfilFacturation" (
    "id" TEXT NOT NULL,
    "espace" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "barreau" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "ice" TEXT,
    "identifiantFiscal" TEXT,
    "taxeProfessionnelle" TEXT,
    "rib" TEXT,
    "banque" TEXT,
    "piedPage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfilFacturation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceFacture" (
    "espace" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SequenceFacture_pkey" PRIMARY KEY ("espace","annee")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "espace" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cabinetId" TEXT,
    "type" "TypeFacture" NOT NULL DEFAULT 'NOTE_HONORAIRES',
    "statut" "StatutFacture" NOT NULL DEFAULT 'BROUILLON',
    "numero" TEXT,
    "clientId" TEXT NOT NULL,
    "dossierId" TEXT,
    "factureOrigineId" TEXT,
    "dateEmission" TIMESTAMP(3),
    "dateEcheance" TIMESTAMP(3),
    "lignes" JSONB NOT NULL,
    "tauxTva" DOUBLE PRECISION NOT NULL,
    "totalHtCentimes" INTEGER NOT NULL DEFAULT 0,
    "tvaCentimes" INTEGER NOT NULL DEFAULT 0,
    "totalTtcCentimes" INTEGER NOT NULL DEFAULT 0,
    "modePaiement" TEXT,
    "notes" TEXT,
    "emetteur" JSONB,
    "destinataire" JSONB,
    "emiseAt" TIMESTAMP(3),
    "annuleeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reglement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cabinetId" TEXT,
    "clientId" TEXT NOT NULL,
    "dossierId" TEXT,
    "factureId" TEXT,
    "montantCentimes" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mode" "ModeReglement" NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reglement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dossier_clientId_idx" ON "Dossier"("clientId");
CREATE INDEX "Client_userId_idx" ON "Client"("userId");
CREATE INDEX "Client_cabinetId_idx" ON "Client"("cabinetId");
CREATE INDEX "Client_nom_idx" ON "Client"("nom");
CREATE INDEX "InteractionClient_clientId_date_idx" ON "InteractionClient"("clientId", "date");
CREATE UNIQUE INDEX "ProfilFacturation_espace_key" ON "ProfilFacturation"("espace");
CREATE UNIQUE INDEX "Facture_factureOrigineId_key" ON "Facture"("factureOrigineId");
CREATE INDEX "Facture_espace_statut_idx" ON "Facture"("espace", "statut");
CREATE INDEX "Facture_clientId_idx" ON "Facture"("clientId");
CREATE INDEX "Facture_dossierId_idx" ON "Facture"("dossierId");
CREATE UNIQUE INDEX "Facture_espace_numero_key" ON "Facture"("espace", "numero");
CREATE INDEX "Reglement_clientId_idx" ON "Reglement"("clientId");
CREATE INDEX "Reglement_dossierId_idx" ON "Reglement"("dossierId");
CREATE INDEX "Reglement_factureId_idx" ON "Reglement"("factureId");
CREATE INDEX "Reglement_userId_date_idx" ON "Reglement"("userId", "date");

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InteractionClient" ADD CONSTRAINT "InteractionClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InteractionClient" ADD CONSTRAINT "InteractionClient_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_factureOrigineId_fkey" FOREIGN KEY ("factureOrigineId") REFERENCES "Facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reglement" ADD CONSTRAINT "Reglement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reglement" ADD CONSTRAINT "Reglement_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reglement" ADD CONSTRAINT "Reglement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
