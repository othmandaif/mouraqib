import { redirect } from 'next/navigation'

// Ancienne page de retour du paiement CMI (vente directe désormais)
export default function AncienRetourPaiement() {
  redirect('/abonnement')
}
