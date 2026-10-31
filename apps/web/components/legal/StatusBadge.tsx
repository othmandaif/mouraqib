import { Badge } from '@/components/ui/Badge'
import { t as tr } from '@/lib/langue'

type Status = 'en_cours' | 'nouveau' | 'audience' | 'critique' | 'clos'

interface StatusBadgeProps {
  status: Status
  className?: string
}

const STATUS_MAP: Record<Status, { label: string; variant: 'default' | 'accent' | 'success' | 'danger' | 'muted' }> = {
  en_cours: { label: tr('قيد المعالجة'), variant: 'default' },
  nouveau: { label: tr('جديد'), variant: 'accent' },
  audience: { label: tr('جلسة'), variant: 'success' },
  critique: { label: tr('عاجل'), variant: 'danger' },
  clos: { label: tr('مغلق'), variant: 'muted' },
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_MAP[status]
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}