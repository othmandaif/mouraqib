-- Statut des comptes : les inscriptions du site deviennent des demandes à activer par le commercial.
CREATE TYPE "StatutCompte" AS ENUM ('EN_ATTENTE', 'ACTIF', 'DESACTIVE');

ALTER TABLE "User"
  ADD COLUMN "statut" "StatutCompte" NOT NULL DEFAULT 'ACTIF',
  ADD COLUMN "demande" JSONB,
  ADD COLUMN "activeAt" TIMESTAMP(3),
  ADD COLUMN "desactiveAt" TIMESTAMP(3),
  ADD COLUMN "motifDesactivation" TEXT;

CREATE INDEX "User_statut_idx" ON "User"("statut");

-- Dépenses du service (hébergement, WhatsApp, IA, domaine…)
CREATE TABLE "Depense" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "categorie" TEXT NOT NULL,
  "libelle" TEXT NOT NULL,
  "montant" DOUBLE PRECISION NOT NULL,
  "recurrente" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Depense_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Depense_date_idx" ON "Depense"("date");
