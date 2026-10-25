import { prisma } from '../../utils/prisma'
import { askDeepseek, limiterTexte } from '../ai/deepseek'
import { getTypeActe, TYPES_PAR_CLE } from './typesActes'
import { logger } from '../../utils/logger'


/** Extrait le texte brut d'un fichier .docx (buffer) via mammoth. */
export async function extraireTexteDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await (mammoth as any).extractRawText({ buffer })
  return (result?.value || '').trim()
}

interface AnalyseStyle {
  styleResume: string
  typeActeDevine: string | null
  titreDevine: string | null
}

/** Analyse le style d'un contrat importé (ton, structure, formules). */
export async function analyserStyle(texte: string): Promise<AnalyseStyle> {
  const clesTypes = Object.keys(TYPES_PAR_CLE)
  const prompt = `حلّل النموذج القانوني التالي الذي رفعه محامٍ. أرجِع JSON فقط:
{
  "styleResume": "وصف موجز لأسلوب المحامي: النبرة، الصيغ المعتادة، طريقة الهيكلة، العبارات الافتتاحية والختامية المميزة (3-5 أسطر)",
  "typeActeDevine": "نوع العقد إن أمكن تحديده من القائمة وإلا null",
  "titreDevine": "عنوان مناسب للنموذج بالعربية"
}
أنواع العقود المتاحة: ${clesTypes.join(', ')}

النموذج:
${limiterTexte([texte], 6000)}`

  try {
    const res = await askDeepseek<AnalyseStyle>('أنت مساعد يحلّل أسلوب تحرير الوثائق القانونية.', prompt, {
      json: true, temperature: 0.3, maxTokens: 600,
    })
    return {
      styleResume: res?.styleResume || '',
      typeActeDevine: res?.typeActeDevine && getTypeActe(res.typeActeDevine) ? res.typeActeDevine : null,
      titreDevine: res?.titreDevine || null,
    }
  } catch (err) {
    logger.warn('Analyse de style échouée:', err)
    return { styleResume: '', typeActeDevine: null, titreDevine: null }
  }
}

interface ImporterParams {
  userId: string
  cabinetId?: string | null
  texte: string
  typeActe?: string         // si l'avocat précise le type ; sinon on devine
  titre?: string
  langue?: 'AR' | 'FR'
}

/** Importe un modèle : analyse le style et l'enregistre dans ModeleDocument. */
export async function importerModele(params: ImporterParams) {
  const analyse = await analyserStyle(params.texte)
  const typeActe = params.typeActe || analyse.typeActeDevine || 'LIBRE'
  const type = getTypeActe(typeActe)
  const titre = params.titre || analyse.titreDevine || type?.titreAr || 'نموذج مستورد'

  const modele = await prisma.modeleDocument.create({
    data: {
      userId: params.userId,
      cabinetId: params.cabinetId ?? null,
      typeActe,
      categorie: (type?.categorie ?? 'AUTRE') as any,
      titre,
      langue: (params.langue ?? 'AR') as any,
      contenu: params.texte,
      styleResume: analyse.styleResume || null,
      importeParAvocat: true,
      estActif: true,
    },
  })
  return modele
}

/**
 * Cherche le meilleur modèle importé par l'avocat pour un type d'acte donné.
 * Retourne null si l'avocat n'a importé aucun modèle de ce type
 * → dans ce cas le générateur fonctionne comme avant (aucun changement).
 */
export async function trouverModeleStyle(userId: string, typeActe: string) {
  return prisma.modeleDocument.findFirst({
    where: { userId, importeParAvocat: true, estActif: true, typeActe },
    orderBy: { updatedAt: 'desc' },
  })
}