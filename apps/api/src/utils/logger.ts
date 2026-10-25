import winston from 'winston'
import { createHash } from 'crypto'

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
            return `${timestamp} [${level}] ${message}${extras}`
          })
        )
  ),
  transports: [new winston.transports.Console()],
})

/** Empreinte courte et stable d'un numéro de dossier, pour corréler les logs sans l'écrire en clair. */
export function refDossier(numero: string): string {
  return 'dos#' + createHash('sha256').update(numero).digest('hex').slice(0, 8)
}
