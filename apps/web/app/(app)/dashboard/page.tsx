'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { FolderOpen, AlertTriangle, Scale, Activity, ArrowRight, Clock } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Separator } from '@/components/ui/Separator'

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

export default function DashboardPage() {
  const { data: echeances, loading: loadE } = useApi<Echeance[]>('/echeances/critiques')
  const { data: dossiers, loading: loadD } = useApi<Dossier[]>('/dossiers')

  const loading = loadE || loadD
  const critiquesCount = echeances?.length ?? 0
  const dossiersCount = dossiers?.length ?? 0

  const joursRestants = (dateLimite: string) =>
    Math.ceil((new Date(dateLimite).getTime() - Date.now()) / 86_400_000)

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} padding="md">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre activité judiciaire"
      />

      {/* Alerte urgente */}
      {critiquesCount > 0 && (
        <motion.div variants={itemVariants}>
          <Card padding="md" className="border-danger/30 bg-danger-bg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-danger shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-danger font-sans">
                  {critiquesCount} délai{critiquesCount > 1 ? 's' : ''} critique{critiquesCount > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-danger font-sans">Vérifiez vos échéances immédiatement</p>
              </div>
              <Link
                href="/echeances"
                className="shrink-0 text-sm font-medium text-danger hover:text-danger/80 font-sans inline-flex items-center gap-1"
              >
                Voir <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>
        </motion.div>
      )}

      {/* KPI Cards */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          {
            icon: FolderOpen,
            label: 'Dossiers actifs',
            value: dossiersCount,
            variant: 'default' as const,
          },
          {
            icon: AlertTriangle,
            label: 'Délais critiques',
            value: critiquesCount,
            variant: critiquesCount > 0 ? 'danger' as const : 'default' as const,
          },
          {
            icon: Activity,
            label: 'Événements récents',
            value: dossiers?.reduce((sum, d) => sum + d._count.evenements, 0) ?? 0,
            variant: 'default' as const,
          },
          {
            icon: Clock,
            label: 'Dernière mise à jour',
            value: 'Aujourd\'hui',
            variant: 'default' as const,
          },
        ].map((kpi) => (
          <motion.div key={kpi.label} variants={itemVariants}>
            <Card padding="md" className={kpi.variant === 'danger' ? 'border-danger/30 bg-danger-bg' : ''}>
              <div className="space-y-2">
                <kpi.icon
                  className={`h-5 w-5 ${
                    kpi.variant === 'danger' ? 'text-danger' : 'text-accent'
                  }`}
                />
                <p
                  className={`font-display text-2xl font-bold ${
                    kpi.variant === 'danger' ? 'text-danger' : 'text-primary'
                  }`}
                >
                  {kpi.value}
                </p>
                <p className="text-xs font-sans text-text-muted tracking-wide uppercase">
                  {kpi.label}
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Délais imminents */}
      {critiquesCount > 0 && (
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-primary flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger" />
              Délais imminents
            </h2>
            <Link href="/echeances" className="text-sm text-accent hover:text-accent-light font-sans transition-colors">
              Voir tous →
            </Link>
          </div>
          <div className="space-y-2">
            {echeances!.map((e) => {
              const j = joursRestants(e.dateLimite)
              return (
                <Card key={e.id} padding="md" className={j <= 1 ? 'border-danger/30 bg-danger-bg' : 'border-border'}>
                  <div className="flex items-center gap-4">
                    <div
                      className={`
                        shrink-0 h-10 w-10 rounded-sm flex items-center justify-center text-xs font-bold font-sans
                        ${j <= 1 ? 'bg-danger text-white' : j <= 3 ? 'bg-warning text-white' : 'bg-accent-subtle text-accent'}
                      `}
                    >
                      J-{j}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-sans text-text-primary">{e.description}</p>
                      <p className="text-xs text-text-muted font-sans mt-0.5">
                        {e.dossier.numeroDossier} — {e.dossier.tribunal}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-sans text-text-secondary">
                        {new Date(e.dateLimite).toLocaleDateString('fr-MA')}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* Dossiers récents */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-primary flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-accent" />
            Mes dossiers
          </h2>
          {dossiersCount > 0 && (
            <Link href="/dossiers" className="text-sm text-accent hover:text-accent-light font-sans transition-colors">
              Voir tous →
            </Link>
          )}
        </div>

        {dossiersCount === 0 ? (
          <Card padding="lg" className="text-center">
            <div className="py-10">
              <Scale className="h-12 w-12 text-border mx-auto mb-4" />
              <p className="font-display text-xl text-text-muted mb-1">Aucun dossier surveillé</p>
              <p className="text-sm text-text-muted font-sans mb-6">
                Ajoutez votre premier dossier pour commencer
              </p>
              <Link href="/dossiers">
                <Button>
                  <FolderOpen className="h-4 w-4" />
                  Ajouter un dossier
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {dossiers!.slice(0, 4).map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/dossiers/${d.id}`}>
                  <Card hover padding="md">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-display text-lg font-semibold text-primary">
                        {d.numeroDossier}
                      </p>
                      {d.echeances.length > 0 && (
                        <Badge variant="danger">
                          {d.echeances.length} délai{d.echeances.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-sans text-text-secondary">{d.tribunal}</p>
                    {d.titreAffaire && (
                      <p className="text-xs text-text-muted font-sans mt-1 truncate">{d.titreAffaire}</p>
                    )}
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between text-xs text-text-muted font-sans">
                      <span>{d._count.evenements} événement{d._count.evenements > 1 ? 's' : ''}</span>
                      <span>{new Date(d.updatedAt).toLocaleDateString('fr-MA')}</span>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>
    </motion.div>
  )
}
