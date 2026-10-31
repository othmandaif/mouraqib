import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../utils/prisma'


export interface AuthRequest extends Request {
  userId?: string
  userRole?: string
  sessionId?: string
  /** Cabinet du compte (null = avocat seul). */
  cabinetId?: string | null
  /**
   * Comptes dont on partage les dossiers, délais et agenda : tout le cabinet, sinon soi-même.
   * À utiliser comme `userId: { in: req.equipe }` dans toute requête sur les dossiers.
   */
  equipe?: string[]
  /** Droits retirés par le responsable du cabinet (voir DROITS). */
  droitsRetires?: string[]
}

/** Droits qu'un responsable de cabinet peut retirer à un membre. */
export const DROITS = ['SUPPRESSION_DOSSIERS', 'CRM', 'FACTURATION', 'IA'] as const
export type Droit = (typeof DROITS)[number]

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (req.userId) { next(); return } // déjà authentifié par le routeur parent (contrôle des droits) : pas de 2e lecture
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token manquant' })
    return
  }

  const token = header.slice(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; sessionId: string }

    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      select: { id: true, userId: true, expiresAt: true, user: { select: { role: true, statut: true, doitChangerMdp: true, cabinetId: true, droitsRetires: true } } },
    })

    if (!session || session.expiresAt < new Date() || session.userId !== payload.userId) {
      res.status(401).json({ error: 'Session invalide ou expirée' })
      return
    }

    // Compte désactivé par le commercial : accès coupé immédiatement, même avec une session encore valide
    if (session.user.statut !== 'ACTIF') {
      res.status(403).json({ error: 'Compte désactivé' })
      return
    }

    // Mot de passe provisoire : seules la lecture du compte, le changement de mot de passe et la déconnexion passent
    if (session.user.doitChangerMdp && !/^\/api\/v1\/auth\/(me|mot-de-passe|logout)(\?|$)/.test(req.originalUrl)) {
      res.status(403).json({ error: 'Mot de passe provisoire à changer' })
      return
    }

    req.userId = payload.userId
    req.userRole = session.user.role
    req.sessionId = session.id
    req.cabinetId = session.user.cabinetId
    // Le responsable et l'avocat seul ont toujours tous les droits
    req.droitsRetires = session.user.cabinetId && session.user.role !== 'ASSOCIE_GERANT' ? session.user.droitsRetires : []
    // Membres actifs du cabinet : un membre désactivé garde ses dossiers visibles pour l'équipe
    req.equipe = session.user.cabinetId
      ? (await prisma.user.findMany({ where: { cabinetId: session.user.cabinetId }, select: { id: true } })).map((u) => u.id)
      : [payload.userId]
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide' })
  }
}

/** Refuse l'accès si le responsable du cabinet a retiré ce droit au membre. */
export function exigerDroit(droit: Droit) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.droitsRetires?.includes(droit)) { res.status(403).json({ error: 'Droit non accordé par le responsable du cabinet' }); return }
    next()
  }
}

/** Actions qui retirent un dossier du suivi (suppression, archivage) : selon le droit du membre. */
export const sansSecretaire = exigerDroit('SUPPRESSION_DOSSIERS')

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: 'Accès refusé' })
      return
    }
    next()
  }
}
