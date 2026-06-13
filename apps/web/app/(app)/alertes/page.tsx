'use client'

import { useApi } from '@/hooks/useApi'

interface Alerte {
  id: string
  typeAlerte: string
  canal: string
  statut: string
  createdAt: string
  dossier?: { numeroDossier: string; tribunal: string }
}

const STATUT_STYLE: Record<string, string> = {
  ENVOYE: 'bg-green-100 text-green-700',
  EN_ATTENTE: 'bg-yellow-100 text-yellow-700',
  ECHEC: 'bg-red-100 text-red-700',
  IGNOREE: 'bg-slate-100 text-slate-500',
}

const TYPE_LABEL: Record<string, string> = {
  NOUVEL_EVENEMENT: '📋 Nouvel événement',
  DELAI_CRITIQUE: '⏰ Délai critique',
  DIGEST_QUOTIDIEN: '☀️ Digest matinal',
  RENVOI_DETECTE: '🔄 Renvoi détecté',
}

export default function AlertesPage() {
  const { data: alertes, loading } = useApi<Alerte[]>('/alertes')

  if (loading) return <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Historique des alertes</h1>
        <p className="text-slate-500 mt-1">{alertes?.length ?? 0} alerte{(alertes?.length ?? 0) > 1 ? 's' : ''}</p>
      </div>

      {(alertes?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-16 text-center">
          <p className="text-slate-400">Aucune alerte envoyée pour l'instant</p>
          <p className="text-slate-400 text-sm mt-2">Les alertes WhatsApp apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertes!.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-slate-900">{TYPE_LABEL[a.typeAlerte] ?? a.typeAlerte}</p>
                {a.dossier && (
                  <p className="text-sm text-slate-500">{a.dossier.numeroDossier} — {a.dossier.tribunal}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUT_STYLE[a.statut] ?? ''}`}>
                {a.statut}
              </span>
              <span className="text-xs text-slate-400">
                {a.canal}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(a.createdAt).toLocaleDateString('fr-MA')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
