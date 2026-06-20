import { PrismaClient, CanalAlerte, TypeAlerte, StatutAlerte } from '@prisma/client'
import { WhatsAppService } from '../whatsapp/whatsappService'
import { redigerMessageEvenement, estAudience } from '../ai/audienceMessage'
import { logger } from '../../utils/logger'

const prisma = new PrismaClient()
const whatsapp = new WhatsAppService()

const MAX_TENTATIVES = 3

export class AlertService {
  async envoyerAlertesEnAttente(): Promise<void> {
    const alertes = await prisma.alerte.findMany({
      where: {
        statut: { in: [StatutAlerte.EN_ATTENTE, StatutAlerte.ECHEC] },
        tentatives: { lt: MAX_TENTATIVES },
      },
      include: {
        user: { select: { whatsappNumero: true, telephone: true, nom: true, prenom: true } },
        dossier: { select: { numeroDossier: true, tribunal: true, titreAffaire: true } },
        echeance: { select: { description: true, dateLimite: true, typeDelai: true } },
        evenement: { select: { typeEvenement: true, texteArabe: true, dateAudience: true } },
      },
      take: 50,
    })

    logger.info(`${alertes.length} alertes à envoyer`)

    for (const alerte of alertes) {
      const telephone = alerte.user.whatsappNumero ?? alerte.user.telephone
      if (!telephone) {
        await this.marquerEchec(alerte.id, 'Pas de numéro WhatsApp')
        continue
      }

      try {
        let ok = false

        if (alerte.canal === CanalAlerte.WHATSAPP) {
          // 1) PRIORITÉ : un message IA pré-rédigé (messageAr) → on l'envoie tel quel.
          if (alerte.messageAr) {
            ok = await whatsapp.envoyerTexte(telephone, alerte.messageAr)
          }
          // 2) Sinon, pour un nouvel événement : on tente de rédiger via IA à la volée,
          //    avec repli sur le template existant.
          else if (alerte.typeAlerte === TypeAlerte.NOUVEL_EVENEMENT && alerte.evenement && alerte.dossier) {
            const messageAr = await redigerMessageEvenement({
              numeroDossier: alerte.dossier.numeroDossier,
              tribunal: alerte.dossier.tribunal,
              texteArabe: alerte.evenement.texteArabe,
              dateAudience: alerte.evenement.dateAudience,
              titreAffaire: alerte.dossier.titreAffaire,
              typeEvenement: alerte.evenement.typeEvenement ?? undefined,
            })
            if (messageAr) {
              ok = await whatsapp.envoyerTexte(telephone, messageAr)
              // mémoriser le message IA produit
              await prisma.alerte.update({ where: { id: alerte.id }, data: { messageAr } }).catch(() => {})
            } else {
              ok = await whatsapp.envoyerAlerteEvenement({
                telephone,
                numeroDossier: alerte.dossier.numeroDossier,
                tribunal: alerte.dossier.tribunal,
                texteEvenement: alerte.evenement.texteArabe,
                typeEvenement: alerte.evenement.typeEvenement ?? 'AUTRE',
                dateLimite: alerte.echeance?.dateLimite ?? undefined,
              })
            }
          }
          // 3) Délai critique : template dédié (inchangé).
          else if (alerte.typeAlerte === TypeAlerte.DELAI_CRITIQUE && alerte.echeance && alerte.dossier) {
            const joursRestants = Math.ceil(
              (alerte.echeance.dateLimite.getTime() - Date.now()) / 86_400_000
            )
            ok = await whatsapp.envoyerAlerteDelai({
              telephone,
              numeroDossier: alerte.dossier.numeroDossier,
              description: alerte.echeance.description,
              joursRestants,
              dateLimite: alerte.echeance.dateLimite,
            })
          }
        }

        if (ok) {
          await prisma.alerte.update({
            where: { id: alerte.id },
            data: { statut: StatutAlerte.ENVOYEE, envoyeAt: new Date(), tentatives: { increment: 1 } },
          })
        } else {
          await this.marquerEchec(alerte.id, 'Envoi retourné false')
        }
      } catch (error: any) {
        logger.error(`Erreur envoi alerte ${alerte.id}:`, error)
        await this.marquerEchec(alerte.id, error.message)
      }
    }
  }

