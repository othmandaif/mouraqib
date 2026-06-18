import { Card } from '@/components/ui/Card'
import { Separator } from '@/components/ui/Separator'
import { FileText } from 'lucide-react'

interface Recours {
  type: string
  date?: string
  statut?: string
  details?: string
}

interface AppealsTableProps {
  recours: Recours[]
  title?: string
}

export function AppealsTable({ recours, title = 'عرائض الطعن' }: AppealsTableProps) {
  if (!recours || recours.length === 0) return null

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-5">
        <FileText className="h-5 w-5 text-accent" />
        <h3 className="font-display text-xl font-semibold text-primary">{title}</h3>
      </div>

      <div className="space-y-0">
        {recours.map((r, i) => (
          <div key={i}>
            {i > 0 && <Separator className="my-3" />}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted">
                  Type
                </p>
                <p className="text-sm font-sans text-text-primary font-arabic text-base" dir="rtl">
                  {r.type}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted">
                  Date
                </p>
                <p className="text-sm font-sans text-text-secondary">{r.date || '—'}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted">
                  Statut
                </p>
                <p className="text-sm font-sans text-text-secondary">{r.statut || '—'}</p>
              </div>
            </div>
            {r.details && (
              <p className="mt-2 text-xs text-text-muted font-sans">{r.details}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
