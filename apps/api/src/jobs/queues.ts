import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

// Sans nettoyage, BullMQ garde chaque job terminé dans Redis : des centaines de milliers par mois
// avec beaucoup de dossiers (mémoire Redis qui ne fait que grossir).
const defaultJobOptions = { removeOnComplete: { age: 86_400, count: 1000 }, removeOnFail: { age: 7 * 86_400, count: 5000 } }

export const scraperQueue = new Queue('scraper', { connection, defaultJobOptions })
export const nlpQueue = new Queue('nlp', { connection, defaultJobOptions })
export const alertQueue = new Queue('alerts', { connection, defaultJobOptions })
export const deadlineQueue = new Queue('deadlines', { connection, defaultJobOptions })

// File dédiée aux recherches "live" déclenchées par l'utilisateur (route /rechercher).
// Séparée de scraperQueue pour que ces recherches interactives ne soient pas bloquées
// derrière les gros jobs de scraping récurrent.
export const searchQueue = new Queue('search', { connection })

// Clé Redis où le worker stocke le résultat d'une recherche live, lue par le polling.
// Définie ici (et non dans le worker) pour que la route puisse l'importer sans
// déclencher le chargement du Worker.
export const searchResultKey = (jobId: string) => `search:result:${jobId}`

export { connection as redisConnection }