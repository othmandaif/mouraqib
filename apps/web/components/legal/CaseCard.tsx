'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, ArrowLeft, Building2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from './StatusBadge'

interface CaseCardProps {
  id: string
  dossierNumber: string
  tribunal: string
  typeAffaire?: string
  prochaineAudience?: string
  statut: 'en_cours' | 'nouveau' | 'audience' | 'critique' | 'clos'
  updatedAt: string
  daysUntilDeadline?: number
  deadlineLabel?: string
}

export function CaseCard({
  id,
  dossierNumber,
  tribunal,
  typeAffaire,
  prochaineAudience,
  statut,
  updatedAt,
  daysUntilDeadline,
  deadlineLabel,
}: CaseCardProps) {
  const deadlineCritical = daysUntilDeadline !== undefined && daysUntilDeadline <= 5

  return (
    <Link href={`/dossiers/${id}`}>
      <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
        <Card
          hover
          padding="md"
          className={`group relative overflow-hidden ${deadlineCritical ? 'border-r-2 border-r-danger' : ''}`}
        >
          <div dir="rtl">
            {/* En-tête : statut + date de mise à jour */}
            <div className="flex items-center justify-between mb-4">
              <StatusBadge status={statut} />
              <span className="text-[11px] text-text-muted tabular-nums" dir="ltr">
                {updatedAt}
              </span>
            </div>

            {/* Numéro de dossier — élément principal */}
            <p className="text-2xl font-bold text-primary tabular-nums tracking-tight mb-2" dir="ltr">
              {dossierNumber}
            </p>

            {/* Tribunal + objet */}
            <div className="space-y-1.5 mb-4">
              <div className="flex items-start gap-2 text-text-secondary">
                <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-accent/70" />
                <p className="text-sm leading-snug">{tribunal}</p>
              </div>
              {typeAffaire && (
                <p className="text-xs text-text-muted pr-6">{typeAffaire}</p>
              )}
            </div>

            {/* Pied : audience / délai + flèche */}
            <div className="flex items-center justify-between pt-3 border-t border-border-light">
              <div className="space-y-1 min-h-[1rem]">
                {prochaineAudience && (
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Clock className="h-3.5 w-3.5 text-accent" />
                    <span>الجلسة المقبلة: {prochaineAudience}</span>
                  </div>
                )}
                {daysUntilDeadline !== undefined && deadlineLabel && (
                  <div className={`text-xs font-medium ${deadlineCritical ? 'text-danger' : 'text-text-muted'}`}>
                    {deadlineLabel} — متبقٍّ {daysUntilDeadline} يوم
                  </div>
                )}
              </div>
              <ArrowLeft className="h-4 w-4 text-text-muted group-hover:text-accent group-hover:-translate-x-0.5 transition-all duration-150" />
            </div>
          </div>
        </Card>
      </motion.div>
    </Link>
  )
}