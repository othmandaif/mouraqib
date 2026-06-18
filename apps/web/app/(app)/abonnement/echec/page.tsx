import Link from 'next/link'

export default function AbonnementEchecPage() {
  return (
    <div className="max-w-md mx-auto text-center space-y-6 pt-16">
      <div className="text-7xl">❌</div>
      <h1 className="text-3xl font-bold text-slate-900">Paiement échoué</h1>
      <p className="text-slate-600">
        Votre paiement n'a pas pu être traité. Aucun montant n'a été débité.
        Veuillez vérifier vos informations bancaires et réessayer.
      </p>
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-left">
        <p className="text-sm text-red-800 font-medium mb-2">Causes possibles :</p>
        <ul className="text-sm text-red-700 space-y-1">
          <li>• Fonds insuffisants sur la carte</li>
          <li>• Carte non autorisée pour les paiements en ligne</li>
          <li>• Délai de session expiré</li>
          <li>• Problème de connexion</li>
        </ul>
      </div>
      <div className="flex gap-4 justify-center">
        <Link href="/abonnement"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
          Réessayer
        </Link>
        <Link href="/dashboard"
          className="inline-block border border-slate-300 hover:border-slate-400 text-slate-700 px-6 py-3 rounded-xl font-semibold transition-colors">
          Tableau de bord
        </Link>
      </div>
      <p className="text-xs text-slate-400">
        Besoin d'aide ? Contactez-nous à support@mouraqib.ma
      </p>
    </div>
  )
}
