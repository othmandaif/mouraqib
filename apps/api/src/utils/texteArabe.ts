/** Comparaison tolérante à l'arabe : sans tachkil ni tatweel, أ/إ/آ → ا, ة → ه, ى → ي (mêmes règles que la recherche Ctrl K). */
export const normaliserArabe = (t: string) =>
  t.toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim()

/** Mots significatifs d'un nom (sans « شركة », « السيد »…, ni mots de moins de 2 lettres). */
const MOTS_VIDES = new Set(['شركه', 'مؤسسه', 'السيد', 'السيده', 'ورثه', 'بن', 'بنت', 'ولد', 'sarl', 'sa', 'sas', 'ste', 'societe', 'mr', 'mme', 'm'])
export function motsNom(nom: string): string[] {
  return normaliserArabe(nom).split(/[\s.,\-–—'"«»()]+/).filter((m) => m.length >= 2 && !MOTS_VIDES.has(m))
}

/**
 * Deux noms désignent-ils probablement la même personne ? Vrai si tous les mots significatifs du plus court
 * se retrouvent dans l'autre (« محمد العلوي » ↔ « السيد محمد بن أحمد العلوي »).
 */
export function nomsProches(a: string, b: string): boolean {
  const ma = motsNom(a), mb = motsNom(b)
  if (!ma.length || !mb.length) return false
  const [court, long] = ma.length <= mb.length ? [ma, new Set(mb)] : [mb, new Set(ma)]
  return court.every((m) => long.has(m))
}
