import { Card } from '@/components/ui/Card'
import { Link2 } from 'lucide-react'

interface DossierLie {
  numero: string
  tribunal?: string
  type?: string
  dateInscription?: string
}

interface RelatedFilesTableProps {
  dossiers: DossierLie[]
  title?: string
}

const val = (s?: string) => (s && s.trim() ? s.trim() : '—')

export function RelatedFilesTable({ dossiers, title = 'الملفات المرتبطة (ابتدائي/استئنافي-تبليغ/تنفيذ)' }: RelatedFilesTableProps) {
  if (!dossiers || dossiers.length === 0) return null

  return (
    <Card padding="md">
      <div dir="rtl">
        <div className="flex items-center gap-2 mb-5">
          <Link2 className="h-5 w-5 text-accent" />
          <h3 className="font-display text-xl font-semibold text-primary">{title}</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse font-arabic">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">نوع الملف</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">رقم الملف</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">تاريخ تسجيل الملف</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">المحكمة</th>
              </tr>
            </thead>
            <tbody>
              {dossiers.map((d, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 px-3 text-sm text-text-primary">{val(d.type)}</td>
                  <td className="py-2.5 px-3 text-sm font-semibold text-primary tabular-nums" dir="ltr">{val(d.numero)}</td>
                  <td className="py-2.5 px-3 text-sm text-text-secondary tabular-nums" dir="ltr">{val(d.dateInscription)}</td>
                  <td className="py-2.5 px-3 text-sm text-text-secondary">{val(d.tribunal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}