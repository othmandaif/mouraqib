-- CreateEnum
CREATE TYPE "StatutDossier" AS ENUM ('OUVERT', 'EN_DELIBERE', 'CLOS', 'INCONNU');

-- CreateEnum
CREATE TYPE "RoleChat" AS ENUM ('USER', 'ASSISTANT');

-- AlterTable
ALTER TABLE "Dossier" ADD COLUMN     "analyseAt" TIMESTAMP(3),
ADD COLUMN     "analyseIA" JSONB,
ADD COLUMN     "resumeIA" TEXT,
ADD COLUMN     "statutIA" "StatutDossier" NOT NULL DEFAULT 'INCONNU';

-- CreateTable
CREATE TABLE "MessageChat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dossierId" TEXT,
    "role" "RoleChat" NOT NULL,
    "contenu" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageChat_userId_idx" ON "MessageChat"("userId");

-- CreateIndex
CREATE INDEX "MessageChat_dossierId_idx" ON "MessageChat"("dossierId");

-- AddForeignKey
ALTER TABLE "MessageChat" ADD CONSTRAINT "MessageChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageChat" ADD CONSTRAINT "MessageChat_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
