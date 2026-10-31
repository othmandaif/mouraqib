import { Worker } from 'bullmq'
import { redisConnection, deadlineQueue } from '../queues'
import { battement } from '../../services/deadlines/controleSecurite'
import { NLPService } from '../../services/nlp/nlpService'
import { analyserDossiersAvecNouveautes } from '../../services/ai/dossierClassifier'
import { logger } from '../../utils/logger'

const nlp = new NLPService()

export const nlpWorker = new Worker(
  'nlp',
  async (job) => {
    if (job.name === 'process-pending') {
      // 1) Classification des événements (règles + LLM) — logique existante
      const classes = await nlp.traiterEvenementsEnAttente()
      // Nouveaux événements classés → délais calculés tout de suite (au lieu d'attendre le passage horaire)
      // Pas de jobId « par minute » : un 2e classement dans la même minute était ignoré (job déjà terminé, même id)
      // et le délai n'apparaissait qu'au passage suivant (jusqu'à 1 h plus tard). Les passages se suivent
      // (concurrency 1 + verrou « delais »), un passage sans nouvel acte coûte une requête.
      if (classes > 0) await deadlineQueue.add('generate-deadlines', {})
      await battement('nlp')

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