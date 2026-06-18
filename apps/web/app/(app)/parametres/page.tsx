'use client'

import Link from 'next/link'
import { Settings, CreditCard, Smartphone } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'

export default function ParametresPage() {
  const { user } = useAuth()
  const { data: abonnement } = useApi<{ abonnement: { plan: string; dateFin: string }; dossierCount: number }>('/abonnements/current')

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Paramètres" />

      <Card padding="md">
        <div className="flex items-center gap-3 mb-5">
          <Settings className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-semibold text-primary">Mon profil</h2>
        </div>
        <div className="space-y-3">
          <Row label="Nom" value={`Maître ${user?.prenom} ${user?.nom}`} />
          <Separator />
          <Row label="Email" value={user?.email ?? '—'} />
          <Separator />
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-sans text-text-muted">WhatsApp</span>
            <span className="text-sm font-sans">
              {user?.whatsappVerifie ? (
                <Badge variant="success">Vérifié</Badge>
              ) : (
                <Link href="/parametres/whatsapp" className="text-warning hover:text-warning/80 font-medium transition-colors">
                  Non vérifié — Configurer
                </Link>
              )}
            </span>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <div className="flex items-center gap-3 mb-5">
          <CreditCard className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-semibold text-primary">Abonnement</h2>
        </div>
        <div className="space-y-3 mb-4">
          <Row
            label="Plan actuel"
            value={abonnement?.abonnement?.plan ?? 'GRATUIT'}
          />
          <Separator />
          <Row
            label="Dossiers utilisés"
            value={`${abonnement?.dossierCount ?? 0}`}
          />
          {abonnement?.abonnement?.dateFin && (
            <>
              <Separator />
              <Row
                label="Renouvellement"
                value={new Date(abonnement.abonnement.dateFin).toLocaleDateString('fr-MA')}
              />
            </>
          )}
        </div>
        <Link href="/abonnement">
          <Button variant="secondary" size="sm">Changer de plan</Button>
        </Link>
      </Card>

      <Card padding="md">
        <div className="flex items-center gap-3 mb-3">
          <Smartphone className="h-5 w-5 text-accent" />
          <h2 className="font-display text-xl font-semibold text-primary">Alertes WhatsApp</h2>
        </div>
        <p className="text-sm text-text-muted font-sans mb-4">
          Vérifiez votre numéro WhatsApp pour recevoir les alertes judiciaires.
        </p>
        <Link href="/parametres/whatsapp">
          <Button variant="secondary" size="sm">Configurer WhatsApp</Button>
        </Link>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-sans text-text-muted">{label}</span>
      <span className="text-sm font-sans font-medium text-text-primary">{value}</span>
    </div>
  )
}
