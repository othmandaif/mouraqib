type BadgeVariant = 'default' | 'accent' | 'success' | 'danger' | 'warning' | 'muted'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white text-text-secondary border-border',
  accent: 'bg-accent-subtle text-accent border-accent/30',
  success: 'bg-success-bg text-success border-success/30',
  danger: 'bg-danger-bg text-danger border-danger/30',
  warning: 'bg-warning-bg text-warning border-warning/30',
  muted: 'bg-surface-alt text-text-muted border-border',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-sm px-2 py-0.5
        text-[11px] font-medium font-sans tracking-wide uppercase
        border
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
