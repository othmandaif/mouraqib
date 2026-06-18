import { Worker } from 'bullmq'
import { redisConnection } from '../queues'
import { AlertService } from '../../services/alerts/alertService'
import { DeadlineService } from '../../services/deadlines/deadlineService'
import { logger } from '../../utils/logger'

const alertService = new AlertService()
const deadlineService = new DeadlineService()

export const alertWorker = new Worker(
  'alerts',
  async (job) => {
    if (job.name === 'send-pending') {
      await alertService.envoyerAlertesEnAttente()
    } else if (job.name === 'digest-quotidien') {
      await alertService.envoyerDigestQuotidien()
    } else if (job.name === 'nouveaux-evenements') {
      await alertService.traiterNouveauxEvenements()
    }
  },
  { connection: redisConnection, concurrency: 1 }
)

export const deadlineWorker = new Worker(
  'deadlines',
  async () => {
    await deadlineService.genererEcheances()
    await deadlineService.mettreAJourStatuts()
    await alertService.genererAlertesDelaisCritiques()
  },
  { connection: redisConnection, concurrency: 1 }
)

alertWorker.on('failed', (job, err) => {
  logger.error(`Alert job ${job?.id} failed:`, err)
})

deadlineWorker.on('failed', (job, err) => {
  logger.error(`Deadline job ${job?.id} failed:`, err)
})
