-- Limite de dossiers : illimitée par défaut, fixée au cas par cas par l'administrateur.
-- Les abonnements « فردي » avaient automatiquement 150 (aucun écran ne permettait de la changer) : ils passent à illimité.
UPDATE "Abonnement" SET "maxDossiers" = -1 WHERE "plan" = 'SOLO' AND "maxDossiers" = 150;
