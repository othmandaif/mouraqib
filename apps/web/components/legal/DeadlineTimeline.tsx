import { Card } from '@/components/ui/Card'
import { CalendarClock } from 'lucide-react'

interface Deadline {
  date: string
  label: string
  type: 'past' | 'today' | 'future' | 'critical'
}

interface DeadlineTimelineProps {
  deadlines: Deadline[]
  title?: string
}

const typeStyles = {
  past: 'bg-border',
  today: 'bg-accent h-4 w-4 ring-4 ring-accent-subtle',
  future: 'bg-border',
  critical: 'bg-danger h-4 w-4 ring-4 ring-danger-bg',
}

const dotStyles = {
  past: 'border-border',
  today: 'border-accent',
  future: 'border-border',
  critical: 'border-danger',
}

const lineStyles = {
  past: 'bg-border',
  today: 'bg-accent',
  future: 'bg-border',
  critical: 'bg-danger',
}

export function DeadlineTimeline({ deadlines, title = 'Échéances' }: DeadlineTimelineProps) {
  if (!deadlines || deadlines.length === 0) return null

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-5">
        <CalendarClock className="h-5 w-5 text-accent" />
        <h3 className="font-display text-xl font-semibold text-primary">{title}</h3>
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-0">
          {deadlines.map((dl, i) => (
            <div key={i} className="relative pl-10 pb-6 last:pb-0">
              <div
                className={`
                  absolute left-[7px] top-[3px] rounded-full border-2 bg-surface
                  ${typeStyles[dl.type]}
                  ${dotStyles[dl.type]}
                `}
              />
              {i < deadlines.length - 1 && (
                <div
                  className={`
                    absolute left-[11.5px] top-[22px] w-0.5 bottom-0
                    ${lineStyles[dl.type]}
                  `}
                  style={{ height: 'calc(100% - 20px)' }}
                />
              )}
              <div className="space-y-0.5">
                <span
                  className={`text-sm font-medium font-sans ${
                    dl.type === 'critical'
                      ? 'text-danger'
                      : dl.type === 'today'
                      ? 'text-accent'
                      : 'text-text-secondary'
                  }`}
                >
                  {dl.date}
                </span>
                <p
                  className={`text-sm font-sans ${
                    dl.type === 'critical'
                      ? 'text-danger font-medium'
                      : 'text-text-primary'
                  }`}
                >
                  {dl.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
