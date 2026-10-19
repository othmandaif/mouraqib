import { Worker } from 'bullmq'
import { redisConnection } from '../queues'
import { NLPService } from '../../services/nlp/nlpService'
import { analyserDossiersAvecNouveautes } from '../../services/ai/dossierClassifier'
import { logger } from '../../utils/logger'

const nlp = new NLPService()

export const nlpWorker = new Worker(
  'nlp',
  async (job) => {
    if (job.name === 'process-pending') {
      // 1) Classification des événements (règles + LLM) — logique existante
      await nlp.traiterEvenementsEnAttente()

      // 2) Analyse IA au niveau dossier (statut, type procédure, résumé)
      //    Ciblée : uniquement les dossiers ayant des événements estNouvel=true.
      try {
        await analyserDossiersAvecNouveautes()
      } catch (err) {
        logger.error('Analyse IA dossiers échouée:', err)
      }
    }
  },
  { connection: redisConnection, concurrency: 1 },
)

nlpWorker.on('failed', (job, err) => {
  logger.error(`NLP job ${job?.id} failed:`, err)
})