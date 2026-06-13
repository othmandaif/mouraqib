'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'

interface Plan {
  plan: string
  prix: number
  maxDossiers: number
  features: string[]
}

export default function AbonnementPage() {
  const { data: plans } = useApi<Plan[]>('/abonnements/plans')
  const { data: current } = useApi<{ abonnement: { plan: string } }>('/abonnements/current')
  const [loading, setLoading] = useState<string | null>(null)

  const handleCheckout = async (plan: string) => {
    if (plan === 'GRATUIT') return
    setLoading(plan)
    try {
      const data = await apiFetch<{ formHtml: string }>('/abonnements/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      })
      // Injecter le formulaire CMI et le soumettre
      const div = document.createElement('div')
      div.innerHTML = data.formHtml
      document.body.appendChild(div)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(null)
    }
  }

  const currentPlan = current?.abonnement?.plan ?? 'GRATUIT'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Abonnement</h1>
        <p className="text-slate-500 mt-1">Plan actuel : <strong>{currentPlan}</strong></p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {(plans ?? []).map((p) => {
          const isCurrent = p.plan === currentPlan
          return (
            <div key={p.plan} className={`rounded-2xl border p-6 ${isCurrent ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
              {isCurrent && <div className="text-blue-600 text-xs font-bold mb-2">✓ Plan actuel</div>}
              <h3 className="text-xl font-bold text-slate-900 mb-1">{p.plan}</h3>
              <div className="text-3xl font-bold text-slate-900 mb-4">
                {p.prix === 0 ? 'Gratuit' : <>{p.prix} <span className="text-base font-normal text-slate-500">DH/mois</span></>}
              </div>
              <ul className="space-y-2 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(p.plan)}
                disabled={isCurrent || p.prix === 0 || loading === p.plan}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  isCurrent || p.prix === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading === p.plan ? 'Redirection...' : isCurrent ? 'Plan actuel' : p.prix === 0 ? 'Inclus' : 'Choisir ce plan'}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Paiement sécurisé par CMI (Centre Monétique Interbancaire) · Cartes Visa, Mastercard, CMI
      </p>
    </div>
  )
}
