import { Router, Request, Response } from 'express'
import { logger } from '../utils/logger'

const router = Router()

// GET — vérification du webhook Meta (challenge)
router.get('/whatsapp', (req: Request, res: Response): void => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook vérifié')
    res.status(200).send(challenge)
    return
  }

  res.sendStatus(403)
})

// POST — messages entrants (accusé de réception uniquement pour l'instant)
router.post('/whatsapp', (req: Request, res: Response): void => {
  const body = req.body

  if (body.object === 'whatsapp_business_account') {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const messages = change.value?.messages ?? []
        for (const msg of messages) {
          logger.debug(`WhatsApp entrant de ${msg.from}: ${msg.text?.body ?? '[media]'}`)
          // Futur: traiter les commandes (STOP, AIDE, etc.)
        }
      }
    }
    res.sendStatus(200)
    return
  }

  res.sendStatus(404)
})

export default router
