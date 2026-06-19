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
      <div dir="rtl">
        {title && (
          <h3 className="font-display text-xl font-semibold text-primary mb-5 text-right">
            {title}
          </h3>
        )}
        <div
          className={`grid grid-cols-1 gap-x-8 gap-y-4 ${
            columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
          }`}
        >
          {items.map((item, i) => (
            <div key={i} className="space-y-0.5 text-right">
              <p className="text-[11px] font-medium font-sans tracking-wide text-text-muted">
                {item.label}
              </p>
              <p className="text-base font-sans font-arabic text-text-primary">
                {item.value || '—'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}