import { z } from 'zod'

// Préférences d'alertes (Paramètres › التنبيهات). Stockées dans User.preferences (JSON).
const Canaux = z.object({ whatsapp: z.boolean(), app: z.boolean() })
const Heure = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const PreferencesSchema = z.object({
  matrice: z.object({
    delai48h: Canaux,     // toujours actif (verrouillé côté UI et ici)
    nouveauDelai: Canaux,
    jugement: Canaux,
    audience: Canaux,
    surveiller: Canaux,   // délais de l'adversaire
  }),
  digestActif: z.boolean(),
  digestHeure: Heure,
  calmeDebut: Heure,
  calmeFin: Heure,
  rappels: z.array(z.number().int().min(0).max(30)).max(6),
})
export type Preferences = z.infer<typeof PreferencesSchema>
export type CleEvenement = keyof Preferences['matrice']

export const PREFERENCES_DEFAUT: Preferences = {
  matrice: {
    delai48h: { whatsapp: true, app: true },
    nouveauDelai: { whatsapp: true, app: true },
    jugement: { whatsapp: true, app: true },
    audience: { whatsapp: true, app: true },
    surveiller: { whatsapp: false, app: true },
  },
  digestActif: true,
  digestHeure: '07:00',
  calmeDebut: '21:00',
  calmeFin: '07:00',
  rappels: [7, 3, 1, 0],
}

/** Fusionne ce qui est stocké avec les valeurs par défaut (champs manquants ou invalides → défaut). */
export function lirePreferences(brut: unknown): Preferences {
  const b = (brut && typeof brut === 'object' ? brut : {}) as Partial<Preferences>
  const fusion = {
    ...PREFERENCES_DEFAUT,
    ...b,
    matrice: { ...PREFERENCES_DEFAUT.matrice, ...(b.matrice ?? {}) },
  }
  fusion.matrice.delai48h = { whatsapp: true, app: true } // jamais désactivable
  const p = PreferencesSchema.safeParse(fusion)
  return p.success ? p.data : PREFERENCES_DEFAUT
}

/** Heure courante au Maroc, « HH:MM ». */
export function heureMaroc(d = new Date()): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
}

/** Vrai si l'heure est dans la plage calme (gère la plage qui passe minuit, ex. 21:00 → 07:00). */
export function enHeuresCalmes(p: Preferences, d = new Date()): boolean {
  const h = heureMaroc(d)
  return p.calmeDebut <= p.calmeFin ? h >= p.calmeDebut && h < p.calmeFin : h >= p.calmeDebut || h < p.calmeFin
}

/** Fin d'un numéro de dossier pour WhatsApp : « …/1801/77 » (jamais le nom des parties). */
export function numeroCourt(numero: string): string {
  const parts = numero.split('/')
  return parts.length >= 3 ? `…/${parts.slice(-2).join('/')}` : numero
}
