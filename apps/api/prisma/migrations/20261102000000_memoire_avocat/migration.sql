-- Mémoire de l'assistant par avocat
CREATE TYPE "TypeMemoire" AS ENUM ('PREFERENCE', 'PRATIQUE', 'CORRECTION', 'FORMULE');

ALTER TABLE "User" ADD COLUMN "memoireActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "MemoireAvocat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TypeMemoire" NOT NULL,
    "texte" TEXT NOT NULL,
    "source" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MemoireAvocat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MemoireAvocat_userId_actif_idx" ON "MemoireAvocat"("userId", "actif");

ALTER TABLE "MemoireAvocat" ADD CONSTRAINT "MemoireAvocat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
