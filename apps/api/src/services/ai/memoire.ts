import { TypeMemoire } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { logger } from '../../utils/logger'
import { askDeepseek } from './deepseek'

/**
 * Mémoire de l'assistant, propre à chaque avocat.
 * - Lue avant chaque réponse et injectée dans le prompt (comment répondre à CET avocat).
 * - Enrichie après un échange quand l'avocat corrige l'assistant, exprime une préférence ou demande de retenir.
 * - Visible et modifiable par l'avocat (Paramètres › ذاكرة المساعد) ; jamais partagée.
 * Pas d'entraînement du modèle : de simples règles courtes en base.
 */

export const MAX_ACTIVES = 40
const MAX_TEXTE = 300

export interface Souvenir { id: string; type: TypeMemoire; texte: string }

/** Souvenirs actifs, corrections d'abord (elles priment), puis les plus récents. Vide si la mémoire est en pause. */
export async function lireMemoire(userId: string): Promise<Souvenir[]> {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { memoireActive: true } })
    if (!u?.memoireActive) return []
    const l = await prisma.memoireAvocat.findMany({
      where: { userId, actif: true },
      select: { id: true, type: true, texte: true },
      orderBy: { updatedAt: 'desc' },
      take: MAX_ACTIVES,
    })
    return [...l.filter((s) => s.type === 'CORRECTION'), ...l.filter((s) => s.type !== 'CORRECTION')]
  } catch (e) {
    logger.warn('Mémoire illisible (migration appliquée ?) :', e) // jamais bloquant pour le chat
    return []
  }
}

/** Bloc ajouté au prompt système. */
export function blocMemoire(s: Souvenir[]): string {
  if (!s.length) return ''
  const ETIQ: Record<TypeMemoire, string> = { CORRECTION: 'تصحيح', PREFERENCE: 'تفضيل', PRATIQUE: 'ممارسة', FORMULE: 'صياغة' }
  return '\n\n=== ذاكرة هذا المحامي (ما تعلّمته من تصحيحاته وتفضيلاته) ===\n' +
    'طبّقها في أسلوب الجواب ومضمونه. التصحيحات أولى من معلوماتك العامة، لكن المصادر القانونية المقدَّمة أولى منها: ' +
    'إن تعارض تصحيح مع نص قانوني مقدَّم، نبّه المحامي إلى التعارض بلطف.\n' +
    s.map((x) => `- [${ETIQ[x.type]}] ${x.texte}`).join('\n')
}

// Signaux qu'un message mérite une extraction (sinon : aucun appel IA, aucun coût)
const SIGNAL = new RegExp([
  // arabe : correction, préférence, consigne durable
  'لا،', 'ليس صحيح', 'غير صحيح', 'خطأ', 'خاطئ', 'غلط', 'صحّح', 'صحح', 'الصواب', 'بل ', 'تذكّر', 'تذكر', 'احفظ',
  'دائماً', 'دائما', 'أبداً', 'ابدا', 'لا تكتب', 'لا تذكر', 'اكتب', 'أفضّل', 'أفضل أن', 'أريد أن تجيب', 'باختصار', 'بالتفصيل',
  // français
  '\\bnon\\b', 'faux', 'erreur', 'inexact', 'incorrect', 'corrige', 'en réalité', 'plutôt', 'retiens', 'souviens', 'rappelle-toi',
  'toujours', 'jamais', 'je préfère', 'ne mets pas', "n'écris pas", 'réponds en', 'plus court', 'plus détaillé',
].join('|'), 'i')

const SYSTEME_EXTRACTION = `Tu gères la mémoire d'un assistant juridique (droit marocain) pour UN avocat.
On te donne : la mémoire actuelle, la réponse précédente de l'assistant et le nouveau message de l'avocat.
Décide s'il faut retenir quelque chose de DURABLE et RÉUTILISABLE pour les prochaines conversations :
- CORRECTION : l'avocat corrige une erreur juridique ou factuelle de l'assistant (règle générale corrigée).
- PREFERENCE : comment il veut qu'on lui réponde (longueur, structure, ton, langue, niveau de détail).
- PRATIQUE : son domaine, ses juridictions habituelles, son type de clientèle.
- FORMULE : une tournure ou une structure de rédaction qu'il veut voir utilisée.
Règles strictes :
- N'invente rien : seulement ce que l'avocat dit ou corrige clairement. Dans le doute, ne retiens rien.
- Rien de propre à un seul dossier. JAMAIS de nom de personne ou de société, numéro de dossier, montant, adresse, téléphone.
- Une phrase courte et autonome par souvenir (max 200 caractères), dans la langue du message de l'avocat.
- Si un souvenir existant dit la même chose ou est contredit, remplace-le (champ "remplace" = son id) au lieu d'en ajouter un.
- Au maximum 2 souvenirs par message.
Réponds en JSON seulement : {"souvenirs": [{"type": "CORRECTION|PREFERENCE|PRATIQUE|FORMULE", "texte": "...", "remplace": "id ou null"}]} — liste vide si rien à retenir.`

