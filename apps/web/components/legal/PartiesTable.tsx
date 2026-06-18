import { Card } from '@/components/ui/Card'
import { Separator } from '@/components/ui/Separator'
import { Users } from 'lucide-react'

interface Partie {
  nom: string
  qualite: string
  conseil?: string
}

interface PartiesTableProps {
  parties: Partie[]
  title?: string
}

export function PartiesTable({ parties, title = 'لائحة الأطراف' }: PartiesTableProps) {
  if (!parties || parties.length === 0) return null

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-5">
        <Users className="h-5 w-5 text-accent" />
        <h3 className="font-display text-xl font-semibold text-primary">{title}</h3>
      </div>

      <div className="space-y-0">
        {parties.map((partie, i) => (
          <div key={i}>
            {i > 0 && <Separator className="my-3" />}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted">
                  Nom
                </p>
                <p className="text-sm font-sans text-text-primary font-arabic text-base" dir="rtl">
                  {partie.nom}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted">
                  Qualité
                </p>
                <p className="text-sm font-sans text-text-primary font-arabic text-base" dir="rtl">
                  {partie.qualite}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted">
                  Conseil
                </p>
                <p className="text-sm font-sans text-text-secondary">
                  {partie.conseil || '—'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
