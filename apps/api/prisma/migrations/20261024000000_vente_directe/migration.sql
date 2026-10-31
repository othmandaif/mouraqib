-- Vente directe par un commercial (plus de paiement CMI) + recalage des délais existants.
ALTER TYPE "PlanAbonnement" ADD VALUE IF NOT EXISTS 'SUR_MESURE';
ALTER TYPE "TypeAlerte" ADD VALUE IF NOT EXISTS 'ABONNEMENT';

ALTER TABLE "Abonnement"
  ADD COLUMN IF NOT EXISTS "estFondateur" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "prixMensuel" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "essaiJusquAu" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "payeJusquAu" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "note" TEXT;

-- Comptes existants : la date de fin actuelle devient la fin de la période offerte, et l'ancienne
-- offre gratuite (3 dossiers) passe en « فردي » pour ne bloquer aucun avocat déjà inscrit.
UPDATE "Abonnement" SET "essaiJusquAu" = "dateFin" WHERE "essaiJusquAu" IS NULL AND "statut" = 'ACTIF';
UPDATE "Abonnement" SET "plan" = 'SOLO', "maxDossiers" = 150 WHERE "plan" = 'GRATUIT';

-- ── Délais existants ──────────────────────────────────────────────────────────
-- 1) Les recours (appel, opposition, cassation) partaient parfois de la date de la PROCHAINE audience
--    (souvent future) au lieu de la date de l'acte : limite trop tardive. On les recale sur l'acte.
UPDATE "Echeance" e
SET "dateLimite" = e."dateLimite" - (ev."dateAudience" - ev."datePublicationGreffe"),
    "dateDepart" = ev."datePublicationGreffe"
FROM "Evenement" ev
WHERE e."evenementId" = ev.id
  AND e."typeDelai" IN ('APPEL', 'OPPOSITION', 'CASSATION')
  AND e."estComplete" = false
  AND ev."dateAudience" IS NOT NULL
  AND ev."dateAudience" > ev."datePublicationGreffe"
  AND e."dateDepart" = ev."dateAudience";

-- 2) Le recalage « fin du dernier jour, heure du Maroc » est fait par l'API au premier passage
--    du job des délais (DeadlineService.normaliserLimites) : les fuseaux de PostgreSQL ne sont pas
--    toujours à jour pour le Maroc, ceux de Node le sont.
