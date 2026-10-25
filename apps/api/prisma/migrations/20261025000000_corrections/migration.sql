-- E-mails en minuscules (la connexion distinguait « Avocat@x.ma » de « avocat@x.ma »).
-- On ne touche pas un compte si sa version en minuscules existe déjà (doublon à régler à la main).
UPDATE "User" u SET "email" = lower(trim(u."email"))
WHERE u."email" <> lower(trim(u."email"))
  AND NOT EXISTS (SELECT 1 FROM "User" v WHERE v."email" = lower(trim(u."email")) AND v."id" <> u."id");

UPDATE "Invitation" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));

-- Rappels personnels « ذكّروني يوم … » lus à chaque passage horaire
CREATE INDEX IF NOT EXISTS "Echeance_rappelAt_idx" ON "Echeance"("rappelAt");
