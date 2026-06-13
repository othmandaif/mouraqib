import { PrismaClient } from '@prisma/client'
import { classifyWithRules } from './arabicRulesClassifier'
import { classifyWithLLM } from './llmClassifier'
import { logger } from '../../utils/logger'

const prisma = new PrismaClient()

const CONFIDENCE_THRESHOLD = 0.75
const BATCH_SIZE = 100

export class NLPService {
  async traiterEvenementsEnAttente(): Promise<void> {
    const evenements = await prisma.evenement.findMany({
      where: { estTraite: false, typeEvenement: null },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    })

    logger.info(`${evenements.length} événements à classifier`)

    for (const ev of evenements) {
      try {
        let result = classifyWithRules(ev.texteArabe)

        if (!result || result.confiance < CONFIDENCE_THRESHOLD) {
          logger.debug(`LLM fallback pour: "${ev.texteArabe.substring(0, 60)}..."`)
          result = await classifyWithLLM(ev.texteArabe)
        }

        await prisma.evenement.update({
          where: { id: ev.id },
          data: {
            typeEvenement: result.typeEvenement,
            sousType: result.sousType,
            confiance: result.confiance,
            estTraite: true,
          },
        })
      } catch (error) {
        logger.error(`Erreur classification événement ${ev.id}:`, error)
      }
    }
  }

  async getStats() {
    return prisma.evenement.groupBy({
      by: ['typeEvenement'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })
  }
}
