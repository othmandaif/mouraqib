import { scraperQueue, nlpQueue, alertQueue, deadlineQueue } from './queues'
import { logger } from '../utils/logger'

export async function startScheduler(): Promise<void> {
  // Scraping all active dossiers — every 4 hours
  await scraperQueue.upsertJobScheduler(
    'scrape-all-recurring',
    { every: 4 * 60 * 60 * 1000 },
    { name: 'scrape-all', data: {} }
  )

  // NLP classification — every 30 minutes
  await nlpQueue.upsertJobScheduler(
    'nlp-recurring',
    { every: 30 * 60 * 1000 },
    { name: 'process-pending', data: {} }
  )

  // Send pending alerts — every 5 minutes
  await alertQueue.upsertJobScheduler(
    'alerts-recurring',
    { every: 5 * 60 * 1000 },
    { name: 'send-pending', data: {} }
  )

  // Morning digest — every day at 7:00 AM Morocco time (UTC+1)
  await alertQueue.upsertJobScheduler(
    'digest-quotidien-recurring',
    { pattern: '0 6 * * *' },
    { name: 'digest-quotidien', data: {} }
  )

  // Deadline generation + status update — every hour
  await deadlineQueue.upsertJobScheduler(
    'deadlines-recurring',
    { every: 60 * 60 * 1000 },
    { name: 'generate-deadlines', data: {} }
  )

  logger.info('Scheduler démarré — 5 jobs récurrents configurés')
}
