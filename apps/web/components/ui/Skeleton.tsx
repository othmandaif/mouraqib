interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  if (lines > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-4 bg-surface-alt rounded-sm animate-pulse ${className}`}
            style={{ width: `${100 - i * 15}%` }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={`h-4 bg-surface-alt rounded-sm animate-pulse ${className}`} />
  )
}
