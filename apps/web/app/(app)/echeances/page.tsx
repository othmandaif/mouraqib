'use client'

import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import Link from 'next/link'

interface Echeance {
  id: string
  description: string
  typeDelai: string
  dateLimite: string
  estCritique: boolean
  dossier: { numeroDossier: string; tribunal: string; titreAffaire?: string }
  evenement?: { typeEvenement?: string }
}

export default function EcheancesPage() {
  const { data: echeances, loading, refetch } = useApi<Echeance[]>('/echeances')

  const joursRestants = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)

  const handleComplete = async (id: string) => {
    await apiFetch(`/echeances/${id}/complete`, { method: 'PATCH' }).catch(() => {})
    refetch()
  }

  const groupByUrgency = (items: Echeance[]) => ({
    urgent: items.filter((e) => joursRestants(e.dateLimite) <= 3),
    soon: items.filter((e) => { const j = joursRestants(e.dateLimite); return j > 3 && j <= 7 }),
    later: items.filter((e) => joursRestants(e.dateLimite) > 7),
  })

  const groups = echeances ? groupByUrgency(echeances) : { urgent: [], soon: [], later: [] }

  const EcheanceCard = ({ e }: { e: Echeance }) => {
    const j = joursRestants(e.dateLimite)
    return (
      <div className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${j <= 3 ? 'border-red-200' : j <= 7 ? 'border-orange-200' : 'border-slate-200'}`}>
        <span className={`text-sm font-bold px-3 py-1.5 rounded-lg shrink-0 ${j <= 1 ? 'bg-red-100 text-red-700' : j <= 3 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
          J-{j}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 truncate">{e.description}</p>
          <Link href={`/dossiers/${e.dossier.numeroDossier}`} className="text-sm text-slate-500 hover:text-blue-600">
            {e.dossier.numeroDossier} — {e.dossier.tribunal}
          </Link>
        </div>
        <div className="text-sm text-slate-400 shrink-0">
          {new Date(e.dateLimite).toLocaleDateString('fr-MA')}
        </div>
        <button onClick={() => handleComplete(e.id)}
          className="text-sm text-green-600 hover:text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 border border-green-200 shrink-0 transition-colors">
          ✓ Fait
        </button>
      </div>
    )
  }

  if (loading) return <div className="space-y-4 animate-pulse"><div className="h-8 bg-slate-200 rounded w-40" /><div className="h-64 bg-slate-200 rounded-xl" /></div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Échéances</h1>
        <p className="text-slate-500 mt-1">{echeances?.length ?? 0} délai{(echeances?.length ?? 0) > 1 ? 's' : ''} en cours</p>
      </div>

      {(echeances?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-16 text-center">
          <p className="text-slate-400 text-lg">✅ Aucune échéance en cours</p>
          <p className="text-slate-400 text-sm mt-2">Les délais calculés automatiquement apparaîtront ici</p>
        </div>
      ) : (
        <>
          {groups.urgent.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-red-700 mb-3">🔴 Urgents — moins de 3 jours ({groups.urgent.length})</h2>
              <div className="space-y-2">{groups.urgent.map((e) => <EcheanceCard key={e.id} e={e} />)}</div>
            </section>
          )}
          {groups.soon.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-orange-700 mb-3">🟠 Prochainement — 4 à 7 jours ({groups.soon.length})</h2>
              <div className="space-y-2">{groups.soon.map((e) => <EcheanceCard key={e.id} e={e} />)}</div>
            </section>
          )}
          {groups.later.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-slate-700 mb-3">🟡 À venir — plus de 7 jours ({groups.later.length})</h2>
              <div className="space-y-2">{groups.later.map((e) => <EcheanceCard key={e.id} e={e} />)}</div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
