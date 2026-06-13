import { Worker } from 'bullmq'
import { redisConnection, deadlineQueue } from '../queues'
import { NLPService } from '../../services/nlp/nlpService'
import { logger } from '../../utils/logger'

const nlpService = new NLPService()

export const nlpWorker = new Worker(
  'nlp',
  async () => {
    await nlpService.traiterEvenementsEnAttente()
    await deadlineQueue.add('generate-deadlines', {}, { delay: 1000 })
  },
  { connection: redisConnection, concurrency: 1 }
)

nlpWorker.on('failed', (job, err) => {
  logger.error(`NLP job ${job?.id} failed:`, err)
})
