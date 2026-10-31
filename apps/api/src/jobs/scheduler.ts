import { scraperQueue, nlpQueue, alertQueue, deadlineQueue } from './queues'
import { logger } from '../utils/logger'

export async function startScheduler(): Promise<void> {
  // Ancien « tout scraper toutes les 4 h » : supprimé de Redis s'il existe encore
  await scraperQueue.removeJobScheduler('scrape-all-recurring').catch(() => {})

  // Planification du scraping toutes les 30 min : un job par dossier dû, les plus urgents d'abord
  await scraperQueue.upsertJobScheduler(
    'planifier-scraping',
    { every: 30 * 60 * 1000 },
    { name: 'planifier', data: {} }
  )

  // Passage du SOIR — 21:00 heure du Maroc (20:00 UTC) : tout dossier non vérifié depuis 6 h,
  // pour que la journée suivante parte de données fraîches.
  await scraperQueue.upsertJobScheduler(
    'scrape-fin-journee',
    { pattern: '0 20 * * *' },
    { name: 'planifier', data: { force: true } }
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

  // Résumé du matin : le job tourne chaque heure ; chaque avocat le reçoit à l'heure
  // choisie dans Paramètres (heure du Maroc, jours ouvrables), une fois par jour.
  await alertQueue.upsertJobScheduler(
    'digest-quotidien-recurring',
    { pattern: '2 * * * *' },
    { name: 'digest-quotidien', data: {} }
  )

  // Deadline generation + status update — every hour
  await deadlineQueue.upsertJobScheduler(
    'deadlines-recurring',
    { every: 60 * 60 * 1000 },
    { name: 'generate-deadlines', data: {} }
  )

  logger.info('Scheduler démarré — planification du scraping (30 min + soir), NLP, alertes, résumé, délais')
}