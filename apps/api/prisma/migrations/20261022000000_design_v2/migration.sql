-- Design V2 « Agir ou surveiller » — ajouts uniquement (aucune donnée supprimée)

ALTER TYPE "TypeAlerte" ADD VALUE 'NOUVEAU_DELAI';
ALTER TYPE "TypeAlerte" ADD VALUE 'RAPPEL_DELAI';
ALTER TYPE "TypeAlerte" ADD VALUE 'RAPPORT_SYNC';

CREATE TYPE "RoleClient" AS ENUM ('DEMANDEUR', 'DEFENDEUR', 'INCONNU');
CREATE TYPE "NatureJugement" AS ENUM ('CONTRADICTOIRE', 'DEFAUT');
CREATE TYPE "CampDelai" AS ENUM ('AGIR', 'SURVEILLER');

ALTER TABLE "User"
  ADD COLUMN "barreau" TEXT,
  ADD COLUMN "preferences" JSONB,
  ADD COLUMN "calendarToken" TEXT,
  ADD COLUMN "deuxFacteurs" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "motDePasseChangeAt" TIMESTAMP(3),
  ADD COLUMN "suppressionDemandeeAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_calendarToken_key" ON "User"("calendarToken");

ALTER TABLE "Dossier" ADD COLUMN "roleClient" "RoleClient" NOT NULL DEFAULT 'INCONNU';

ALTER TABLE "Evenement" ADD COLUMN "natureJugement" "NatureJugement";

ALTER TABLE "Echeance"
  ADD COLUMN "completeAt" TIMESTAMP(3),
  ADD COLUMN "camp" "CampDelai" NOT NULL DEFAULT 'AGIR',
  ADD COLUMN "rappelAt" TIMESTAMP(3);

ALTER TABLE "Alerte" ADD COLUMN "luAt" TIMESTAMP(3);

ALTER TABLE "MessageChat"
  ADD COLUMN "sources" JSONB,
  ADD COLUMN "feedback" INTEGER;

CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'AVOCAT',
  "token" TEXT NOT NULL,
  "invitantId" TEXT NOT NULL,
  "accepteeAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_invitantId_idx" ON "Invitation"("invitantId");
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitantId_fkey" FOREIGN KEY ("invitantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RendezVous" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dossierId" TEXT,
  "titre" TEXT NOT NULL,
  "lieu" TEXT,
  "debut" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RendezVous_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RendezVous_userId_debut_idx" ON "RendezVous"("userId", "debut");
ALTER TABLE "RendezVous" ADD CONSTRAINT "RendezVous_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RendezVous" ADD CONSTRAINT "RendezVous_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
