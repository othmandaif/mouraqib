interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="pb-6 mb-6 border-b border-border">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold text-primary leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-text-muted font-sans">{subtitle}</p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-2 shrink-0">{children}</div>
        )}
      </div>
    </div>
  )
}
