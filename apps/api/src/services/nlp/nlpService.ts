import { prisma } from '../../utils/prisma'
import { classifyWithRules } from './arabicRulesClassifier'
import { classifyWithLLM } from './llmClassifier'
import { logger } from '../../utils/logger'


const CONFIDENCE_THRESHOLD = 0.75
const BATCH_SIZE = 100

export class NLPService {
  /**
   * Classe tous les événements en attente, par lots, dans la limite d'un budget de temps
   * (avant : 100 toutes les 30 min, soit 200/h, très insuffisant avec beaucoup de dossiers).
   * Renvoie le nombre d'événements classés.
   */
  async traiterEvenementsEnAttente(budgetMs = 4 * 60_000): Promise<number> {
    const debut = Date.now()
    let total = 0
    while (Date.now() - debut < budgetMs) {
      const { lus, classes } = await this.traiterLot()
      total += classes
      if (lus < BATCH_SIZE || classes === 0) break // fini, ou plus de progrès (erreurs répétées)
    }
    return total
  }

  private async traiterLot(): Promise<{ lus: number; classes: number }> {
    const evenements = await prisma.evenement.findMany({
      where: { estTraite: false, typeEvenement: null },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    })

    if (evenements.length) logger.info(`${evenements.length} événements à classifier`)

    let classes = 0
    for (const ev of evenements) {
      try {
        let result = classifyWithRules(ev.texteArabe)

        if (!result || result.confiance < CONFIDENCE_THRESHOLD) {
          logger.debug(`LLM fallback pour l'événement ${ev.id}`) // pas le texte : il peut contenir des noms
          const llm = await classifyWithLLM(ev.texteArabe)
          // LLM indisponible : on garde la règle trouvée (même peu sûre) plutôt qu'un « AUTRE » sans délai
          result = llm.methode === 'FALLBACK' && result ? result : llm
        }

        await prisma.evenement.update({
          where: { id: ev.id },
          data: {
            typeEvenement: result.typeEvenement,
            // À relire par l'avocat : aucune règle ni IA n'a su classer ce texte (voir le contrôle de sécurité)
            sousType: result.methode === 'FALLBACK' ? 'A_VERIFIER' : result.sousType,
            confiance: result.confiance,
            estTraite: true,
          },
        })
        classes++
      } catch (error) {
        logger.error(`Erreur classification événement ${ev.id}:`, error)
      }
    }
    return { lus: evenements.length, classes }
  }

  async getStats() {
    return prisma.evenement.groupBy({
      by: ['typeEvenement'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    })
  }
}
