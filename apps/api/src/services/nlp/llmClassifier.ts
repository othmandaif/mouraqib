import OpenAI from 'openai'
import { TypeEvenement } from '@prisma/client'
import { ClassificationResult } from './arabicRulesClassifier'
import { logger } from '../../utils/logger'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Tu es un expert en procédure judiciaire marocaine.
Classifie les mentions de greffe en arabe marocain judiciaire.

Types disponibles:
RENVOI_SIMPLE, RENVOI_EXPERT, RENVOI_NOTIFICATION,
JUGEMENT_RENDU, MISE_EN_DELIBERE, ORDONNANCE_RENDUE,
NOTIFICATION_PARTIE, SIGNIFICATION,
INSCRIPTION_ROLE, MISE_EN_ETAT,
EXPERTISE_ORDONNEE, EXPERTISE_DEPOSEE,
APPEL_INTERJET, POURVOI_CASSATION,
RADIATION, PEREMPTION, DESISTEMENT, AUTRE

Réponds UNIQUEMENT en JSON: {"type":"TYPE","confiance":0.0-1.0}`

const VALID_TYPES = new Set(Object.values(TypeEvenement))

export async function classifyWithLLM(texteArabe: string): Promise<ClassificationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Classifie: "${texteArabe}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 80,
    })

    const result = JSON.parse(response.choices[0].message.content!)
    const type = result.type as TypeEvenement

    if (!VALID_TYPES.has(type)) {
      return { typeEvenement: TypeEvenement.AUTRE, confiance: 0.5, methode: 'LLM' }
    }

    return { typeEvenement: type, confiance: result.confiance ?? 0.7, methode: 'LLM' }
  } catch (error) {
    logger.error('Erreur LLM classification:', error)
    return { typeEvenement: TypeEvenement.AUTRE, confiance: 0.3, methode: 'FALLBACK' }
  }
}
