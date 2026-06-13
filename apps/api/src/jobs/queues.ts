import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

export const scraperQueue = new Queue('scraper', { connection })
export const nlpQueue = new Queue('nlp', { connection })
export const alertQueue = new Queue('alerts', { connection })
export const deadlineQueue = new Queue('deadlines', { connection })

export { connection as redisConnection }
