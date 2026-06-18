import { Card } from '@/components/ui/Card'
import { Separator } from '@/components/ui/Separator'
import { Link2 } from 'lucide-react'

interface DossierLie {
  numero: string
  tribunal?: string
  type?: string
}

interface RelatedFilesTableProps {
  dossiers: DossierLie[]
  title?: string
}

export function RelatedFilesTable({ dossiers, title = 'الملفات المرتبطة' }: RelatedFilesTableProps) {
  if (!dossiers || dossiers.length === 0) return null

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-5">
        <Link2 className="h-5 w-5 text-accent" />
        <h3 className="font-display text-xl font-semibold text-primary">{title}</h3>
      </div>

      <div className="space-y-0">
        {dossiers.map((d, i) => (
          <div key={i}>
            {i > 0 && <Separator className="my-3" />}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-0.5">
                <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted">
                  N° dossier
                </p>
                <p
                  className="text-sm font-semibold font-sans text-primary font-arabic text-base"
                  dir="rtl"
                >
                  {d.numero}
                </p>
              </div>
              {d.tribunal && (
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted">
                    Tribunal
                  </p>
                  <p className="text-sm font-sans text-text-secondary font-arabic text-base" dir="rtl">
                    {d.tribunal}
                  </p>
                </div>
              )}
              {d.type && (
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted">
                    Type
                  </p>
                  <p className="text-sm font-sans text-text-secondary">{d.type}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
