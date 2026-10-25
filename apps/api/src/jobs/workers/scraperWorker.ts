import { Worker } from 'bullmq'
import { pauseRestante } from '../../services/scraper/santeMahakim'
import { redisConnection, nlpQueue } from '../queues'
import { MahakimScraper } from '../../services/scraper/mahakimScraper'
import { planifierScraping } from '../../services/scraper/planificateur'
import { logger } from '../../utils/logger'
import { AlertService } from '../../services/alerts/alertService'
import { battement } from '../../services/deadlines/controleSecurite'

const alertService = new AlertService()
const scraper = new MahakimScraper()

// Réglables sans redéployer le code :
// - SCRAPER_CONCURRENCY : pages ouvertes en même temps PAR processus (limité par le processeur : ~35 lectures/min par cœur
//   mesurées avec un portail rapide) ;
// - SCRAPER_PAR_MINUTE : plafond de lectures par minute, COMMUN à tous les processus (limiteur BullMQ global à la file).
//   Ajouter des processus PROCESS_ROLE=workers n'augmente donc le débit que si ce plafond est relevé aussi.
// Capacité nécessaire ≈ dossiers chauds / 2 h + normaux / 6 h + dormants / 24 h (voir planificateur.ts).
const CONCURRENCE = Number(process.env.SCRAPER_CONCURRENCY ?? 2)
const PAR_MINUTE = Number(process.env.SCRAPER_PAR_MINUTE ?? 20)

let initEnCours: Promise<void> | null = null
async function navigateurPret() {
  if (scraper['browser']) return
  initEnCours ??= scraper.init().finally(() => { initEnCours = null })
  await initEnCours
}

export const scraperWorker = new Worker(
  'scraper',
  async (job) => {
    // Planification : ne scrape rien elle-même, met les dossiers dus en file (un job par dossier)
    if (job.name === 'planifier' || job.name === 'scrape-all') {
      await planifierScraping({ force: !!job.data?.force || job.name === 'scrape-all', userId: job.data?.userId })
      await battement('scraper')
      return
    }

    if (job.name === 'scrape-dossier') {
      // mahakim en panne (coupe-circuit) : le job retourne en file sans compter d'essai, le robot attend
      const pause = await pauseRestante()
      if (pause > 0) {
        await scraperWorker.rateLimit(pause)
        throw Worker.RateLimitError()
      }
      await navigateurPret()
      // Passage planifié : ignoré si le dossier a été lu il y a moins de 15 min
      const n = await scraper.scraperUnDossier(job.data.dossierId, job.data?.planifie ? 15 * 60_000 : 0)
      if (n > 0) {
        // Une seule classification par minute, quel que soit le nombre de dossiers lus
        await nlpQueue.add('process-pending', {}, { delay: 5000, jobId: `nlp-${Math.floor(Date.now() / 60_000)}`, removeOnComplete: true })
      }
    }
  },
  { connection: redisConnection, concurrency: CONCURRENCE, limiter: { max: PAR_MINUTE, duration: 60_000 } },
)

scraperWorker.on('failed', (job, err) => {
  logger.error(`Scraper job ${job?.id} failed:`, err)
  // Dernière tentative ratée sur un dossier → alerte « تعذّرت مزامنة » dans la page des alertes
  // Passage planifié : pas d'alerte à chaque échec (attente croissante + filet des 48 h dans controleSecurite)
  if (job?.name === 'scrape-dossier' && job.data?.dossierId && !job.data?.planifie && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    alertService.alerterEchecSync(job.data.dossierId).catch((e) => logger.warn('alerte sync:', e))
  }
})
