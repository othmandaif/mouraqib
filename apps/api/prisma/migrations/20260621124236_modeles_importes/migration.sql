/*
  Warnings:

  - You are about to drop the column `importeParAvocat` on the `Dossier` table. All the data in the column will be lost.
  - You are about to drop the column `styleResume` on the `Dossier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Dossier" DROP COLUMN "importeParAvocat",
DROP COLUMN "styleResume";

-- AlterTable
ALTER TABLE "ModeleDocument" ADD COLUMN     "importeParAvocat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "styleResume" TEXT;
