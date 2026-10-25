-- Index composés pour les requêtes les plus fréquentes (ajouts seulement)
CREATE INDEX IF NOT EXISTS "Dossier_userId_estActif_idx" ON "Dossier"("userId", "estActif");
CREATE INDEX IF NOT EXISTS "Evenement_dossierId_datePublicationGreffe_idx" ON "Evenement"("dossierId", "datePublicationGreffe");
CREATE INDEX IF NOT EXISTS "Echeance_dossierId_estComplete_dateLimite_idx" ON "Echeance"("dossierId", "estComplete", "dateLimite");
CREATE INDEX IF NOT EXISTS "Alerte_userId_canal_luAt_idx" ON "Alerte"("userId", "canal", "luAt");
CREATE INDEX IF NOT EXISTS "Alerte_statut_canal_idx" ON "Alerte"("statut", "canal");
CREATE INDEX IF NOT EXISTS "MessageChat_conversationId_createdAt_idx" ON "MessageChat"("conversationId", "createdAt");
