'use client'

import { use } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { Skeleton } from '@/components/ui/Skeleton'
import { InfoGrid } from '@/components/legal/InfoGrid'
import { EventsTimeline } from '@/components/legal/EventsTimeline'
import { PartiesTable } from '@/components/legal/PartiesTable'
import { AppealsTable } from '@/components/legal/AppealsTable'
import { RelatedFilesTable } from '@/components/legal/RelatedFilesTable'
import { DeadlineTimeline } from '@/components/legal/DeadlineTimeline'

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
  rawData?: {
    infosCarte: Record<string, string> | null
    parties: { qualite: string; nom: string; avocats: string; delegues: string; agents: string; representants: string }[]
    expertises: string[]
    recours: { type: string; partie: string; dateDepot: string; numero: string; numeroEnvoi: string; dateEnvoi: string; tribunal: string }[]
    dossiersLies: { type: string; numeroDossier: string; dateInscription: string; tribunal: string }[]
  }
}

export default function DossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: dossier, loading, refetch } = useApi<DossierDetail>(`/dossiers/${id}`)

  const joursRestants = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)

  const handleComplete = async (echeanceId: string) => {
    await apiFetch(`/echeances/${echeanceId}/complete`, { method: 'PATCH' }).catch(() => {})
    refetch()
  }

  const handleScrape = async () => {
    await apiFetch(`/dossiers/${id}/scraper`, { method: 'POST' }).catch(() => {})
    refetch()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  if (!dossier) {
    return (
      <Card padding="lg" className="text-center">
        <div className="py-12">
          <p className="font-display text-2xl text-text-muted">Dossier non trouvé</p>
        </div>
      </Card>
    )
  }

  const infoItems = dossier.rawData?.infosCarte
    ? Object.entries(dossier.rawData.infosCarte).map(([label, value]) => ({
        label,
        value: value || '—',
        arabic: true,
      }))
    : []

  const events = dossier.evenements.map((ev) => ({
    date: new Date(ev.datePublicationGreffe).toLocaleDateString('fr-MA'),
    time: ev.dateAudience
      ? new Date(ev.dateAudience).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })
      : undefined,
    titreAr: ev.texteArabe,
    titreFr: ev.typeEvenement || undefined,
    isNew: ev.estNouvel,
  }))

  const deadlines = dossier.echeances.map((e) => {
    const j = joursRestants(e.dateLimite)
    let type: 'past' | 'today' | 'future' | 'critical'
    if (j <= 0) type = 'past'
    else if (j <= 3) type = 'critical'
    else if (j <= 7) type = 'today'
    else type = 'future'

    return {
      date: new Date(e.dateLimite).toLocaleDateString('fr-MA'),
      label: e.description,
      type,
    }
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <Link
          href="/dossiers"
          className="inline-flex items-center gap-1.5 text-sm font-sans text-text-muted hover:text-text-secondary transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Mes dossiers
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-primary leading-tight">
              {dossier.numeroDossier}
            </h1>
            <p className="text-sm text-text-secondary font-sans mt-1">
              {dossier.tribunal}
              <span className="text-text-muted mx-2">·</span>
              {dossier.typeProcedure}
            </p>
            {dossier.titreAffaire && (
              <p className="text-sm text-text-muted font-sans mt-0.5">{dossier.titreAffaire}</p>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={handleScrape}>
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </Button>
        </div>
        <Separator className="mt-4" />
      </div>

      {/* Échéances */}
      {dossier.echeances.length > 0 && (
        <DeadlineTimeline deadlines={deadlines} />
      )}

      {/* بطاقة الملف */}
      {infoItems.length > 0 && (
        <InfoGrid title="بطاقة الملف" items={infoItems} columns={3} />
      )}

      {/* لائحة الأطراف */}
      {dossier.rawData?.parties && dossier.rawData.parties.length > 0 && (
        <PartiesTable
          parties={dossier.rawData.parties.map((p) => ({
            nom: p.nom,
            qualite: p.qualite,
            conseil: p.avocats || p.delegues || p.agents || p.representants || undefined,
          }))}
        />
      )}

      {/* لائحة الخبرات */}
      {dossier.rawData?.expertises && dossier.rawData.expertises.length > 0 && (
        <Card padding="md">
          <h3 className="font-display text-xl font-semibold text-primary mb-3" dir="rtl">لائحة الخبرات</h3>
          <div className="space-y-2">
            {dossier.rawData.expertises.map((exp, i) => (
              <div key={i} className="rounded-sm bg-surface-alt p-3">
                <p className="text-sm font-sans text-text-primary font-arabic text-base" dir="rtl">{exp}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* عرائض الطعن */}
      {dossier.rawData?.recours && dossier.rawData.recours.length > 0 && (
        <AppealsTable
          recours={dossier.rawData.recours.map((r) => ({
            type: r.type,
            date: r.dateDepot || r.dateEnvoi || undefined,
            statut: r.tribunal || undefined,
            details: `Partie: ${r.partie || '—'} · N°: ${r.numero || '—'}`,
          }))}
        />
      )}

      {/* الملفات المرتبطة */}
      {dossier.rawData?.dossiersLies && dossier.rawData.dossiersLies.length > 0 && (
        <RelatedFilesTable
          dossiers={dossier.rawData.dossiersLies.map((d) => ({
            numero: d.numeroDossier,
            tribunal: d.tribunal,
            type: d.type,
          }))}
        />
      )}

      {/* Événements */}
      <section>
        <h2 className="font-display text-xl font-semibold text-primary mb-4">
          Historique des événements
        </h2>
        {dossier.evenements.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-text-muted font-sans">
              Aucun événement détecté — scraping en cours...
            </p>
          </Card>
        ) : (
          <EventsTimeline events={events} title="لائحة الإجراءات" />
        )}
      </section>
    </motion.div>
  )
}
