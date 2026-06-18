-- Add new columns for mahakim.ma dossier format
ALTER TABLE "Dossier" ADD COLUMN "anneeDossier" TEXT;
ALTER TABLE "Dossier" ADD COLUMN "codeRole" TEXT;
ALTER TABLE "Dossier" ADD COLUMN "estCourAppel" BOOLEAN NOT NULL DEFAULT false;

-- Populate existing rows: parse "2024/8101/1234" into parts
-- Existing format might be "123/2024" or full format
UPDATE "Dossier" SET
  "anneeDossier" = CASE
    WHEN "numeroDossier" ~ '^\d{4}/\d+/\d+$' THEN SPLIT_PART("numeroDossier", '/', 1)
    WHEN "numeroDossier" ~ '\d{4}$' THEN RIGHT("numeroDossier", 4)
    ELSE '2024'
  END,
  "codeRole" = CASE
    WHEN "numeroDossier" ~ '^\d{4}/\d+/\d+$' THEN SPLIT_PART("numeroDossier", '/', 2)
    ELSE '0'
  END;

-- Make columns required after populating
ALTER TABLE "Dossier" ALTER COLUMN "anneeDossier" SET NOT NULL;
ALTER TABLE "Dossier" ALTER COLUMN "codeRole" SET NOT NULL;

-- Drop old unique constraint
DROP INDEX IF EXISTS "Dossier_numeroDossier_tribunal_userId_key";

-- Add new unique constraint
CREATE UNIQUE INDEX "Dossier_anneeDossier_codeRole_numeroDossier_tribunal_userId_key"
  ON "Dossier"("anneeDossier", "codeRole", "numeroDossier", "tribunal", "userId");
