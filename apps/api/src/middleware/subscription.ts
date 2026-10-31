import { Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma'
import { AuthRequest } from './auth'
import { abonnementDe } from '../services/abonnements/rappelsAbonnement'
import { etatAbonnement } from '../services/abonnements/offres'


/**
 * Ajout d'un dossier : refusé seulement si l'abonnement est expiré depuis plus de 15 jours
 * ou si la limite de l'offre est atteinte. Les dossiers déjà suivis continuent d'être surveillés
 * et alertés dans tous les cas : un délai ne doit jamais être manqué pour une question de facture.
 */
export async function verifierAjoutDossier(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // Le compte admin gère les avocats et les abonnements : il ne suit pas de dossiers
  if (req.userRole === 'ADMIN') { res.status(403).json({ error: 'Réservé aux avocats' }); return }
  const a = await abonnementDe(req.userId!)
  if (a && etatAbonnement(a).etat === 'EXPIRE') {
    res.status(403).json({ error: 'Abonnement expiré' })
    return
  }
  const max = a?.maxDossiers ?? -1
  if (max >= 0 && (await prisma.dossier.count({ where: { userId: { in: req.equipe! }, estActif: true } })) >= max) {
    res.status(403).json({ error: 'Limite de dossiers atteinte' })
    return
  }
  next()
}
