'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { CheckCircle, CreditCard } from 'lucide-react'

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
    <div className="space-y-6">
      <PageHeader
        title="Abonnement"
        subtitle={`Plan actuel : ${currentPlan}`}
      />

      <div className="grid md:grid-cols-3 gap-6">
        {(plans ?? []).map((p) => {
          const isCurrent = p.plan === currentPlan
          return (
            <Card
              key={p.plan}
              padding="md"
              className={isCurrent ? 'border-accent' : ''}
            >
              {isCurrent && (
                <Badge variant="accent" className="mb-3">Plan actuel</Badge>
              )}

              <h3 className="font-display text-2xl font-bold text-primary mb-1">{p.plan}</h3>

              <div className="mb-5">
                {p.prix === 0 ? (
                  <span className="font-display text-3xl font-bold text-text-muted">Gratuit</span>
                ) : (
                  <span className="font-display text-3xl font-bold text-primary">
                    {p.prix}{' '}
                    <span className="text-base font-normal font-sans text-text-muted">DH/mois</span>
                  </span>
                )}
              </div>

              <Separator className="mb-4" />

              <ul className="space-y-2 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm font-sans text-text-secondary">
                    <CheckCircle className="h-4 w-4 text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleCheckout(p.plan)}
                disabled={isCurrent || p.prix === 0 || loading === p.plan}
                variant={isCurrent ? 'secondary' : 'primary'}
                loading={loading === p.plan}
                className="w-full"
              >
                {loading === p.plan
                  ? 'Redirection...'
                  : isCurrent
                  ? 'Plan actuel'
                  : p.prix === 0
                  ? 'Inclus'
                  : 'Choisir ce plan'}
              </Button>
            </Card>
          )
        })}
      </div>

      <p className="text-xs font-sans text-text-muted text-center flex items-center justify-center gap-1.5">
        <CreditCard className="h-3.5 w-3.5" />
        Paiement sécurisé par CMI — Cartes Visa, Mastercard, CMI
      </p>
    </div>
  )
}
