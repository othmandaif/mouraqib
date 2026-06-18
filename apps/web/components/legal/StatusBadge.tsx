import { Badge } from '@/components/ui/Badge'

type Status = 'en_cours' | 'nouveau' | 'audience' | 'critique' | 'clos'

interface StatusBadgeProps {
  status: Status
  className?: string
}

const STATUS_MAP: Record<Status, { label: string; variant: 'default' | 'accent' | 'success' | 'danger' | 'muted' }> = {
  en_cours: { label: 'En cours', variant: 'default' },
  nouveau: { label: 'Nouveau', variant: 'accent' },
  audience: { label: 'Audience', variant: 'success' },
  critique: { label: 'Urgent', variant: 'danger' },
  clos: { label: 'Clos', variant: 'muted' },
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_MAP[status]
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
