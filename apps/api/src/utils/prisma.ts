import { PrismaClient } from '@prisma/client'

// Un seul client (donc un seul pool de connexions) pour toute l'API et les workers.
// Avant : un `new PrismaClient()` par fichier → ~25 pools ouverts sur PostgreSQL.
const globalPourPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalPourPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalPourPrisma.prisma = prisma // évite les doublons au rechargement à chaud
