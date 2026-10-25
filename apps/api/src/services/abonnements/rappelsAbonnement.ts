import { CanalAlerte, StatutAlerte, TypeAlerte } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { etatAbonnement } from './offres'

/**
 * Fin de période offerte ou payée dans 7 jours (ou dépassée) : une alerte dans l'app pour l'avocat,
 * une fois par compte et par fin. Le commercial voit ces comptes dans /admin/comptes (« للمتابعة »).
 */
export async function alerterFinsAbonnement(): Promise<number> {
  const abonnements = await prisma.abonnement.findMany({
    where: { statut: 'ACTIF', userId: { not: null } },
    select: { userId: true, essaiJusquAu: true, payeJusquAu: true, dateFin: true, user: { select: { prenom: true, nom: true, telephone: true } } },
  })
  let n = 0
  for (const a of abonnements) {
    const { etat, fin, joursRestants } = etatAbonnement(a)
    if (!fin || (etat !== 'A_RENOUVELER' && etat !== 'GRACE')) continue
    const cle = `abonnement:fin:${fin.toISOString().slice(0, 10)}`
    if (await prisma.alerte.findFirst({ where: { userId: a.userId!, message: cle } })) continue
    const texte = joursRestants! >= 0
      ? `تنتهي فترة اشتراككم بعد ${joursRestants} أيام. تواصلوا معنا للتجديد، ولن تتوقف التنبيهات.`
      : 'انتهت فترة اشتراككم. التنبيهات مستمرة مؤقتاً، تواصلوا معنا للتجديد.'
    await prisma.alerte.create({
      data: { userId: a.userId!, canal: CanalAlerte.IN_APP, typeAlerte: TypeAlerte.ABONNEMENT, message: cle, messageAr: texte, statut: StatutAlerte.ENVOYEE, envoyeAt: new Date() },
    })
    n++
  }
  return n
}

/** Abonnement de l'utilisateur, ou celui de son cabinet pour un membre invité. */
export async function abonnementDe(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { cabinetId: true } })
  return prisma.abonnement.findFirst({
    where: { statut: 'ACTIF', OR: [{ userId }, ...(u?.cabinetId ? [{ cabinetId: u.cabinetId }, { user: { cabinetId: u.cabinetId } }] : [])] },
    orderBy: { dateDebut: 'desc' },
  })
}
