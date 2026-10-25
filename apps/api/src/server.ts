import './utils/erreursAsync' // doit précéder l'import des routes
import express from 'express'
import { logger } from './utils/logger'
import routes from './routes'
import { prisma } from './utils/prisma'
import { entetesSecurite, verifierEnvironnement } from './middleware/securite'
import { startScheduler } from './jobs/scheduler'

// Rôle du processus (montée en charge) :
//  - 'all' (défaut) : API + workers dans un seul service, comme avant ;
//  - 'api' : HTTP seulement ;  - 'workers' : jobs seulement (scraping, NLP, délais, alertes).
// Avec beaucoup de dossiers : 1 service PROCESS_ROLE=api + N services PROCESS_ROLE=workers.
const ROLE = (process.env.PROCESS_ROLE ?? 'all') as 'all' | 'api' | 'workers'
type Fermable = { close: () => Promise<void> }
const workers: Fermable[] = []
async function demarrerWorkers() {
  if (ROLE === 'api') return
  const modules = await Promise.all([
    import('./jobs/workers/scraperWorker'), import('./jobs/workers/nlpWorker'),
    import('./jobs/workers/alertWorker'), import('./jobs/workers/searchWorker'),
  ])
  for (const m of modules) for (const w of Object.values(m)) if (w && typeof (w as Fermable).close === 'function') workers.push(w as Fermable)
  await startScheduler() // idempotent (upsertJobScheduler) : plusieurs processus workers ne créent pas de doublons
  logger.info(`Workers démarrés (${workers.length}, rôle ${ROLE})`)
}

verifierEnvironnement()

// Dernier filet : une erreur oubliée ne doit jamais arrêter le serveur ni les workers des délais
process.on('unhandledRejection', (e) => logger.error('Promesse rejetée non gérée:', e))
process.on('uncaughtException', (e) => {
  // État incertain : on journalise puis on laisse Railway/Docker redémarrer proprement le processus
  logger.error('Exception non gérée, redémarrage:', e)
  process.exit(1)
})

const app = express()
const PORT = process.env.PORT || 3001
const PROD = process.env.NODE_ENV === 'production'

app.disable('x-powered-by')
// Nombre de proxys devant l'API (Railway + Next = 2) : sans ça, req.ip est l'IP du proxy, partagée par tous
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1))
app.use(entetesSecurite)
// 2 Mo : un acte long de l'éditeur dépassait la limite par défaut (100 Ko) à l'enregistrement
app.use(express.json({
  limit: '2mb',
  // corps brut gardé seulement pour les webhooks (vérification de signature)
  verify: (req, _res, buf) => { if (req.url?.startsWith('/api/v1/webhooks')) (req as express.Request & { rawBody?: Buffer }).rawBody = buf },
}))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.WEB_URL || (PROD ? 'null' : '*'))
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'malafipro-api', timestamp: new Date().toISOString() })
})

// Log toutes les requêtes vers Express (diagnostic)
app.use((req, _res, next) => {
  logger.debug(`→ ${req.method} ${req.path}`)
  next()
})

if (ROLE !== 'workers') app.use('/api/v1', routes)

app.use((req, res, _next) => {
  res.status(404).json({ error: 'Route non trouvée' })
})

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') { res.status(413).json({ error: 'Contenu trop volumineux' }); return }
  if (err?.type === 'entity.parse.failed') { res.status(400).json({ error: 'JSON invalide' }); return }
  logger.error('Erreur non gérée:', err)
  // Pas de détail technique vers le navigateur en production
  res.status(500).json({ error: 'Erreur interne du serveur', ...(PROD ? {} : { message: err?.message }) })
})

const serveur = app.listen(PORT, async () => {
  logger.info(`MalafiPro démarré sur le port ${PORT} (rôle ${ROLE})`)
  try {
    await demarrerWorkers()
  } catch (err) {
    logger.error('Erreur démarrage workers/scheduler:', err)
  }
})

// Arrêt propre (redéploiement Railway) : on termine les requêtes puis on libère les connexions
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    logger.info(`${signal} reçu, arrêt`)
    // Les jobs en cours se terminent (ou reviennent en file) avant de couper la base
    serveur.close(() => {
      Promise.allSettled(workers.map((w) => w.close()))
        .then(() => prisma.$disconnect())
        .finally(() => process.exit(0))
    })
    setTimeout(() => process.exit(0), 25_000).unref()
  })
}

export default app