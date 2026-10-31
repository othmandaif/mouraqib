-- Droits par membre du cabinet (gérés par le responsable). Vide = tous les droits.
ALTER TABLE "User" ADD COLUMN "droitsRetires" TEXT[] DEFAULT ARRAY[]::TEXT[];
-- Les secrétaires existantes gardent leur comportement : pas d'archivage ni de suppression de dossiers
UPDATE "User" SET "droitsRetires" = ARRAY['SUPPRESSION_DOSSIERS'] WHERE "role" = 'SECRETAIRE';
