'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Activity } from 'lucide-react'

interface Event {
  date: string
  time?: string
  titreAr: string
  titreFr?: string
  isNew?: boolean
}

interface EventsTimelineProps {
  events: Event[]
  title?: string
}

export function EventsTimeline({ events, title = 'لائحة الإجراءات' }: EventsTimelineProps) {
  if (!events || events.length === 0) return null

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="h-5 w-5 text-accent" />
        <h3 className="font-display text-xl font-semibold text-primary">{title}</h3>
      </div>

      <div className="relative">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-0">
          {events.map((event, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className={`
                relative pl-8 pb-5 last:pb-0
                ${event.isNew ? 'bg-accent-subtle/30 -mx-4 px-4 rounded-sm' : ''}
              `}
            >
              <div
                className={`
                  absolute left-[5px] top-[5px] h-3.5 w-3.5 rounded-full border-2 bg-surface
                  ${event.isNew ? 'border-accent' : 'border-border'}
                `}
              />
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs font-medium font-sans text-text-secondary">
                  {event.date}
                  {event.time ? ` — ${event.time}` : ''}
                </span>
                {event.isNew && (
                  <span className="text-[10px] font-medium font-sans uppercase tracking-wider text-accent">
                    Nouveau
                  </span>
                )}
              </div>
              <p className="font-arabic text-sm text-text-primary" dir="rtl">
                {event.titreAr}
              </p>
              {event.titreFr && (
                <p className="text-xs text-text-muted font-sans mt-0.5">
                  {event.titreFr}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  )
}
