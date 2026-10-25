import { Router, Request, Response } from 'express'
import { createHmac, timingSafeEqual } from 'crypto'
import { logger } from '../utils/logger'

const router = Router()

// GET — vérification du webhook Meta (challenge)
router.get('/whatsapp', (req: Request, res: Response): void => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  const attendu = process.env.WHATSAPP_VERIFY_TOKEN
  if (mode === 'subscribe' && attendu && token === attendu) {
    logger.info('WhatsApp webhook vérifié')
    res.status(200).type('text/plain').send(String(challenge ?? '')) // texte brut : jamais interprété comme HTML
    return
  }

  res.sendStatus(403)
})

// POST — messages entrants (accusé de réception uniquement pour l'instant)
// Signature Meta (X-Hub-Signature-256) vérifiée quand WHATSAPP_APP_SECRET est défini
function signatureValide(req: Request): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) return true
  const recu = Buffer.from(String(req.headers['x-hub-signature-256'] ?? ''))
  const brut = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from('')
  const attendu = Buffer.from('sha256=' + createHmac('sha256', secret).update(brut).digest('hex'))
  return recu.length === attendu.length && timingSafeEqual(recu, attendu)
}

router.post('/whatsapp', (req: Request, res: Response): void => {
  if (!signatureValide(req)) { res.sendStatus(401); return }
  const body = req.body

  if (body.object === 'whatsapp_business_account') {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const messages = change.value?.messages ?? []
        for (const msg of messages) {
          logger.debug(`WhatsApp entrant (${msg.type ?? 'texte'})`) // ni numéro ni contenu dans les journaux
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
