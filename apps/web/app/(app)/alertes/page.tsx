'use client'

import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Alerte {
  id: string
  typeAlerte: string
  canal: string
  statut: string
  createdAt: string
  dossier?: { numeroDossier: string; tribunal: string }
}

const TYPE_LABEL: Record<string, string> = {
  NOUVEL_EVENEMENT: 'Nouvel événement',
  DELAI_CRITIQUE: 'Délai critique',
  DIGEST_QUOTIDIEN: 'Digest matinal',
  RENVOI_DETECTE: 'Renvoi détecté',
}

const STATUT_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  ENVOYE: 'success',
  EN_ATTENTE: 'warning',
  ECHEC: 'danger',
  IGNOREE: 'muted',
}

export default function AlertesPage() {
  const { data: alertes, loading } = useApi<Alerte[]>('/alertes')

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
        title="Historique des alertes"
        subtitle={`${alertes?.length ?? 0} alerte${(alertes?.length ?? 0) > 1 ? 's' : ''}`}
      />

      {(alertes?.length ?? 0) === 0 ? (
        <Card padding="lg" className="text-center">
          <div className="py-12">
            <p className="font-display text-xl text-text-muted">Aucune alerte envoyée pour l'instant</p>
            <p className="text-sm text-text-muted font-sans mt-2">
              Les alertes WhatsApp apparaîtront ici
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {alertes!.map((a) => (
            <Card key={a.id} padding="md">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-sans text-text-primary">
                    {TYPE_LABEL[a.typeAlerte] ?? a.typeAlerte}
                  </p>
                  {a.dossier && (
                    <p className="text-xs text-text-muted font-sans mt-0.5">
                      {a.dossier.numeroDossier} — {a.dossier.tribunal}
                    </p>
                  )}
                </div>
                <Badge variant={STATUT_VARIANT[a.statut] ?? 'default'}>
                  {a.statut}
                </Badge>
                <span className="text-xs text-text-muted font-sans shrink-0">{a.canal}</span>
                <span className="text-xs text-text-muted font-sans shrink-0">
                  {new Date(a.createdAt).toLocaleDateString('fr-MA')}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
