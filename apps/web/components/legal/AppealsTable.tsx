import { Card } from '@/components/ui/Card'
import { FileText } from 'lucide-react'

interface Recours {
  type: string
  // Colonnes réelles mahakim (optionnelles)
  partie?: string
  dateDepot?: string
  numero?: string
  numeroEnvoi?: string
  dateEnvoi?: string
  tribunal?: string
  // Compat ascendante (anciens champs)
  date?: string
  statut?: string
  details?: string
}

interface AppealsTableProps {
  recours: Recours[]
  title?: string
}

const val = (s?: string) => (s && s.trim() ? s.trim() : '—')

export function AppealsTable({ recours, title = 'عرائض الطعن' }: AppealsTableProps) {
  if (!recours || recours.length === 0) return null

  return (
    <Card padding="md">
      <div dir="rtl">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="h-5 w-5 text-accent" />
          <h3 className="font-display text-xl font-semibold text-primary">{title}</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse font-arabic">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">تعرض/إستئناف/عريضة نقض</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">من طرف</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">تاريخ وضعه</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">رقمها</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">رقم الإرسال</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">تاريخ الإرسال</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">المحكمة</th>
              </tr>
            </thead>
            <tbody>
              {recours.map((r, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 px-3 text-sm text-text-primary">{val(r.type)}</td>
                  <td className="py-2.5 px-3 text-sm text-text-secondary">{val(r.partie)}</td>
                  <td className="py-2.5 px-3 text-sm text-text-secondary tabular-nums" dir="ltr">{val(r.dateDepot ?? r.date)}</td>
                  <td className="py-2.5 px-3 text-sm text-text-secondary tabular-nums" dir="ltr">{val(r.numero)}</td>
                  <td className="py-2.5 px-3 text-sm text-text-secondary tabular-nums" dir="ltr">{val(r.numeroEnvoi)}</td>
                  <td className="py-2.5 px-3 text-sm text-text-secondary tabular-nums" dir="ltr">{val(r.dateEnvoi)}</td>
                  <td className="py-2.5 px-3 text-sm text-text-secondary">{val(r.tribunal ?? r.statut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}