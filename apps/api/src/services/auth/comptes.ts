import { randomInt } from 'crypto'
import { z } from 'zod'

// Champs d'identité saisis par l'avocat ou le commercial : longueur bornée (un nom de 50 000 caractères
// rendait la page des demandes illisible) et téléphone réellement composé de chiffres.
export const champNom = z.string().trim().min(2).max(80)
export const champTelephone = z.string().trim()
  .transform((v) => v.replace(/[\s.\-()]/g, ''))
  .pipe(z.string().regex(/^\+?\d{9,15}$/, 'Numéro de téléphone invalide'))

/**
 * Fournisseurs d'e-mail courants acceptés à l'inscription (pas d'adresses jetables ni inconnues).
 * Un cabinet avec son propre domaine : EMAILS_DOMAINES_SUPPLEMENTAIRES=cabinet-x.ma,autre.ma
 */
export const DOMAINES_COURANTS = [
  'gmail.com', 'googlemail.com',
  'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'msn.com',
  'yahoo.com', 'yahoo.fr', 'ymail.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'gmx.com', 'gmx.fr', 'proton.me', 'protonmail.com',
  'menara.ma',
]

function domainesAutorises(): Set<string> {
  const extra = (process.env.EMAILS_DOMAINES_SUPPLEMENTAIRES ?? '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
  return new Set([...DOMAINES_COURANTS, ...extra])
}

export function emailAutorise(email: string): boolean {
  const domaine = email.trim().toLowerCase().split('@')[1]
  return !!domaine && domainesAutorises().has(domaine)
}

// Sans caractères ambigus (0/O, 1/l/I) : lisible au téléphone ou recopié depuis WhatsApp
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

/** Mot de passe provisoire, ex. « Malafi-7kQ4-X9Tp » : à changer à la première connexion. */
export function motDePasseProvisoire(): string {
  const bloc = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  return `Malafi-${bloc()}-${bloc()}`
}
