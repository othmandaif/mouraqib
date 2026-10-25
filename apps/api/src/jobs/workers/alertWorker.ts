import { Worker } from 'bullmq'
import { prisma } from '../../utils/prisma'
import { redisConnection } from '../queues'
import { AlertService } from '../../services/alerts/alertService'
import { DeadlineService } from '../../services/deadlines/deadlineService'
import { corrigerHeuresAudience } from '../../services/maintenance'
import { logger } from '../../utils/logger'
import { avecVerrou } from '../../utils/verrou'
import { battement, controleSecurite } from '../../services/deadlines/controleSecurite'
import { alerterFinsAbonnement } from '../../services/abonnements/rappelsAbonnement'

const alertService = new AlertService()
const deadlineService = new DeadlineService()

/** Comptes dont la suppression a été demandée il y a plus de 30 jours (Paramètres › حذف الحساب). */
async function purgerComptesSupprimes(): Promise<void> {
  const limite = new Date(Date.now() - 30 * 86_400_000)
  const users = await prisma.user.findMany({ where: { suppressionDemandeeAt: { lt: limite } }, select: { id: true, cabinetId: true } })
  for (const { id, cabinetId } of users) {
    // CRM et facturation d'un avocat seul (dans un cabinet, ils restent au cabinet)
    const crm = cabinetId ? [] : [
      prisma.reglement.deleteMany({ where: { userId: id, cabinetId: null } }),
      prisma.facture.deleteMany({ where: { espace: id, factureOrigineId: { not: null } } }), // avoirs d'abord (référence)
      prisma.facture.deleteMany({ where: { espace: id } }),
      prisma.client.deleteMany({ where: { userId: id, cabinetId: null } }), // journal : cascade
      prisma.profilFacturation.deleteMany({ where: { espace: id } }),
      prisma.sequenceFacture.deleteMany({ where: { espace: id } }),
    ]
    await prisma.$transaction([
      ...crm,
      prisma.alerte.deleteMany({ where: { OR: [{ userId: id }, { dossier: { userId: id } }] } }),
      prisma.paiement.deleteMany({ where: { abonnement: { userId: id } } }),
      prisma.abonnement.deleteMany({ where: { userId: id } }),
      prisma.dossier.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ])
    logger.info(`Compte supprimé définitivement (${id})`)
  }
}

export const alertWorker = new Worker(
  'alerts',
  async (job) => {
    // Un seul envoi à la fois, même avec plusieurs processus workers (sinon messages en double)
    if (job.name === 'send-pending') {
      await avecVerrou('envoi-whatsapp', 300, () => alertService.envoyerAlertesEnAttente())
    } else if (job.name === 'digest-quotidien') {
      await avecVerrou('digest', 900, () => alertService.envoyerDigestQuotidien())
    }
    await battement('alerts')
  },
  { connection: redisConnection, concurrency: 1 }
)

export const deadlineWorker = new Worker(
  'deadlines',
  async () => {
    // Un seul calcul à la fois, tous processus confondus : sinon délais et rappels en double
    const fait = await avecVerrou('delais', 1800, async () => {
      await corrigerHeuresAudience()
      await deadlineService.normaliserLimites()
      const nouvelles = await deadlineService.genererEcheances()
      await deadlineService.mettreAJourStatuts()
      await alertService.alerterNouveauxDelais(nouvelles)
      await alertService.genererAlertesDelaisCritiques()
      // Alertes « صدر حكم » / « جلسة جديدة » : n'étaient jamais créées (job jamais lancé)
      await alertService.traiterNouveauxEvenements()
      await battement('deadlines')
      await controleSecurite().catch((e) => logger.error('Contrôle de sécurité échoué:', e))
      await alerterFinsAbonnement().catch((e) => logger.error('Rappels abonnement:', e))
      await purgerComptesSupprimes().catch((e) => logger.error('Purge comptes:', e))
      await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {})
      return true
    })
    if (!fait) logger.info('Calcul des délais déjà en cours ailleurs : passage ignoré')
  },
  { connection: redisConnection, concurrency: 1 }
)

alertWorker.on('failed', (job, err) => {
  logger.error(`Alert job ${job?.id} failed:`, err)
})

deadlineWorker.on('failed', (job, err) => {
  logger.error(`Deadline job ${job?.id} failed:`, err)
})
