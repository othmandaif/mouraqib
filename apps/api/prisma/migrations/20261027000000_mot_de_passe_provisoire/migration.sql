-- Mot de passe provisoire (créé ou réinitialisé par l'admin) : changement obligatoire à la connexion
ALTER TABLE "User" ADD COLUMN "doitChangerMdp" BOOLEAN NOT NULL DEFAULT false;
