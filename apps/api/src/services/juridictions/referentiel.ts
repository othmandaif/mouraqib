/**
 * Référentiel UNIQUE des juridictions, tel que mahakim.ma les propose.
 *
 * Sur mahakim, le CODE du dossier (2e partie du numéro « année/code/numéro ») décide des listes affichées :
 * 1xxx civil et famille, 2xxx/3xxx pénal, 7xxx administratif, 8xxx commerce. Les libellés changent aussi
 * d'une liste à l'autre (« بسوق السبت » au civil, « سوق السبت » au pénal) : il faut donc toujours choisir
 * dans la liste du type du dossier, avec le libellé exact de mahakim.
 *
 * Données : mahakim.json, produit par `npx ts-node scripts/collecter-juridictions.ts --ecrire`
 * (à relancer si mahakim ajoute ou renomme une juridiction : l'erreur JuridictionIntrouvable le signale).
 */
import donnees from './mahakim.json'

export type TypeJuridiction = 'ordinaire' | 'famille' | 'penal' | 'commerce' | 'administratif'
export interface CourAppel { nom: string; tribunaux: string[] | null }

const REFERENTIEL = donnees as Record<TypeJuridiction, { code: string; cours: CourAppel[] }>

export const LIBELLE_TYPE: Record<TypeJuridiction, string> = {
  ordinaire: 'مدني', famille: 'أسرة', penal: 'زجري', commerce: 'تجاري', administratif: 'إداري',
}

/** Type de juridiction déduit du code du dossier (comme le fait mahakim). */
export function typeDuCode(code: string): TypeJuridiction {
  const c = (code || '').trim()
  if (c.startsWith('8')) return 'commerce'
  if (c.startsWith('7')) return 'administratif'
  if (c.startsWith('2') || c.startsWith('3')) return 'penal'
  if (c.startsWith('16') && REFERENTIEL.famille) return 'famille'
  return 'ordinaire'
}

export function juridictionsPour(code: string): { type: TypeJuridiction; cours: CourAppel[] } {
  const type = typeDuCode(code)
  return { type, cours: (REFERENTIEL[type] ?? REFERENTIEL.ordinaire).cours }
}

/** Clé de comparaison tolérante : hamza, ta marbouta, alif maqsoura, tatweel, espaces et tirets ignorés. */
export function cleArabe(s: string): string {
  return (s || '')
    .replace(/[ً-ْـ]/g, '') // voyelles, tatweel
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[\s ​-‏\-–—]+/g, '')
}
/** Variante sans les prépositions collées « ب » / « ل » en début de mot (« بسوق » ↔ « سوق », « ببني » ↔ « بني »). */
const sansPreposition = (s: string) => cleArabe((s || '').replace(/(^|\s)[بل](?=\S{2,})/g, '$1'))

function trouver(liste: string[], nom: string): string | undefined {
  const k = cleArabe(nom), kSans = sansPreposition(nom)
  // Égalité d'abord ; sinon la préposition manque d'UN seul côté (comparer les deux côtés dépouillés
  // abîmerait les mots qui commencent vraiment par ب : « بني » → « ني »)
  return liste.find((x) => cleArabe(x) === k)
    ?? liste.find((x) => sansPreposition(x) === k || cleArabe(x) === kSans)
}

/**
 * Libellés EXACTS mahakim pour un dossier : la cour d'appel est toujours redéduite du tribunal
 * (corrige les anciens rattachements : Taroudant était classée sous Agadir).
 * `null` si la juridiction n'existe pas dans la liste du type du code.
 */
export function libellesMahakim(code: string, courAppel: string, tribunalPrimaire?: string): { courAppel: string; tribunalPrimaire?: string } | null {
  const { cours } = juridictionsPour(code)
  if (tribunalPrimaire) {
    for (const ca of cours) {
      const tp = ca.tribunaux && trouver(ca.tribunaux, tribunalPrimaire)
      if (tp) return { courAppel: ca.nom, tribunalPrimaire: tp }
    }
    // Liste des tribunaux inconnue pour cette cour (pas encore collectée) : on garde le libellé saisi
    const ca = trouver(cours.map((c) => c.nom), courAppel)
    const cour = ca ? cours.find((c) => c.nom === ca) : undefined
    return cour && cour.tribunaux === null ? { courAppel: cour.nom, tribunalPrimaire } : null
  }
  const ca = trouver(cours.map((c) => c.nom), courAppel)
  return ca ? { courAppel: ca } : null
}

/** Juridiction absente du menu de mahakim (référentiel à rafraîchir, ou mauvais choix) : pas une panne. */
export class JuridictionIntrouvable extends Error {
  constructor(public libelle: string) { super(`Juridiction introuvable sur mahakim : ${libelle}`) }
}
