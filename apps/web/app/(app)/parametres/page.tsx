'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useApi } from '@/hooks/useApi'

export default function ParametresPage() {
  const { user } = useAuth()
  const { data: abonnement } = useApi<{ abonnement: { plan: string; dateFin: string }; dossierCount: number }>('/abonnements/current')

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
      </div>

      {/* Profil */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Mon profil</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Nom</span>
            <span className="font-medium">Maître {user?.prenom} {user?.nom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">WhatsApp</span>
            <span className="font-medium">
              {user?.whatsappVerifie ? (
                <span className="text-green-600">✓ Vérifié</span>
              ) : (
                <Link href="/parametres/whatsapp" className="text-orange-600 hover:underline">
                  ⚠️ Non vérifié — Configurer →
                </Link>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Abonnement */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Abonnement</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Plan actuel</span>
            <span className="font-semibold text-blue-700">{abonnement?.abonnement?.plan ?? 'GRATUIT'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Dossiers utilisés</span>
            <span className="font-medium">{abonnement?.dossierCount ?? 0}</span>
          </div>
          {abonnement?.abonnement?.dateFin && (
            <div className="flex justify-between">
              <span className="text-slate-500">Renouvellement</span>
              <span className="font-medium">{new Date(abonnement.abonnement.dateFin).toLocaleDateString('fr-MA')}</span>
            </div>
          )}
        </div>
        <Link href="/abonnement"
          className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded-lg font-medium transition-colors">
          Changer de plan
        </Link>
      </section>

      {/* WhatsApp */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-2">Alertes WhatsApp</h2>
        <p className="text-sm text-slate-500 mb-4">
          Vérifiez votre numéro WhatsApp pour recevoir les alertes judiciaires.
        </p>
        <Link href="/parametres/whatsapp"
          className="inline-block border border-slate-300 hover:border-slate-400 text-slate-700 text-sm px-5 py-2 rounded-lg font-medium transition-colors">
          Configurer WhatsApp →
        </Link>
      </section>
    </div>
  )
}
