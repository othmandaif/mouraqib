'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Landmark, MapPin, CalendarDays, ListFilter, CircleDot, BarChart3, Gauge, Layers, PieChart, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { IconeRonde } from '@/components/ui/Visuels'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { t as tr } from '@/lib/langue'

// Statistiques du cabinet (anciennes cartes du tableau de bord, conservées et passées au style V2).
interface Overview {
  kpi: { dossiersActifs: number; dossiersArchives: number; delaisCritiques: number; delaisExpires: number }
  evenements: { semaine: number; evolutionPct: number | null; heatmap: number[] }
  procedures: { type: string; count: number }[]
  delais: { total: number; completsPct: number; expiresPct: number; actifs: number }
  statutFichiers: { actifs: number; archives: number; actifsPct: number; archivesPct: number }
  statutsIA?: { ouvert: number; enDelibere: number; clos: number; inconnu: number }
}

const PROC_AR: Record<string, string> = {
  CIVILE: tr('مدني'), PENALE: tr('جنائي'), COMMERCIALE: tr('تجاري'), ADMINISTRATIVE: tr('إداري'), TRAVAIL: tr('اجتماعي'), FAMILLE: tr('أسري'), REFERE: tr('استعجالي'),
}
const STATUT_AR: Record<string, string> = { OUVERT: tr('جارية'), EN_DELIBERE: tr('في المداولة'), CLOS: tr('منتهية'), INCONNU: tr('غير محددة') }
const JOURS_COURTS = [tr('أحد'), tr('إثنين'), tr('ثلاثاء'), tr('أربعاء'), tr('خميس'), tr('جمعة'), tr('سبت')]
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }
const H3: React.CSSProperties = { margin: 0, fontSize: 16, fontWeight: 600 }

