import { Card } from '@/components/ui/Card'
import { Users } from 'lucide-react'
import { t as tr } from '@/lib/langue'

interface Partie {
  nom: string
  qualite: string
  // Compat ascendante : ancien champ unique
  conseil?: string
  // Colonnes réelles mahakim (optionnelles)
  avocats?: string
  delegues?: string
  agents?: string
  representants?: string
}

interface PartiesTableProps {
  parties: Partie[]
  title?: string
}

const val = (s?: string) => (s && s.trim() ? s.trim() : '—')

export function PartiesTable({ parties, title = tr('لائحة الأطراف') }: PartiesTableProps) {
  if (!parties || parties.length === 0) return null

  return (
    <Card padding="md">
      <div>
        <div className="flex items-center gap-2 mb-5">
          <Users className="h-5 w-5 text-accent" />
          <h3 className="font-display text-xl font-semibold text-primary">{title}</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse font-arabic">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">{tr('الصفة')}</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">{tr('اسم الطرف')}</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">{tr('المحامون')}</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">{tr('المفوضون القضائيون')}</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">{tr('الوكلاء')}</th>
                <th className="py-2 px-3 text-[11px] font-medium font-sans text-text-muted whitespace-nowrap">{tr('الممثلون القانونيون')}</th>
              </tr>
            </thead>
            <tbody>
              {parties.map((p, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 px-3 text-sm text-text-primary">{val(p.qualite)}</td>
                  <td className="py-2.5 px-3 text-sm font-medium text-text-primary">{val(p.nom)}</td>
                  <td className="py-2.5 px-3 text-sm text-text-secondary">{val(p.avocats ?? p.conseil)}</td>
                  <td className="py-2.5 px-3 text-sm text-text-secondary">{val(p.delegues)}</td>
                  <td className="py-2.5 px-3 text-sm text-text-secondary">{val(p.agents)}</td>
                  <td className="py-2.5 px-3 text-sm text-text-secondary">{val(p.representants)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}