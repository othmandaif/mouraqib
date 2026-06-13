import express from 'express'
import { logger } from './utils/logger'

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS basique — affiner selon les domaines de production
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

app.listen(PORT, () => {
  logger.info(`Mouraqib API démarrée sur le port ${PORT}`)
})

export default app
