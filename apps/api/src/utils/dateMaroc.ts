// Dates « au Maroc » : un délai court jusqu'à la FIN du dernier jour, heure de Casablanca
// (UTC+1, UTC+0 pendant Ramadan). Le serveur, lui, tourne en UTC.
const TZ = 'Africa/Casablanca'
const JOUR_MS = 86_400_000

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })

function parts(d: Date) {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]))
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second }
}

/** Décalage de Casablanca par rapport à UTC à cet instant, en ms (ex. +3 600 000). */
function decalage(d: Date): number {
  const p = parts(d)
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(d.getTime() / 1000) * 1000
}

/** Jour calendaire marocain d'un instant, sous forme de « numéro de jour » comparable. */
function numeroJour(d: Date): number {
  const p = parts(d)
  return Date.UTC(p.y, p.m - 1, p.d) / JOUR_MS
}

/** 23:59:59 (heure du Maroc) du jour calendaire `numero`. */
function finDuJour(numero: number): Date {
  const approx = new Date(numero * JOUR_MS + (23 * 3600 + 59 * 60 + 59) * 1000)
  const premier = new Date(approx.getTime() - decalage(approx))
  return new Date(approx.getTime() - decalage(premier)) // 2e passe : juste même un jour de changement d'heure
}

/** Dernier jour d'un délai de `jours` jours partant de `depart`, à 23:59:59 heure du Maroc. */
export function finDeDelai(depart: Date, jours: number): Date {
  return finDuJour(numeroJour(depart) + jours)
}

/** Ramène un instant à 23:59:59 (heure du Maroc) de son jour calendaire. */
export function finDeJourMaroc(d: Date): Date {
  return finDuJour(numeroJour(d))
}

/** Jours calendaires restants (Maroc) : 0 = c'est aujourd'hui le dernier jour, négatif = dépassé. */
export function joursCalendaires(limite: Date, maintenant: Date = new Date()): number {
  return numeroJour(limite) - numeroJour(maintenant)
}

// Fêtes nationales à date fixe (tribunaux fermés). Les fêtes religieuses (calendrier lunaire)
// ne sont pas listées : elles changent chaque année.
const FERIES_FIXES = ['01-01', '01-11', '01-14', '05-01', '07-30', '08-14', '08-20', '08-21', '11-06', '11-18']

export function estJourNonOuvrable(d: Date): boolean {
  const p = parts(d)
  const jourSemaine = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()
  if (jourSemaine === 0 || jourSemaine === 6) return true
  return FERIES_FIXES.includes(`${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`)
}

/**
 * Dernier jour OUVRABLE avant ou égal à la limite. Utilisé pour les rappels : si le dernier jour
 * tombe un samedi, on prévient comme si c'était le vendredi (prudence : on ne compte pas sur une
 * éventuelle prorogation, à confirmer par l'avocat).
 */
export function dernierJourOuvrable(limite: Date): Date {
  let d = finDeJourMaroc(limite)
  for (let i = 0; i < 7 && estJourNonOuvrable(d); i++) d = finDuJour(numeroJour(d) - 1)
  return d
}

/** Instant UTC correspondant à une date et une heure lues au Maroc (ex. « 10:30 » sur mahakim). */
export function instantMaroc(an: number, mois: number, jour: number, heure: number, minute: number): Date {
  const approx = new Date(Date.UTC(an, mois - 1, jour, heure, minute))
  const premier = new Date(approx.getTime() - decalage(approx))
  return new Date(approx.getTime() - decalage(premier))
}

/** Décalage Maroc/UTC (ms) à un instant donné : +1 h la plupart de l'année, 0 pendant Ramadan. */
export function decalageMaroc(d: Date): number {
  return decalage(d)
}
