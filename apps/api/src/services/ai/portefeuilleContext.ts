import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const STATUT_AR: Record<string, string> = {
  OUVERT: 'جارية', EN_DELIBERE: 'في المداولة', CLOS: 'منتهية', INCONNU: 'غير محددة',
}
const fmt = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

/**
 * Construit le CONTEXTE intelligent pour le chat, en deux niveaux :
 *  1) Vue d'ensemble compacte de TOUT le portefeuille (toujours).
 *  2) Zoom détaillé sur les dossiers mentionnés dans la question (si détectés).
 *
 * @param userId   l'avocat
 * @param question le message tapé (pour détecter quels dossiers zoomer)
 * @param dossierIdForce  un dossier à toujours détailler (ex : si on chate depuis sa page)
 */
export async function construireContextePortefeuille(
  userId: string,
  question: string,
  dossierIdForce?: string,
): Promise<string> {
  // ── 1) Vue d'ensemble : tous les dossiers actifs, données compactes ──
  const dossiers = await prisma.dossier.findMany({
    where: { userId, estActif: true },
    select: {
      id: true,
      numeroDossier: true,
      tribunal: true,
      titreAffaire: true,
      statutIA: true,
      resumeIA: true,
      partieAdverse: true,
      echeances: {
        where: { estComplete: false, estExpire: false },
        orderBy: { dateLimite: 'asc' },
        select: { description: true, dateLimite: true, estCritique: true },
      },
      evenements: {
        orderBy: { datePublicationGreffe: 'desc' },
        take: 1,
        select: { texteArabe: true, datePublicationGreffe: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (dossiers.length === 0) {
    return 'المحامي لا يملك أي ملف نشط حالياً في المنصّة.'
  }

  const lignes = dossiers.map((d) => {
    const nbCrit = d.echeances.filter((e) => e.estCritique).length
    const dernier = d.evenements[0]
    const dernierTxt = dernier ? `${fmt(dernier.datePublicationGreffe)}: ${dernier.texteArabe}` : 'لا جديد'
    return `• ${d.numeroDossier} | ${d.tribunal} | الحالة: ${STATUT_AR[d.statutIA] || 'غير محددة'} | آجال غير منجزة: ${d.echeances.length} (حرجة: ${nbCrit}) | آخر إجراء: ${dernierTxt}`
  })

  // ── 2) Détection des dossiers à zoomer ──
  // On normalise la question et on repère les numéros de dossier (AAAA/CC/NNN…)
  // ou les noms de partie adverse mentionnés.
  const q = (question || '').toLowerCase()
  const cibles = new Set<string>()
  if (dossierIdForce) cibles.add(dossierIdForce)

  for (const d of dossiers) {
    const num = d.numeroDossier.toLowerCase()
    // numéro complet ou la dernière partie (le numéro d'ordre) mentionnés
    const morceaux = num.split('/')
    if (q.includes(num)) cibles.add(d.id)
    else if (morceaux.length === 3 && q.includes(morceaux[2]) && q.includes(morceaux[0])) cibles.add(d.id)
    // nom de la partie adverse mentionné
    if (d.partieAdverse && d.partieAdverse.length > 3 && q.includes(d.partieAdverse.toLowerCase())) cibles.add(d.id)
    if (d.titreAffaire && d.titreAffaire.length > 4 && q.includes(d.titreAffaire.toLowerCase())) cibles.add(d.id)
  }

  // ── 3) Zoom détaillé sur les dossiers ciblés (max 3 pour limiter les tokens) ──
  let zoom = ''
  const ciblesArr = Array.from(cibles).slice(0, 3)
  if (ciblesArr.length > 0) {
    const details = await prisma.dossier.findMany({
      where: { id: { in: ciblesArr }, userId },
      select: {
        numeroDossier: true, tribunal: true, titreAffaire: true, statutIA: true, resumeIA: true,
        rawData: true,
        echeances: {
          where: { estComplete: false },
          orderBy: { dateLimite: 'asc' },
          select: { description: true, typeDelai: true, dateLimite: true, estCritique: true, estExpire: true },
        },
        evenements: {
          orderBy: { datePublicationGreffe: 'desc' },
          take: 15,
          select: { texteArabe: true, datePublicationGreffe: true, dateAudience: true },
        },
      },
    })

    const blocs = details.map((d) => {
      const evts = d.evenements
        .map((e) => `   - ${fmt(e.datePublicationGreffe)}${e.dateAudience ? ` (جلسة: ${fmt(e.dateAudience)})` : ''}: ${e.texteArabe}`)
        .join('\n')
      const ech = d.echeances.length
        ? d.echeances.map((e) => `   - ${e.description || e.typeDelai} — ${fmt(e.dateLimite)}${e.estCritique ? ' [حرج]' : ''}${e.estExpire ? ' [منصرم]' : ''}`).join('\n')
        : '   لا توجد آجال غير منجزة.'
      const raw = (d.rawData ?? {}) as any
      const parties = Array.isArray(raw.parties)
        ? raw.parties.map((p: any) => `${p.qualite}: ${p.nom}`).join(' / ')
        : 'غير متوفرة'
      return `■ تفاصيل الملف ${d.numeroDossier} (${d.tribunal})
الموضوع: ${d.titreAffaire || 'غير محدّد'} | الحالة: ${STATUT_AR[d.statutIA] || 'غير محددة'}
الأطراف: ${parties}
الآجال:
${ech}
آخر الإجراءات:
${evts || '   لا توجد إجراءات.'}`
    })
    zoom = '\n\nتفاصيل الملفات المعنية بالسؤال:\n' + blocs.join('\n\n')
  }

  return `لمحة عامة عن محفظة ملفات المحامي (${dossiers.length} ملف نشط):
${lignes.join('\n')}${zoom}`
}