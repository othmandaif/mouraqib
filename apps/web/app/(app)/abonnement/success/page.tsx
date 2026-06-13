import Link from 'next/link'

export default function AbonnementSuccessPage() {
  return (
    <div className="max-w-md mx-auto text-center space-y-6 pt-16">
      <div className="text-7xl">✅</div>
      <h1 className="text-3xl font-bold text-slate-900">Paiement confirmé !</h1>
      <p className="text-slate-600">
        Votre abonnement a été activé. Vous pouvez maintenant surveiller plus de dossiers
        et recevoir toutes vos alertes WhatsApp.
      </p>
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-left">
        <p className="text-sm text-green-800 font-medium mb-2">Ce qui est maintenant actif :</p>
        <ul className="text-sm text-green-700 space-y-1">
          <li>✓ Surveillance automatique mahakim.ma</li>
          <li>✓ Alertes WhatsApp instantanées</li>
          <li>✓ Calcul des délais procéduraux</li>
          <li>✓ Digest matinal quotidien</li>
        </ul>
      </div>
      <Link href="/dashboard"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors">
        Aller au tableau de bord →
      </Link>
    </div>
  )
}
