import { Card } from '@/components/ui/Card'

interface InfoItem {
  label: string
  value: string
  arabic?: boolean
}

interface InfoGridProps {
  title?: string
  items: InfoItem[]
  columns?: 2 | 3
}

export function InfoGrid({ title, items, columns = 2 }: InfoGridProps) {
  return (
    <Card padding="md">
      {title && (
        <h3 className="font-display text-xl font-semibold text-primary mb-5">
          {title}
        </h3>
      )}
      <div
        className={`grid grid-cols-1 gap-x-8 gap-y-4 ${
          columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
      >
        {items.map((item, i) => (
          <div key={i} className="space-y-0.5">
            <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted">
              {item.label}
            </p>
            <p
              className={`text-sm font-sans text-text-primary ${
                item.arabic ? 'font-arabic text-base' : ''
              }`}
              dir={item.arabic ? 'rtl' : 'ltr'}
            >
              {item.value || '—'}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}
