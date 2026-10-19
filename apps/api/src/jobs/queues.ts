import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

export const scraperQueue = new Queue('scraper', { connection })
export const nlpQueue = new Queue('nlp', { connection })
export const alertQueue = new Queue('alerts', { connection })
export const deadlineQueue = new Queue('deadlines', { connection })

// File dédiée aux recherches "live" déclenchées par l'utilisateur (route /rechercher).
// Séparée de scraperQueue pour que ces recherches interactives ne soient pas bloquées
// derrière les gros jobs de scraping récurrent.
export const searchQueue = new Queue('search', { connection })

// Clé Redis où le worker stocke le résultat d'une recherche live, lue par le polling.
// Définie ici (et non dans le worker) pour que la route puisse l'importer sans
// déclencher le chargement du Worker.
export const searchResultKey = (jobId: string) => `search:result:${jobId}`

export { connection as redisConnection }