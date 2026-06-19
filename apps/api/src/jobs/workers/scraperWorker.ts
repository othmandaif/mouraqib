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
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()

      if (userId) {
        // Scrape les dossiers d'un utilisateur précis
        await scraper.scraperTousDossiers(userId)
      } else {
        // Pas de userId (ex: cron "fin de journée") → tous les utilisateurs actifs.
        // On boucle utilisateur par utilisateur pour réutiliser scraperTousDossiers
        // et garder le même navigateur (concurrency 1).
        const users = await prisma.user.findMany({
          where: { abonnements: { some: { statut: 'ACTIF' } } },
          select: { id: true },
        })
        logger.info(`scrape-all global (${job.data.raison ?? 'manuel'}) : ${users.length} utilisateurs`)
        for (const u of users) {
          try {
            await scraper.scraperTousDossiers(u.id)
          } catch (err) {
            logger.error(`scrape-all: échec pour user ${u.id}:`, err)
          }
        }
      }
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
  { connection: redisConnection, concurrency: 1 },
)

scraperWorker.on('failed', (job, err) => {
  logger.error(`Scraper job ${job?.id} failed:`, err)
})