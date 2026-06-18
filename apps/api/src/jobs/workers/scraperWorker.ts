import { Worker } from 'bullmq'
import { redisConnection, nlpQueue } from '../queues'
import { MahakimScraper, resolveTribunalNames } from '../../services/scraper/mahakimScraper'
import { logger } from '../../utils/logger'

const scraper = new MahakimScraper()

export const scraperWorker = new Worker(
  'scraper',
  async (job) => {
    const { userId } = job.data

    if (!scraper['browser']) {
      await scraper.init()
    }

    if (job.name === 'scrape-all') {
      await scraper.scraperTousDossiers(userId)
    } else if (job.name === 'scrape-dossier') {
      const { dossierId } = job.data
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()

      const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
      if (!dossier) return

      const { courAppel, tribunalPrimaire } = resolveTribunalNames(dossier.tribunal)
      const data = await scraper.scrapeDossier(dossier.numeroDossier, courAppel, tribunalPrimaire)
      if (data) {
        logger.info(`Scraping OK: ${dossier.numeroDossier} — ${data.evenements.length} événements`)
      }
    }

    await nlpQueue.add('process-pending', {}, { delay: 2000 })
  },
  { connection: redisConnection, concurrency: 1 }
)

scraperWorker.on('failed', (job, err) => {
  logger.error(`Scraper job ${job?.id} failed:`, err)
})
