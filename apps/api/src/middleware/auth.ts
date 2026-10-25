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
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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
      select: { id: true, userId: true, expiresAt: true, user: { select: { role: true, statut: true, doitChangerMdp: true, cabinetId: true } } },
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
    // Membres actifs du cabinet : un membre désactivé garde ses dossiers visibles pour l'équipe
    req.equipe = session.user.cabinetId
      ? (await prisma.user.findMany({ where: { cabinetId: session.user.cabinetId }, select: { id: true } })).map((u) => u.id)
      : [payload.userId]
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide' })
  }
}

/** Actions qui retirent un dossier du suivi (suppression, archivage) : interdites au compte « كاتب ». */
export function sansSecretaire(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole === 'SECRETAIRE') { res.status(403).json({ error: "Réservé à l'avocat" }); return }
  next()
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: 'Accès refusé' })
      return
    }
    next()
  }
}
