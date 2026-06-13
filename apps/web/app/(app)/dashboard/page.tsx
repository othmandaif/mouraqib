'use client'

import Link from 'next/link'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'

interface Echeance {
  id: string
  description: string
  dateLimite: string
  typeDelai: string
  dossier: { numeroDossier: string; tribunal: string; titreAffaire?: string }
}

interface Dossier {
  id: string
  numeroDossier: string
  tribunal: string
  titreAffaire?: string
  echeances: { id: string }[]
  _count: { evenements: number }
  updatedAt: string
}

export default function DashboardPage() {
  const { data: echeances, loading: loadE } = useApi<Echeance[]>('/echeances/critiques')
  const { data: dossiers, loading: loadD } = useApi<Dossier[]>('/dossiers')
  const { data: abonnement } = useApi<{ abonnement: { plan: string; maxDossiers: number }; dossierCount: number }>('/abonnements/current')

  const loading = loadE || loadD

  const joursRestants = (dateLimite: string) =>
    Math.ceil((new Date(dateLimite).getTime() - Date.now()) / 86_400_000)

  const urgencyColor = (j: number) =>
    j <= 1 ? 'text-red-600 bg-red-50' : j <= 3 ? 'text-orange-600 bg-orange-50' : 'text-yellow-700 bg-yellow-50'

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-slate-500 mt-1">Vue d'ensemble de votre activité judiciaire</p>
      </div>

      {/* Alerte délais critiques */}
      {(echeances?.length ?? 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="font-semibold text-red-800">
              {echeances!.length} délai{echeances!.length > 1 ? 's' : ''} critique{echeances!.length > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-red-600">Vérifiez vos échéances immédiatement</p>
          </div>
          <Link href="/echeances" className="ml-auto text-sm font-medium text-red-700 hover:underline">
            Voir →
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Dossiers actifs', value: dossiers?.length ?? 0, icon: '📁', limit: abonnement ? `/ ${abonnement.abonnement?.maxDossiers ?? 3}` : '' },
          { label: 'Délais critiques', value: echeances?.length ?? 0, icon: '⚠️', critical: (echeances?.length ?? 0) > 0 },
          { label: 'Plan', value: abonnement?.abonnement?.plan ?? 'GRATUIT', icon: '💼' },
          { label: 'Dossiers surveillés', value: dossiers?.length ?? 0, icon: '🔍' },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl p-5 border ${kpi.critical ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
            <div className="text-2xl mb-2">{kpi.icon}</div>
            <div className={`text-2xl font-bold ${kpi.critical ? 'text-red-700' : 'text-slate-900'}`}>
              {kpi.value} {kpi.limit}
            </div>
            <div className="text-sm text-slate-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Délais critiques */}
      {(echeances?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">⏰ Délais imminents</h2>
          <div className="space-y-2">
            {echeances!.map((e) => {
              const j = joursRestants(e.dateLimite)
              return (
                <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${urgencyColor(j)}`}>
                    J-{j}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{e.description}</p>
                    <p className="text-sm text-slate-500">
                      {e.dossier.numeroDossier} — {e.dossier.tribunal}
                    </p>
                  </div>
                  <p className="text-sm text-slate-400">
                    {new Date(e.dateLimite).toLocaleDateString('fr-MA')}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Dossiers récents */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">📁 Mes dossiers</h2>
          <Link href="/dossiers" className="text-sm text-blue-600 hover:underline">Voir tous →</Link>
        </div>
        {(dossiers?.length ?? 0) === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <p className="text-slate-500 mb-4">Aucun dossier surveillé</p>
            <Link href="/dossiers"
              className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              + Ajouter un dossier
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {dossiers!.slice(0, 4).map((d) => (
              <Link key={d.id} href={`/dossiers/${d.id}`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-slate-900">{d.numeroDossier}</p>
                  {d.echeances.length > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {d.echeances.length} délai{d.echeances.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">{d.tribunal}</p>
                {d.titreAffaire && <p className="text-xs text-slate-400 mt-1 truncate">{d.titreAffaire}</p>}
                <p className="text-xs text-slate-400 mt-2">{d._count.evenements} événement{d._count.evenements > 1 ? 's' : ''}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