// Filet de sécurité après l'IA : données identifiantes → le souvenir est rejeté
const IDENTIFIANT = /(\d+\/\d+\/\d+)|(\d{4}\/\d{4})|(@)|(\+?\d[\d\s.-]{7,}\d)|(\d[\d\s]{3,}\s?(درهم|dh|mad))/i
const TYPES = new Set<string>(Object.values(TypeMemoire))

/**
 * Après un échange : extrait 0 à 2 souvenirs si le message de l'avocat le justifie.
 * Renvoie les souvenirs créés (pour « سأتذكّر … · تراجع » à l'écran). Ne lève jamais d'erreur.
 */
export async function apprendre(userId: string, message: string, reponsePrecedente: string): Promise<Souvenir[]> {
  try {
    if (message.length < 8 || !SIGNAL.test(message)) return []
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { memoireActive: true } })
    if (!u?.memoireActive) return []
    const existants = await prisma.memoireAvocat.findMany({ where: { userId, actif: true }, select: { id: true, type: true, texte: true }, orderBy: { updatedAt: 'desc' }, take: MAX_ACTIVES })
    const r = await askDeepseek<{ souvenirs?: { type: string; texte: string; remplace?: string | null }[] }>(
      SYSTEME_EXTRACTION,
      `Mémoire actuelle :\n${existants.map((s) => `- (${s.id}) [${s.type}] ${s.texte}`).join('\n') || '(vide)'}\n\n` +
      `Réponse précédente de l'assistant :\n${reponsePrecedente.slice(0, 2500) || '(aucune)'}\n\nMessage de l'avocat :\n${message.slice(0, 2000)}`,
      { json: true, temperature: 0, maxTokens: 300, timeoutMs: 12_000, tentatives: 1 },
    )
    const ids = new Set(existants.map((s) => s.id))
    const crees: Souvenir[] = []
    for (const s of (r?.souvenirs ?? []).slice(0, 2)) {
      const texte = String(s.texte ?? '').trim().slice(0, MAX_TEXTE)
      if (!TYPES.has(s.type) || texte.length < 8 || IDENTIFIANT.test(texte)) continue
      if (s.remplace && ids.has(s.remplace)) {
        const m = await prisma.memoireAvocat.update({ where: { id: s.remplace }, data: { texte, type: s.type as TypeMemoire, source: 'chat' }, select: { id: true, type: true, texte: true } })
        crees.push(m)
      } else {
        crees.push(await prisma.memoireAvocat.create({ data: { userId, type: s.type as TypeMemoire, texte, source: 'chat' }, select: { id: true, type: true, texte: true } }))
      }
    }
    if (crees.length) await limiter(userId)
    return crees
  } catch (e) {
    logger.warn('Apprentissage mémoire ignoré :', e)
    return []
  }
}

/** Au-delà de MAX_ACTIVES : on met en sommeil les plus anciens (les corrections en dernier). */
export async function limiter(userId: string) {
  const actifs = await prisma.memoireAvocat.findMany({ where: { userId, actif: true }, select: { id: true, type: true }, orderBy: { updatedAt: 'desc' } })
  if (actifs.length <= MAX_ACTIVES) return
  const trop = [...actifs.filter((s) => s.type !== 'CORRECTION').reverse(), ...actifs.filter((s) => s.type === 'CORRECTION').reverse()].slice(0, actifs.length - MAX_ACTIVES)
  await prisma.memoireAvocat.updateMany({ where: { id: { in: trop.map((s) => s.id) } }, data: { actif: false } })
}

/** Contrôle d'un souvenir proposé à la main par l'avocat (mêmes garde-fous). */
export function texteValide(texte: string): string | null {
  const t = texte.trim().slice(0, MAX_TEXTE)
  return t.length >= 8 && !IDENTIFIANT.test(t) ? t : null
}
