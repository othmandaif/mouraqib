import { createHash } from 'crypto'
import { redisConnection } from '../../jobs/queues'
import { logger } from '../../utils/logger'

/**
 * État partagé (Redis, tous processus confondus) de la synchronisation avec mahakim :
 * - attente par dossier après un échec (introuvable ou panne), pour qu'un dossier impossible à lire
 *   ne repasse pas en tête de chaque planification ;
 * - coupe-circuit : après plusieurs échecs techniques d'affilée, mahakim est considéré en panne et le
 *   robot se met en pause au lieu d'user 2 à 3 minutes par dossier en vain.
 */

const H = 3_600_000
const ATTENTE_MIN_MS = 30 * 60_000
const ATTENTE_MAX_MS = 24 * H
const SEUIL_PANNE = Number(process.env.MAHAKIM_SEUIL_PANNE ?? 5)
const PAUSE_PANNE_MS = Number(process.env.MAHAKIM_PAUSE_MIN ?? 10) * 60_000

/** Clé d'un dossier sur mahakim (même numéro + même tribunal = un seul dossier, quel que soit l'avocat). */
export const cleSync = (numeroDossier: string, tribunal: string) =>
  createHash('sha1').update(`${numeroDossier}|${tribunal}`).digest('hex')

/** Attente après le n-ième échec d'affilée : 30 min, 1 h, 2 h… plafonnée à 24 h. */
export const dureeAttente = (n: number) => Math.min(ATTENTE_MIN_MS * 2 ** Math.max(0, n - 1), ATTENTE_MAX_MS)

/** Échec sur un dossier : attente de 30 min, doublée à chaque échec, plafonnée à 24 h. */
export async function noterEchecDossier(cle: string): Promise<void> {
  try {
    const n = await redisConnection.incr(`sync-echecs:${cle}`)
    await redisConnection.expire(`sync-echecs:${cle}`, 7 * 24 * 3600)
    const attente = dureeAttente(n)
    await redisConnection.set(`sync-attente:${cle}`, String(Date.now() + attente), 'PX', attente)
  } catch (e) { logger.warn('noterEchecDossier:', e) }
}

export async function effacerEchecDossier(cle: string): Promise<void> {
  await redisConnection.del(`sync-echecs:${cle}`, `sync-attente:${cle}`).catch(() => {})
}

/** Parmi ces clés, celles dont l'attente après échec n'est pas finie (lecture groupée). */
export async function enAttenteApresEchec(cles: string[]): Promise<Set<string>> {
  const res = new Set<string>()
  for (let i = 0; i < cles.length; i += 1000) {
    const lot = cles.slice(i, i + 1000)
    const v = await redisConnection.mget(...lot.map((c) => `sync-attente:${c}`)).catch(() => [] as (string | null)[])
    v.forEach((x, j) => { if (x) res.add(lot[j]) })
  }
  return res
}

/** mahakim a répondu (dossier lu ou introuvable confirmé) : fin de panne éventuelle. */
export async function mahakimRepond(): Promise<void> {
  const etait = await redisConnection.get('mahakim:panne-depuis').catch(() => null)
  await redisConnection.del('mahakim:echecs-consecutifs', 'mahakim:panne-depuis').catch(() => {})
  if (etait) logger.info(`mahakim répond de nouveau (panne depuis ${new Date(Number(etait)).toISOString()})`)
}

/** Échec technique (page qui ne charge pas, erreur, blocage) : au-delà du seuil, pause de tout le robot. */
export async function mahakimEchec(): Promise<void> {
  try {
    const n = await redisConnection.incr('mahakim:echecs-consecutifs')
    if (n >= SEUIL_PANNE) {
      await redisConnection.set('mahakim:panne-depuis', String(Date.now()), 'NX')
      await redisConnection.set('mahakim:pause', '1', 'PX', PAUSE_PANNE_MS)
      if (n === SEUIL_PANNE) logger.error(`mahakim ne répond plus (${n} échecs d'affilée) : synchronisation en pause ${PAUSE_PANNE_MS / 60_000} min`)
    }
  } catch (e) { logger.warn('mahakimEchec:', e) }
}

/** Temps de pause restant (ms), 0 si le robot peut travailler. */
export async function pauseRestante(): Promise<number> {
  const t = await redisConnection.pttl('mahakim:pause').catch(() => -2)
  return t > 0 ? t : 0
}

export async function etatMahakim(): Promise<{ panneDepuis: string | null; echecsConsecutifs: number; enPause: boolean }> {
  const [depuis, echecs, pause] = await Promise.all([
    redisConnection.get('mahakim:panne-depuis').catch(() => null),
    redisConnection.get('mahakim:echecs-consecutifs').catch(() => null),
    pauseRestante(),
  ])
  return { panneDepuis: depuis ? new Date(Number(depuis)).toISOString() : null, echecsConsecutifs: Number(echecs ?? 0), enPause: pause > 0 }
}
