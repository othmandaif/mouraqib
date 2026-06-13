'use client'

import { use } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'

interface Evenement {
  id: string
  texteArabe: string
  typeEvenement?: string
  dateAudience?: string
  datePublicationGreffe: string
  confiance?: number
  estNouvel: boolean
}

interface Echeance {
  id: string
  description: string
  typeDelai: string
  dateLimite: string
  estCritique: boolean
  estComplete: boolean
}

interface DossierDetail {
  id: string
  numeroDossier: string
  tribunal: string
  titreAffaire?: string
  typeProcedure: string
  evenements: Evenement[]
  echeances: Echeance[]
}

const TYPE_LABELS: Record<string, string> = {
  RENVOI_SIMPLE: '🔄 Renvoi',
  RENVOI_EXPERT: '🔬 Renvoi expertise',
  RENVOI_NOTIFICATION: '📨 Renvoi notification',
  JUGEMENT_RENDU: '⚖️ Jugement rendu',
  MISE_EN_DELIBERE: '🤔 Mise en délibéré',
  ORDONNANCE_RENDUE: '📜 Ordonnance',
  NOTIFICATION_PARTIE: '📬 Notification',
  APPEL_INTERJET: '📣 Appel interjeté',
  POURVOI_CASSATION: '🏛️ Pourvoi cassation',
  RADIATION: '❌ Radiation',
  AUTRE: '❓ Autre',
}

export default function DossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: dossier, loading, refetch } = useApi<DossierDetail>(`/dossiers/${id}`)

  const joursRestants = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)

  const handleComplete = async (echeanceId: string) => {
    await apiFetch(`/echeances/${echeanceId}/complete`, { method: 'PATCH' }).catch(() => {})
    refetch()
  }

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-slate-200 rounded w-48" /><div className="h-64 bg-slate-200 rounded-xl" /></div>
  if (!dossier) return <div className="text-slate-500">Dossier non trouvé</div>

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/dossiers" className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">← Mes dossiers</Link>
        <h1 className="text-2xl font-bold text-slate-900">{dossier.numeroDossier}</h1>
        <p className="text-slate-500">{dossier.tribunal} · {dossier.typeProcedure}</p>
        {dossier.titreAffaire && <p className="text-slate-400 text-sm mt-1">{dossier.titreAffaire}</p>}
      </div>

      {/* Échéances */}
      {dossier.echeances.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">⏰ Échéances</h2>
          <div className="space-y-2">
            {dossier.echeances.map((e) => {
              const j = joursRestants(e.dateLimite)
              return (
                <div key={e.id} className={`rounded-xl border p-4 flex items-center gap-4 ${e.estCritique ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${j <= 1 ? 'bg-red-100 text-red-700' : j <= 3 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    J-{j}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{e.description}</p>
                    <p className="text-sm text-slate-500">Échéance : {new Date(e.dateLimite).toLocaleDateString('fr-MA')}</p>
                  </div>
                  <button onClick={() => handleComplete(e.id)}
                    className="text-sm text-green-600 hover:text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors border border-green-200">
                    ✓ Fait
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Événements */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">📋 Historique des événements</h2>
        {dossier.evenements.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
            Aucun événement détecté — scraping en cours...
          </div>
        ) : (
          <div className="space-y-2">
            {dossier.evenements.map((ev) => (
              <div key={ev.id} className={`bg-white rounded-xl border p-4 ${ev.estNouvel ? 'border-blue-200' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {ev.typeEvenement && (
                      <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full mb-2 inline-block">
                        {TYPE_LABELS[ev.typeEvenement] ?? ev.typeEvenement}
                      </span>
                    )}
                    <p className="text-slate-800 font-arabic text-right" dir="rtl">{ev.texteArabe}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-slate-500">{new Date(ev.datePublicationGreffe).toLocaleDateString('fr-MA')}</p>
                    {ev.dateAudience && (
                      <p className="text-xs text-slate-400">Audience: {new Date(ev.dateAudience).toLocaleDateString('fr-MA')}</p>
                    )}
                    {ev.confiance !== undefined && (
                      <p className="text-xs text-slate-300">{Math.round(ev.confiance * 100)}%</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
