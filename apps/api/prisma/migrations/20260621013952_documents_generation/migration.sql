-- CreateEnum
CREATE TYPE "CategorieActe" AS ENUM ('CONTRAT', 'REQUETE', 'CORRESPONDANCE', 'SOCIETE', 'AUTRE');

-- CreateEnum
CREATE TYPE "LangueDocument" AS ENUM ('AR', 'FR');

-- CreateEnum
CREATE TYPE "StatutDocument" AS ENUM ('BROUILLON', 'FINALISE', 'ARCHIVE');

-- CreateTable
CREATE TABLE "ModeleDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "cabinetId" TEXT,
    "typeActe" TEXT NOT NULL,
    "categorie" "CategorieActe" NOT NULL DEFAULT 'AUTRE',
    "titre" TEXT NOT NULL,
    "langue" "LangueDocument" NOT NULL DEFAULT 'AR',
    "description" TEXT,
    "contenu" TEXT NOT NULL,
    "variables" JSONB,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cabinetId" TEXT,
    "dossierId" TEXT,
    "modeleId" TEXT,
    "typeActe" TEXT NOT NULL,
    "categorie" "CategorieActe" NOT NULL DEFAULT 'AUTRE',
    "titre" TEXT NOT NULL,
    "langue" "LangueDocument" NOT NULL DEFAULT 'AR',
    "contenu" TEXT NOT NULL,
    "variables" JSONB,
    "promptLibre" TEXT,
    "statut" "StatutDocument" NOT NULL DEFAULT 'BROUILLON',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModeleDocument_typeActe_idx" ON "ModeleDocument"("typeActe");

-- CreateIndex
CREATE INDEX "ModeleDocument_userId_idx" ON "ModeleDocument"("userId");

-- CreateIndex
CREATE INDEX "ModeleDocument_cabinetId_idx" ON "ModeleDocument"("cabinetId");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Document_dossierId_idx" ON "Document"("dossierId");

-- CreateIndex
CREATE INDEX "Document_typeActe_idx" ON "Document"("typeActe");

-- AddForeignKey
ALTER TABLE "ModeleDocument" ADD CONSTRAINT "ModeleDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeleDocument" ADD CONSTRAINT "ModeleDocument_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_modeleId_fkey" FOREIGN KEY ("modeleId") REFERENCES "ModeleDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
