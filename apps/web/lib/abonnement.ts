export type EtatAbonnement = 'ESSAI' | 'PAYE' | 'A_RENOUVELER' | 'GRACE' | 'EXPIRE'

export interface AbonnementCourant {
  abonnement: null | {
    plan: string
    offre: { nomAr: string; prix: number | null; prixFondateur: number | null; maxDossiers: number; utilisateurs: number }
    estFondateur: boolean
    prixMensuel: number | null
    etat: EtatAbonnement
    fin: string | null
    joursRestants: number | null
  }
  dossierCount: number
  contact: { telephone: string | null; email: string }
}

/** Lien WhatsApp vers le commercial (numéro marocain en 06… ou +212…). */
export function lienWhatsapp(tel: string, texte: string) {
  const n = tel.replace(/[^\d]/g, '').replace(/^00/, '').replace(/^0/, '212')
  return `https://wa.me/${n}?text=${encodeURIComponent(texte)}`
}
