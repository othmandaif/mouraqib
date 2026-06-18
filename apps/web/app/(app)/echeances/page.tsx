'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-surface-alt rounded-sm w-40" />
          <div className="h-4 bg-surface-alt rounded-sm w-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Échéances"
        subtitle={`${echeances?.length ?? 0} délai${(echeances?.length ?? 0) > 1 ? 's' : ''} en cours`}
      />

      {(echeances?.length ?? 0) === 0 ? (
        <Card padding="lg" className="text-center">
          <div className="py-12">
            <p className="font-display text-xl text-text-muted">✅ Aucune échéance en cours</p>
            <p className="text-sm text-text-muted font-sans mt-2">
              Les délais calculés automatiquement apparaîtront ici
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.urgent.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-danger mb-4">
                Urgents — moins de 3 jours ({groups.urgent.length})
              </h2>
              <div className="space-y-2">
                {groups.urgent.map((e) => (
                  <EcheanceCard key={e.id} e={e} onComplete={handleComplete} />
                ))}
              </div>
            </section>
          )}

          {groups.soon.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-warning mb-4">
                Prochainement — 4 à 7 jours ({groups.soon.length})
              </h2>
              <div className="space-y-2">
                {groups.soon.map((e) => (
                  <EcheanceCard key={e.id} e={e} onComplete={handleComplete} />
                ))}
              </div>
            </section>
          )}

          {groups.later.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-text-secondary mb-4">
                À venir — plus de 7 jours ({groups.later.length})
              </h2>
              <div className="space-y-2">
                {groups.later.map((e) => (
                  <EcheanceCard key={e.id} e={e} onComplete={handleComplete} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function EcheanceCard({ e, onComplete }: { e: Echeance; onComplete: (id: string) => void }) {
  const j = Math.ceil((new Date(e.dateLimite).getTime() - Date.now()) / 86_400_000)
  const isUrgent = j <= 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        padding="md"
        className={
          j <= 1
            ? 'border-danger/30 bg-danger-bg'
            : j <= 3
            ? 'border-warning/30 bg-warning-bg'
            : ''
        }
      >
        <div className="flex items-center gap-4">
          <div
            className={`
              shrink-0 h-12 w-12 rounded-sm flex flex-col items-center justify-center
              ${j <= 1 ? 'bg-danger text-white' : isUrgent ? 'bg-warning text-white' : 'bg-surface-alt text-text-secondary'}
            `}
          >
            <span className="text-xs font-bold font-sans leading-none">J</span>
            <span className="text-lg font-bold font-sans leading-tight">{j}</span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium font-sans text-text-primary">{e.description}</p>
            <Link
              href={`/dossiers/${e.dossier.numeroDossier}`}
              className="text-xs font-sans text-text-muted hover:text-accent transition-colors"
            >
              {e.dossier.numeroDossier} — {e.dossier.tribunal}
            </Link>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-xs font-sans text-text-secondary flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(e.dateLimite).toLocaleDateString('fr-MA')}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onComplete(e.id)}
            className="shrink-0 text-success hover:text-success hover:bg-success-bg"
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}
