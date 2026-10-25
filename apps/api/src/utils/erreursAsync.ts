// Express 4 ne capture pas les promesses rejetées des routes `async` : une simple erreur de base de
// données devenait un « unhandledRejection » qui ARRÊTAIT tout le processus (API + workers des
// délais). On enveloppe chaque handler pour transmettre l'erreur au gestionnaire d'erreurs (500).
// Équivalent du paquet express-async-errors, sans dépendance. À importer avant les routes.
/* eslint-disable @typescript-eslint/no-var-requires */
import type { Request, Response, NextFunction } from 'express'

type Handler = (req: Request, res: Response, next: NextFunction) => unknown

function envelopper(fn: unknown): unknown {
  if (typeof fn !== 'function' || fn.length === 4) return fn // gestionnaires d'erreurs : inchangés
  const h = fn as Handler
  return function (req: Request, res: Response, next: NextFunction) {
    try {
      const r = h(req, res, next) as Promise<unknown> | undefined
      if (r && typeof r.catch === 'function') r.catch(next)
    } catch (e) { next(e) }
  }
}

try {
  const Route = require('express/lib/router/route')
  // `methods` est une dépendance d'express : résolue depuis express (pas forcément hissée)
  const methodes: string[] = [...require(require.resolve('methods', { paths: [require.resolve('express')] })), 'all']
  for (const m of methodes) {
    const original = Route.prototype[m]
    if (typeof original !== 'function') continue
    Route.prototype[m] = function (...handlers: unknown[]) {
      return original.apply(this, handlers.flat(Infinity).map(envelopper))
    }
  }
  const Router = require('express/lib/router')
  const use = Router.use
  Router.use = function (...args: unknown[]) { return use.apply(this, args.flat(Infinity).map(envelopper)) }
} catch {
  // Express 5 gère déjà les promesses : rien à faire
}
