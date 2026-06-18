'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, ArrowRight } from 'lucide-react'
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
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <Card
          hover
          padding="md"
          className={`
            group relative
            ${deadlineCritical ? 'border-l-2 border-l-danger' : ''}
          `}
        >
          <div className="flex items-start justify-between mb-3">
            <StatusBadge status={statut} />
            <span className="text-[11px] text-text-muted font-sans">
              {updatedAt}
            </span>
          </div>

          <div className="space-y-1 mb-4">
            <p className="font-display text-xl font-semibold text-primary tracking-tight">
              {dossierNumber}
            </p>
            <p className="text-sm text-text-secondary font-sans">{tribunal}</p>
            {typeAffaire && (
              <p className="text-xs text-text-muted font-sans">{typeAffaire}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {prochaineAudience && (
                <div className="flex items-center gap-1.5 text-xs text-text-secondary font-sans">
                  <Clock className="h-3 w-3 text-accent" />
                  {prochaineAudience}
                </div>
              )}
              {daysUntilDeadline !== undefined && deadlineLabel && (
                <div
                  className={`text-xs font-medium font-sans ${
                    deadlineCritical ? 'text-danger' : 'text-text-muted'
                  }`}
                >
                  {deadlineLabel} J-{daysUntilDeadline}
                </div>
              )}
            </div>

            <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent transition-colors duration-150" />
          </div>
        </Card>
      </motion.div>
    </Link>
  )
}
