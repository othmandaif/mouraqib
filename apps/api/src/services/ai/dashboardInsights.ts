import { PrismaClient } from '@prisma/client'
import { askDeepseek, limiterTexte } from './deepseek'
import { logger } from '../../utils/logger'

const prisma = new PrismaClient()

const DAY = 86_400_000

export interface InsightExpert {
  numeroDossier: string
  niveau: 'eleve' | 'moyen' | 'info'   // urgence
  titre: string                         // court, ex: "أجل استئناف محتمل"
  detail: string                        // explication en arabe
}

const PROMPT_INSIGHTS = `أنت محامٍ مغربي خبير. ستتلقى ملخّصاً لعدّة ملفات قضائية مع آخر إجراءاتها.
مهمتك: رصد الملفات التي تستدعي انتباه المحامي، وإرجاع قائمة تنبيهات بصيغة JSON فقط:
{
  "tanbihat": [
    { "numeroDossier": "...", "niveau": "eleve|moyen|info", "titre": "عنوان قصير", "detail": "شرح موجز بالعربية" }
  ]
}
ركّز على:
- صدور حكم قد يفتح أجل استئناف أو تعرّض (niveau eleve).
- ملفات بدون أي إجراء منذ مدّة طويلة (خطر التشطيب أو السقوط) (niveau moyen).
- تكرار التأجيلات أو الإجراءات الكيدية (niveau info).
قواعد: استند فقط إلى المعطيات. لا تختلق. لا تحسب آجالاً دقيقة بالأيام (المحامي لديه نظام احتساب منفصل)، فقط نبّه إلى وجود أجل محتمل.
أرجِع 8 تنبيهات كحدّ أقصى، الأهم أولاً. إن لا توجد ملاحظات، أرجِع قائمة فارغة.`

/**
 * Génère les "تنبيهات الخبير" pour un utilisateur via DeepSeek.
 * Coûteux → à appeler périodiquement (cron) ou à la demande, PAS à chaque chargement.
 */
export async function genererInsightsExpert(userId: string): Promise<InsightExpert[]> {
  const dossiers = await prisma.dossier.findMany({
    where: { userId, estActif: true },
    select: {
      numeroDossier: true,
      tribunal: true,
      statutIA: true,
      updatedAt: true,
      evenements: {
        orderBy: { datePublicationGreffe: 'desc' },
        take: 4,
        select: { texteArabe: true, datePublicationGreffe: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 60, // borne pour limiter les tokens
  })

  if (dossiers.length === 0) return []

  const now = Date.now()
  const lignes = dossiers.map((d) => {
    const dernier = d.evenements[0]
    const joursInactif = dernier
      ? Math.floor((now - new Date(dernier.datePublicationGreffe).getTime()) / DAY)
      : null
    const evts = d.evenements
      .map((e) => `${new Date(e.datePublicationGreffe).toLocaleDateString('fr-MA')}: ${e.texteArabe}`)
      .join(' | ')
    return `الملف ${d.numeroDossier} (${d.tribunal}) — الحالة: ${d.statutIA}${joursInactif !== null ? ` — آخر إجراء منذ ${joursInactif} يوماً` : ''} — الإجراءات: ${evts || 'لا شيء'}`
  })

  const userPrompt = `ملفات المحامي:\n${limiterTexte(lignes, 8000)}`

  try {
    const res = await askDeepseek<{ tanbihat: InsightExpert[] }>(PROMPT_INSIGHTS, userPrompt, {
      json: true,
      temperature: 0.3,
      maxTokens: 1200,
    })
    const list = Array.isArray(res?.tanbihat) ? res.tanbihat : []
    // garde-fou : ne garder que les dossiers réels de l'utilisateur
    const valides = new Set(dossiers.map((d) => d.numeroDossier))
    return list
      .filter((t) => t && t.numeroDossier && valides.has(t.numeroDossier))
      .slice(0, 8)
      .map((t) => ({
        numeroDossier: t.numeroDossier,
        niveau: ['eleve', 'moyen', 'info'].includes(t.niveau) ? t.niveau : 'info',
        titre: (t.titre || '').slice(0, 80),
        detail: (t.detail || '').slice(0, 300),
      }))
  } catch (err) {
    logger.error(`Insights expert IA échoués pour ${userId}:`, err)
    return []
  }
}