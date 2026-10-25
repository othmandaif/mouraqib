import { prisma } from '../utils/prisma'
import { redisConnection } from '../jobs/queues'
import { logger } from '../utils/logger'
import { decalageMaroc } from '../utils/dateMaroc'

// Seules les lignes écrites AVANT ce démarrage (par l'ancien code) sont corrigées
const DEMARRAGE = new Date()

/** Exécute une correction de données une seule fois (drapeau Redis). */
async function uneFois(nom: string, fn: () => Promise<number>): Promise<void> {
  const cle = `migration:${nom}`
  if (await redisConnection.get(cle)) return
  const n = await fn()
  await redisConnection.set(cle, new Date().toISOString())
  logger.info(`Correction de données « ${nom} » : ${n} lignes`)
}

/**
 * Les heures d'audience étaient lues comme si mahakim affichait l'heure UTC : « 10:00 » au Maroc
 * devenait 10:00 UTC, soit 11:00 à l'écran. On retire le décalage marocain aux audiences qui
 * ont une heure (les dates sans heure restent à 00:00 UTC, convention de l'app).
 */
export async function corrigerHeuresAudience(): Promise<void> {
  await uneFois('heures-audience-v1', async () => {
    const evs = await prisma.evenement.findMany({ where: { dateAudience: { not: null }, createdAt: { lt: DEMARRAGE } }, select: { id: true, dateAudience: true } })
    let n = 0
    for (const e of evs) {
      const d = e.dateAudience!
      if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) continue
      await prisma.evenement.update({ where: { id: e.id }, data: { dateAudience: new Date(d.getTime() - decalageMaroc(d)) } })
      n++
    }
    return n
  })
  // Premier passage des alertes « nouvel acte » (jamais branchées jusqu'ici) : sans cela, tout
  // l'historique serait notifié d'un coup. Les actes de plus de 3 jours sont marqués comme vus.
  await uneFois('anciens-actes-vus-v1', async () => {
    const r = await prisma.evenement.updateMany({
      where: { estNouvel: true, createdAt: { lt: new Date(Date.now() - 3 * 86_400_000) } },
      data: { estNouvel: false },
    })
    return r.count
  })
}
