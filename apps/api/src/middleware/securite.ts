import { Request, Response, NextFunction } from 'express'
import { redisConnection } from '../jobs/queues'
import { logger } from '../utils/logger'
import type { AuthRequest } from './auth'

const PROD = process.env.NODE_ENV === 'production'

/** En-têtes de sécurité (équivalent minimal de helmet, sans dépendance). */
export function entetesSecurite(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
  if (PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  next()
}

/**
 * Limite de débit par utilisateur connecté (sinon par la clé `cle`, sinon par IP), stockée dans Redis.
 * Routes publiques : derrière le proxy Next/Railway, plusieurs cabinets peuvent partager la même IP vue
 * par l'API ; on limite donc d'abord par e-mail / ticket / jeton pour ne pas bloquer tout le monde.
 * Si Redis ne répond pas, la requête passe : on ne bloque pas les avocats pour une panne de cache.
 */
export function limiter(nom: string, max: number, fenetreSec: number, cle?: (req: Request) => unknown) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const perso = cle?.(req)
    const qui = req.userId ?? (typeof perso === 'string' && perso ? perso.trim().toLowerCase().slice(0, 200) : undefined) ?? req.ip ?? 'inconnu'
    const k = `rl:${nom}:${qui}`
    try {
      const n = await redisConnection.incr(k)
      if (n === 1) await redisConnection.expire(k, fenetreSec)
      if (n > max) {
        const ttl = await redisConnection.ttl(k)
        res.setHeader('Retry-After', String(Math.max(ttl, 1)))
        res.status(429).json({ error: 'Trop de requêtes, réessayez dans quelques minutes' })
        return
      }
    } catch (err) {
      logger.warn(`Limiteur ${nom} indisponible:`, err)
    }
    next()
  }
}

/** Refuse de démarrer en production avec des secrets absents ou trop faibles. */
export function verifierEnvironnement(): void {
  const problemes: string[] = []
  const jwt = process.env.JWT_SECRET ?? ''
  if (jwt.length < 32) problemes.push('JWT_SECRET absent ou trop court (32 caractères minimum)')
  const cle = process.env.CREDENTIALS_ENCRYPTION_KEY ?? ''
  if (!/^[0-9a-fA-F]{64}$/.test(cle)) problemes.push('CREDENTIALS_ENCRYPTION_KEY doit faire 32 octets en hexadécimal (64 caractères)')
  if (PROD && !process.env.WEB_URL) problemes.push('WEB_URL requis en production (CORS)')
  if (!problemes.length) return
  if (PROD) throw new Error(`Configuration non sûre : ${problemes.join(' ; ')}`)
  problemes.forEach((p) => logger.warn(`⚠️ ${p}`))
}
