// « تحضير ملف العمل » : actes de procédure à proposer selon l'étape du dossier, avec leurs champs pré-remplis.
// Les documents administratifs (page de garde, convention, reçu, bordereau, lettre, procuration, note d'honoraires)
// sont mis en page côté navigateur à partir des mêmes données (apps/web/lib/pack/).
import { getTypeActe } from './typesActes'

export interface DonneesPack {
  estCourAppel: boolean
  typeProcedure: string
  roleClient: 'DEMANDEUR' | 'DEFENDEUR' | 'INCONNU'
  numeroDossier: string
  tribunalAr: string
  nomClient: string
  nomAdversaire: string
  objet: string
  nbEvenements: number
  jugement: { texte: string; date: Date } | null
}

export interface ActeSuggere {
  typeActe: string
  titreAr: string
  raison: string
  variables: Record<string, string>
}

const fmt = (d: Date) => new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)

/** Actes utiles à ce stade, du plus urgent au moins urgent. */
export function actesSuggeres(d: DonneesPack): ActeSuggere[] {
  const client = d.nomClient || '', adv = d.nomAdversaire || ''
  const ref = d.jugement ? `${d.jugement.texte.slice(0, 120)} بتاريخ ${fmt(d.jugement.date)}` : ''
  const demandeur = d.roleClient === 'DEFENDEUR' ? adv : client
  const defendeur = d.roleClient === 'DEFENDEUR' ? client : adv
  const liste: Omit<ActeSuggere, 'titreAr'>[] = []

  if (d.jugement) {
    // Décision rendue : recours d'abord (délai qui court), puis notification et exécution
    if (d.estCourAppel) {
      liste.push({ typeActe: 'REQUETE_CASSATION', raison: 'صدر قرار استئنافي: الطعن بالنقض داخل الأجل.', variables: { requerant: client, defendeur: adv, decision: ref } })
    } else {
      liste.push({ typeActe: 'REQUETE_APPEL', raison: 'صدر حكم ابتدائي: الاستئناف داخل الأجل إذا كان الحكم ضد موكلكم.', variables: { appelant: client, intime: adv, jugement: ref } })
    }
    liste.push(
      { typeActe: 'DEMANDE_NOTIFICATION', raison: 'تبليغ الحكم يُطلق أجل الطعن في مواجهة الخصم.', variables: { demandeur: client, defendeur: adv, jugement: ref, tribunal: d.tribunalAr } },
      { typeActe: 'DEMANDE_COPIE_EXECUTOIRE', raison: 'لازمة لفتح ملف التنفيذ إذا كان الحكم لصالح موكلكم.', variables: { demandeur: client, jugement: ref, tribunal: d.tribunalAr } },
      { typeActe: 'DEMANDE_EXECUTION', raison: 'بعد صيرورة الحكم نهائياً أو مشمولاً بالنفاذ المعجل.', variables: { demandeur: client, defendeur: adv, jugement: ref, tribunal: d.tribunalAr } },
    )
  } else if (d.typeProcedure === 'REFERE') {
    liste.push({ typeActe: 'REFERE', raison: 'مسطرة استعجالية.', variables: { demandeur, defendeur, demande: d.objet } })
  } else {
    if (d.roleClient !== 'DEFENDEUR' && d.nbEvenements === 0) {
      liste.push({ typeActe: 'REQUETE_INTRODUCTIVE', raison: 'بداية الدعوى.', variables: { demandeur: client, defendeur: adv, tribunal: d.tribunalAr, objet: d.objet } })
    }
    if (d.roleClient === 'DEFENDEUR' || d.roleClient === 'INCONNU') {
      liste.push({ typeActe: 'MEMOIRE_DEFENSE', raison: 'الرد على مقال المدعي.', variables: { partie: client, adversaire: adv, numero_dossier: d.numeroDossier } })
    }
    if (d.roleClient === 'DEMANDEUR' && d.nbEvenements > 0) {
      liste.push({ typeActe: 'MEMOIRE_TAAQIB', raison: 'التعقيب على جواب المدعى عليه.', variables: { partie: client, adversaire: adv, numero_dossier: d.numeroDossier, tribunal: d.tribunalAr } })
    }
  }

  return liste
    .map((a) => ({ ...a, titreAr: getTypeActe(a.typeActe)?.titreAr ?? a.typeActe, variables: Object.fromEntries(Object.entries(a.variables).filter(([, v]) => v)) }))
    .filter((a) => getTypeActe(a.typeActe))
}