export function StatsCabinet({ tribunauxLabels }: { tribunauxLabels: Record<string, string> }) {
  const [filtres, setFiltres] = useState<Record<string, string>>({})
  const [options, setOptions] = useState<{ tribunaux: string[]; annees: string[]; types: string[]; statuts: string[]; villes: string[] }>({ tribunaux: [], annees: [], types: [], statuts: [], villes: [] })
  const qs = useMemo(() => { const s = new URLSearchParams(Object.entries(filtres).filter(([, v]) => v)).toString(); return s ? `?${s}` : '' }, [filtres])
  const { data: ov } = useApi<Overview>(`/dashboard/overview${qs}`)

  useEffect(() => { apiFetch<typeof options>('/dashboard/filtres').then(setOptions).catch(() => {}) }, [])

  const nbFiltres = Object.values(filtres).filter(Boolean).length
  const heat = ov?.evenements.heatmap ?? [0, 0, 0, 0, 0, 0, 0]
  const jours = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return JOURS_COURTS[d.getDay()] }), [])
  const maxProc = Math.max(1, ...(ov?.procedures ?? []).map((p) => p.count))
  const gauge = ov?.delais.completsPct ?? 0
  const L = Math.PI * 90

  return (
    <section aria-labelledby="stats-h" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 id="stats-h" style={{ margin: 0, fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={BarChart3} taille={36} />{tr('إحصائيات المكتب')}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Filtre Icon={Landmark} label={tr('المحكمة')} v={filtres.tribunal} opts={options.tribunaux} labels={tribunauxLabels} on={(v) => setFiltres((f) => ({ ...f, tribunal: v }))} />
          <Filtre Icon={MapPin} label={tr('المدينة')} v={filtres.ville} opts={options.villes} on={(v) => setFiltres((f) => ({ ...f, ville: v }))} />
          <Filtre Icon={CalendarDays} label={tr('السنة')} v={filtres.annee} opts={options.annees} on={(v) => setFiltres((f) => ({ ...f, annee: v }))} />
          <Filtre Icon={ListFilter} label={tr('نوع المسطرة')} v={filtres.typeProcedure} opts={options.types} labels={PROC_AR} on={(v) => setFiltres((f) => ({ ...f, typeProcedure: v }))} />
          <Filtre Icon={CircleDot} label={tr('الحالة')} v={filtres.statut} opts={options.statuts} labels={STATUT_AR} on={(v) => setFiltres((f) => ({ ...f, statut: v }))} />
          {nbFiltres > 0 && (
            <button onClick={() => setFiltres({})} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: '#E3F0EC', color: '#0B4A40', border: 0, borderRadius: 999, padding: '0 14px', minHeight: 40, cursor: 'pointer' }}>
              <X size={14} aria-hidden />{' '}{tr('مسح (')}<span className="num">{nbFiltres}</span>)
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <div style={CARD}>
          <Titre Icon={Activity}>{tr('الأحداث · آخر')}{' '}<span className="num">7</span>{' '}{tr('أيام')}</Titre>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="num" style={{ fontSize: 32, fontWeight: 600 }}>{ov?.evenements.semaine ?? 0}</span>
            {ov?.evenements.evolutionPct != null && (
              <span style={{ fontSize: 13, fontWeight: 600, color: ov.evenements.evolutionPct >= 0 ? '#0B4A40' : '#9B2C20' }}>
                <span className="num">{ov.evenements.evolutionPct >= 0 ? '+' : ''}{ov.evenements.evolutionPct}%</span>{' '}{tr('عن الأسبوع الماضي')}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 6 }}>
            {heat.map((v, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <span className="num" style={{ width: '100%', height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, background: v === 0 ? '#F1EFEA' : v <= 2 ? '#E3F0EC' : v <= 5 ? '#9FC9BE' : '#0E5A4E', color: v > 5 ? '#FFFFFF' : '#15201E' }}>{v || ''}</span>
                <span style={{ fontSize: 12, color: '#5E6B67' }}>{jours[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={CARD}>
          <Titre Icon={Gauge}>{tr('مؤشر المتابعة')}</Titre>
          <div style={{ position: 'relative', margin: '0 auto', width: 210, height: 120 }}>
            <svg width="210" height="120" viewBox="0 0 210 120" aria-hidden>
              <path d="M15 110 A90 90 0 0 1 195 110" fill="none" stroke="#EEEAE1" strokeWidth="16" strokeLinecap="round" />
              <path d="M195 110 A90 90 0 0 0 15 110" fill="none" stroke="#0E5A4E" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${((gauge / 100) * L).toFixed(1)} ${L.toFixed(1)}`} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 22 }}>
              <span className="num" style={{ fontSize: 30, fontWeight: 600 }}>{gauge}%</span>
              <span style={{ fontSize: 12, color: '#5E6B67' }}>{tr('آجال منجزة')}</span>
            </div>
          </div>
          <Ligne label={tr('آجال متأخرة غير منجزة')} v={`${ov?.delais.expiresPct ?? 0}%`} />
          <Ligne label={tr('آجال حرجة حالياً')} v={ov?.kpi.delaisCritiques ?? 0} />
        </div>

        <div style={CARD}>
          <Titre Icon={Layers}>{tr('أنواع المساطر')}</Titre>
          {(ov?.procedures ?? []).length === 0 ? <span style={{ fontSize: 14, color: '#5E6B67' }}>{tr('لا توجد بيانات بعد.')}</span> : (ov?.procedures ?? []).slice(0, 5).map((p) => (
            <div key={p.type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#3B4A47', minWidth: 60 }}>{PROC_AR[p.type] ?? p.type}</span>
              <div style={{ flex: 1, height: 10, borderRadius: 999, background: '#EEEAE1' }}><div style={{ width: `${Math.round((p.count / maxProc) * 100)}%`, height: 10, borderRadius: 999, background: '#0E5A4E' }} /></div>
              <span className="num" style={{ fontSize: 13, fontWeight: 600, minWidth: 20 }}>{p.count}</span>
            </div>
          ))}
        </div>

        <div style={CARD}>
          <Titre Icon={PieChart}>{tr('حالة الملفات')}</Titre>
          <Ligne label={tr('قيد المتابعة')} v={<><span className="num">{ov?.kpi.dossiersActifs ?? 0}</span> · <span className="num">{ov?.statutFichiers.actifsPct ?? 0}%</span></>} />
          <Ligne label={tr('مؤرشفة')} v={<><span className="num">{ov?.kpi.dossiersArchives ?? 0}</span> · <span className="num">{ov?.statutFichiers.archivesPct ?? 0}%</span></>} />
          <h3 style={{ ...H3, marginTop: 6 }}>{tr('حالة القضايا (ذكاء اصطناعي)')}</h3>
          <Ligne label={tr('جارية')} v={ov?.statutsIA?.ouvert ?? 0} />
          <Ligne label={tr('في المداولة')} v={ov?.statutsIA?.enDelibere ?? 0} />
          <Ligne label={tr('منتهية')} v={ov?.statutsIA?.clos ?? 0} />
        </div>
      </div>
    </section>
  )
}

function Ligne({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14, borderTop: '1px solid #EEEAE1', paddingTop: 10 }}>
      <span style={{ color: '#3B4A47' }}>{label}</span>
      <span className="num" style={{ fontWeight: 600 }}>{v}</span>
    </div>
  )
}

function Titre({ Icon, children }: { Icon: LucideIcon; children: React.ReactNode }) {
  return <h3 style={{ ...H3, display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={Icon} taille={34} />{children}</h3>
}

function Filtre({ Icon, label, v, opts, on, labels }: { Icon: LucideIcon; label: string; v?: string; opts: string[]; on: (v: string) => void; labels?: Record<string, string> }) {
  return (
    <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span className="sr-only-ar">{label}</span>
      <Icon size={16} aria-hidden color={v ? '#0E5A4E' : '#5E6B67'} style={{ position: 'absolute', insetInlineStart: 12, pointerEvents: 'none' }} />
      <select value={v ?? ''} onChange={(e) => on(e.target.value)} style={{ fontFamily: 'inherit', fontSize: 14, minHeight: 42, borderRadius: 999, paddingBlock: 0, paddingInlineStart: 34, paddingInlineEnd: 14, border: `1px solid ${v ? '#0E5A4E' : '#E4E0D6'}`, background: v ? '#E3F0EC' : '#FFFFFF', color: '#15201E', fontWeight: v ? 600 : 500, cursor: 'pointer', boxShadow: '0 4px 14px -12px rgba(8,59,52,.5)' }}>
        <option value="">{label}</option>
        {opts.map((o) => <option key={o} value={o}>{labels?.[o] ?? o}</option>)}
      </select>
    </label>
  )
}
