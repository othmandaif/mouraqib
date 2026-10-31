import { randomBytes } from 'crypto'
import { redisConnection } from '../jobs/queues'

// Libère le verrou seulement s'il nous appartient encore (il a pu expirer et être repris)
const LIBERER = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`

/**
 * Exécute `fn` si personne d'autre (autre processus, autre job) ne tient le verrou `cle`.
 * Renvoie `null` sans rien faire si le verrou est déjà pris. `dureeSec` = sécurité si le
 * processus meurt en cours (le verrou disparaît tout seul).
 */
export async function avecVerrou<T>(cle: string, dureeSec: number, fn: () => Promise<T>): Promise<T | null> {
  const jeton = randomBytes(12).toString('hex')
  const pris = await redisConnection.set(`verrou:${cle}`, jeton, 'EX', dureeSec, 'NX')
  if (!pris) return null
  try {
    return await fn()
  } finally {
    await redisConnection.eval(LIBERER, 1, `verrou:${cle}`, jeton).catch(() => {})
  }
}
