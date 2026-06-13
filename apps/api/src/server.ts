import express from 'express'
import { logger } from './utils/logger'
import routes from './routes'
import { startScheduler } from './jobs/scheduler'
import './jobs/workers/scraperWorker'
import './jobs/workers/nlpWorker'
import './jobs/workers/alertWorker'

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.WEB_URL || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mouraqib-api', timestamp: new Date().toISOString() })
})

app.use('/api/v1', routes)

app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' })
})

app.listen(PORT, async () => {
  logger.info(`Mouraqib API démarrée sur le port ${PORT}`)
  try {
    await startScheduler()
  } catch (err) {
    logger.error('Erreur démarrage scheduler:', err)
  }
})

export default app