  async traiterNouveauxEvenements(): Promise<void> {
    const evenements = await prisma.evenement.findMany({
      where: { estNouvel: true, estTraite: true },
      include: {
        dossier: { include: { user: true } },
      },
    })

    logger.info(`${evenements.length} nouveaux événements à notifier`)

    for (const ev of evenements) {
      const user = ev.dossier.user
      if (!user.whatsappNumero || !user.whatsappVerifie) {
        await prisma.evenement.update({ where: { id: ev.id }, data: { estNouvel: false } })
        continue
      }

      // L'IA rédige le message pour TOUT changement de dossier (audience ou autre).
      const messageAr = await redigerMessageEvenement({
        numeroDossier: ev.dossier.numeroDossier,
        tribunal: ev.dossier.tribunal,
        texteArabe: ev.texteArabe,
        dateAudience: ev.dateAudience,
        titreAffaire: ev.dossier.titreAffaire,
        typeEvenement: ev.typeEvenement ?? undefined,
      })

      // Envoi : message IA en priorité, sinon template existant.
      let ok = false
      if (messageAr) {
        ok = await whatsapp.envoyerTexte(user.whatsappNumero, messageAr)
      } else {
        ok = await whatsapp.envoyerAlerteEvenement({
          telephone: user.whatsappNumero,
          numeroDossier: ev.dossier.numeroDossier,
          tribunal: ev.dossier.tribunal,
          texteEvenement: ev.texteArabe,
          typeEvenement: ev.typeEvenement ?? 'AUTRE',
        })
      }

      await prisma.alerte.create({
        data: {
          userId: user.id,
          dossierId: ev.dossierId,
          evenementId: ev.id,
          canal: CanalAlerte.WHATSAPP,
          typeAlerte: TypeAlerte.NOUVEL_EVENEMENT,
          message: ev.texteArabe.substring(0, 200),
          messageAr: messageAr ?? undefined,
          statut: ok ? StatutAlerte.ENVOYEE : StatutAlerte.ECHEC,
          envoyeAt: ok ? new Date() : undefined,
        },
      })

      await prisma.evenement.update({ where: { id: ev.id }, data: { estNouvel: false } })
    }
  }

  async creerAlerteEvenement(dossierId: string, evenementId: string, userId: string): Promise<void> {
    await prisma.alerte.create({
      data: {
        userId,
        dossierId,
        evenementId,
        canal: CanalAlerte.WHATSAPP,
        typeAlerte: TypeAlerte.NOUVEL_EVENEMENT,
        message: '',
        statut: StatutAlerte.EN_ATTENTE,
      },
    })
  }

  async creerAlerteDelai(dossierId: string, echeanceId: string, userId: string): Promise<void> {
    const existing = await prisma.alerte.findFirst({
      where: { echeanceId, typeAlerte: TypeAlerte.DELAI_CRITIQUE, statut: StatutAlerte.ENVOYEE },
    })
    if (existing) return

    await prisma.alerte.create({
      data: {
        userId,
        dossierId,
        echeanceId,
        canal: CanalAlerte.WHATSAPP,
        typeAlerte: TypeAlerte.DELAI_CRITIQUE,
        message: '',
        statut: StatutAlerte.EN_ATTENTE,
      },
    })
  }

  async genererAlertesDelaisCritiques(): Promise<void> {
    const echeances = await prisma.echeance.findMany({
      where: { estCritique: true, estComplete: false, estExpire: false },
      include: { dossier: { select: { userId: true } } },
    })

    for (const e of echeances) {
      await this.creerAlerteDelai(e.dossierId, e.id, e.dossier.userId)
    }
  }

  async envoyerDigestQuotidien(): Promise<void> {
    const users = await prisma.user.findMany({
      where: { whatsappVerifie: true, whatsappNumero: { not: null } },
      include: {
        abonnements: { where: { statut: 'ACTIF' }, take: 1 },
      },
    })

    const hier = new Date(Date.now() - 86_400_000)

    for (const user of users) {
      if (user.abonnements.length === 0) continue

      const telephone = user.whatsappNumero!

      const [dossiersBouges, echeancesCritiques, renvois] = await Promise.all([
        prisma.dossier.count({
          where: { userId: user.id, evenements: { some: { createdAt: { gte: hier } } } },
        }),
        prisma.echeance.findMany({
          where: { dossier: { userId: user.id }, estCritique: true, estComplete: false, estExpire: false },
          select: {
            dossier: { select: { numeroDossier: true } },
            description: true,
            dateLimite: true,
          },
          orderBy: { dateLimite: 'asc' },
          take: 10,
        }),
        prisma.evenement.findMany({
          where: {
            dossier: { userId: user.id },
            typeEvenement: { in: ['RENVOI_SIMPLE', 'RENVOI_EXPERT', 'RENVOI_NOTIFICATION'] as any },
            createdAt: { gte: hier },
          },
          select: {
            dossier: { select: { numeroDossier: true, tribunal: true } },
          },
        }),
      ])

      await whatsapp.envoyerDigestQuotidien({
        telephone,
        nomAvocat: user.nom,
        nbDossiersBouges: dossiersBouges,
        echeancesCritiques: echeancesCritiques.map((e) => ({
          numeroDossier: e.dossier.numeroDossier,
          description: e.description,
          joursRestants: Math.ceil((e.dateLimite.getTime() - Date.now()) / 86_400_000),
        })),
        renvoisDetectes: renvois.map((r) => ({
          numeroDossier: r.dossier.numeroDossier,
          tribunal: r.dossier.tribunal,
        })),
      })
    }
  }

  private async marquerEchec(alerteId: string, raison: string): Promise<void> {
    const alerte = await prisma.alerte.findUnique({ where: { id: alerteId } })
    if (!alerte) return

    const newTentatives = alerte.tentatives + 1
    await prisma.alerte.update({
      where: { id: alerteId },
      data: {
        statut: newTentatives >= MAX_TENTATIVES ? StatutAlerte.ECHEC : StatutAlerte.EN_ATTENTE,
        tentatives: newTentatives,
        message: raison,
      },
    })
  }
}