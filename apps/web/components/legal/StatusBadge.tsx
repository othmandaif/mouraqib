import { Badge } from '@/components/ui/Badge'

type Status = 'en_cours' | 'nouveau' | 'audience' | 'critique' | 'clos'

interface StatusBadgeProps {
  status: Status
  className?: string
}

const STATUS_MAP: Record<Status, { label: string; variant: 'default' | 'accent' | 'success' | 'danger' | 'muted' }> = {
  en_cours: { label: 'قيد المعالجة', variant: 'default' },
  nouveau: { label: 'جديد', variant: 'accent' },
  audience: { label: 'جلسة', variant: 'success' },
  critique: { label: 'عاجل', variant: 'danger' },
  clos: { label: 'مغلق', variant: 'muted' },
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_MAP[status]
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}