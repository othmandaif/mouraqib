import { Worker, Job } from 'bullmq'
import { redisConnection, searchResultKey } from '../queues'
import { MahakimScraper } from '../../services/scraper/mahakimScraper'
import { logger } from '../../utils/logger'

// Une seule instance de scraper réutilisée (browser persistant) — clé de la performance.
const scraper = new MahakimScraper()

// TTL du résultat dans Redis (5 min) : largement assez pour que le front le récupère.
const RESULT_TTL_SECONDS = 300

interface SearchJobData {
  anneeDossier: string
  codeRole: string
  numeroDossier: string
  courAppel: string
  tribunalPrimaire?: string
}

export const searchWorker = new Worker(
  'search',
  async (job: Job<SearchJobData>) => {
    const { anneeDossier, codeRole, numeroDossier, courAppel, tribunalPrimaire } = job.data
    const numComplet = `${anneeDossier}/${codeRole}/${numeroDossier}`

    if (!scraper['browser']) {
      await scraper.init()
    }

    let payload
    try {
      const data = await scraper.scrapeDossier(numComplet, courAppel, tribunalPrimaire)
      if (!data) {
        payload = {
          trouve: false, titreAffaire: null, evenements: [], infosCarte: null,
          parties: [], expertises: [], recours: [], dossiersLies: [],
        }
        logger.warn(`Recherche live: aucun résultat pour ${numComplet}`)
      } else {
        payload = {
          trouve: true,
          titreAffaire: data.titreAffaire ?? null,
          evenements: data.evenements,
          infosCarte: data.infosCarte,
          parties: data.parties,
          expertises: data.expertises,
          recours: data.recours,
          dossiersLies: data.dossiersLies,
        }
        logger.info(`Recherche live OK pour ${numComplet}: ${data.evenements.length} événements`)
      }
    } catch (err) {
      logger.error(`Recherche live échouée pour ${numComplet}:`, err)
      payload = {
        trouve: false, titreAffaire: null, evenements: [], infosCarte: null,
        parties: [], expertises: [], recours: [], dossiersLies: [], erreur: true,
      }
    }

    // On stocke le résultat dans Redis ; le front le récupère via /rechercher/:jobId
    await redisConnection.set(
      searchResultKey(job.id as string),
      JSON.stringify(payload),
      'EX',
      RESULT_TTL_SECONDS,
    )

    return payload
  },
  {
    connection: redisConnection,
    // concurrency 1 : Playwright = 1 browser/contexte. On peut augmenter plus tard
    // si on lance plusieurs contextes en parallèle.
    concurrency: 1,
  },
)

searchWorker.on('failed', (job, err) => {
  logger.error(`Search job ${job?.id} failed:`, err)
})