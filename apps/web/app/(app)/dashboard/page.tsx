'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Archive, FolderOpen, AlertTriangle, BarChart3, Users2,
  Clock, Gauge, Activity, Filter, X,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useTribunaux } from '@/hooks/useTribunaux'

interface Overview {
  kpi: { dossiersActifs: number; dossiersArchives: number; delaisCritiques: number; evenementsAujourdhui: number; renvoisCetteSemaine: number; dossiersDormants: number; audiencesSemaine: number; delaisExpires: number }
  evenements: { semaine: number; evolutionPct: number | null; heatmap: number[] }
  procedures: { type: string; count: number }[]
  delais: { total: number; completsPct: number; expiresPct: number; actifs: number }
  statutFichiers: { actifs: number; archives: number; actifsPct: number; archivesPct: number }
  statutsIA?: { ouvert: number; enDelibere: number; clos: number; inconnu: number }
  parTribunal?: { tribunal: string; count: number }[]
}
interface Dossier {
  id: string
  numeroDossier: string
  tribunal: string
  titreAffaire?: string
  echeances: { id: string }[]
  _count: { evenements: number }
  updatedAt: string
}

// Libellés arabes des types de procédure (enum Prisma)
const PROC_AR: Record<string, string> = {
  CIVILE: 'مدني', PENALE: 'جنائي', COMMERCIALE: 'تجاري',
  ADMINISTRATIVE: 'إداري', TRAVAIL: 'اجتماعي', FAMILLE: 'أسري', REFERE: 'استعجالي',
}

const STATUT_AR: Record<string, string> = {
  OUVERT: 'جارية', EN_DELIBERE: 'في المداولة', CLOS: 'منتهية', INCONNU: 'غير محددة',
}

const C = {
  card: '#fff',
  ink: '#2C2A24', ink2: '#3A3322', label: '#5B5544', muted: '#A39C8B', faint: '#BDB6A4',
  goldD: '#9A7820', goldM: '#CBAE55', goldSoft: '#E7D9A6', goldPale: '#EFE6C8', goldChip: '#F4EFDF',
  green: '#3F9E6B', greenBg: '#E6F3EB', red: '#DB6A52', redBg: '#FCE8E2', warn: '#B8860B', warnBg: '#FBF6E9', border: '#EEE7D6',
}
const heatPal: Record<number, string> = { 0: '#F7F1E1', 1: '#EFE6C8', 2: '#F2D7C2', 3: '#E2C77C', 4: '#D9C06A' }

export default function DashboardPage() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isNarrow = useMediaQuery('(max-width: 1100px)')

  // Filtres combinés
  const [filtres, setFiltres] = useState<Record<string, string>>({})
  const [options, setOptions] = useState<{ tribunaux: string[]; annees: string[]; types: string[]; statuts: string[]; villes: string[] }>({ tribunaux: [], annees: [], types: [], statuts: [], villes: [] })

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    Object.entries(filtres).forEach(([k, v]) => { if (v) p.set(k, v) })
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [filtres])

  const { data: ov } = useApi<Overview>(`/dashboard/overview${queryString}`)
  const { tribunalAr, map: tribunauxMap } = useTribunaux()
  // Map { code: nomAr } pour les libellés du filtre tribunal
  const tribunauxLabels = useMemo(() => {
    const m: Record<string, string> = {}
    Object.entries(tribunauxMap || {}).forEach(([code, info]: any) => { m[code] = info.nomAr })
    return m
  }, [tribunauxMap])
  const { data: dossiers } = useApi<Dossier[]>('/dossiers')

  // Charger les options de filtres une fois
  useEffect(() => {
    const tok = typeof window !== 'undefined' ? localStorage.getItem('mouraqib_token') : ''
    fetch('/api/dashboard/filtres', { headers: { Authorization: `Bearer ${tok}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setOptions(d) })
      .catch(() => {})
  }, [])

  const setFiltre = (cle: string, val: string) => setFiltres((f) => ({ ...f, [cle]: val }))
  const resetFiltres = () => setFiltres({})
  const nbFiltresActifs = Object.values(filtres).filter(Boolean).length

  const actifs = ov?.kpi.dossiersActifs ?? 0
  const archives = ov?.kpi.dossiersArchives ?? 0
  const critiques = ov?.kpi.delaisCritiques ?? 0
  const evenementsJour = ov?.kpi.evenementsAujourdhui ?? 0
  const evtSemaine = ov?.evenements.semaine ?? 0
  const evolutionPct = ov?.evenements.evolutionPct ?? null

  const derniersDossiers = useMemo(() =>
    [...(dossiers ?? [])].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
  [dossiers])

  // Jauge : % d'achèvement des délais (réel)
  const gaugePct = ov?.delais.completsPct ?? 0
  const gaugeLen = Math.PI * 90
  const gaugeOn = (gaugePct / 100) * gaugeLen

  // Heatmap réelle : 7 valeurs (J-6 → aujourd'hui). On colore par paliers.
  const heat = ov?.evenements.heatmap ?? [0, 0, 0, 0, 0, 0, 0]
  const heatLevel = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n <= 6 ? 3 : 4)
  // Jours réels : index 0 = il y a 6 jours … 6 = aujourd'hui
  const joursLabels = useMemo(() => {
    const names = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    const today = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (6 - i))
      return names[d.getDay()]
    })
  }, [])

  const procedures = ov?.procedures ?? []
  const maxProc = Math.max(1, ...procedures.map((p) => p.count))

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 22, direction: 'rtl' }}>

      {/* BARRE DE FILTRES */}
      <div style={{ background: C.card, borderRadius: 18, padding: isMobile ? '14px' : '16px 20px', boxShadow: '0 14px 34px -26px rgba(110,90,30,.4)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} stroke={C.goldD} /> تصفية
        </span>
        <FilterSelect label="المحكمة" value={filtres.tribunal || ''} options={options.tribunaux} labels={tribunauxLabels} onChange={(v) => setFiltre('tribunal', v)} />
        <FilterSelect label="المدينة" value={filtres.ville || ''} options={options.villes} onChange={(v) => setFiltre('ville', v)} />
        <FilterSelect label="السنة" value={filtres.annee || ''} options={options.annees} onChange={(v) => setFiltre('annee', v)} />
        <FilterSelect label="نوع المسطرة" value={filtres.typeProcedure || ''} options={options.types} labels={PROC_AR} onChange={(v) => setFiltre('typeProcedure', v)} />
        <FilterSelect label="الحالة" value={filtres.statut || ''} options={options.statuts} labels={STATUT_AR} onChange={(v) => setFiltre('statut', v)} />
        {nbFiltresActifs > 0 && (
          <button onClick={resetFiltres} style={{ border: `1px solid ${C.border}`, background: C.goldChip, borderRadius: 9, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, color: C.goldD, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <X size={13} /> مسح ({nbFiltresActifs})
          </button>
        )}
      </div>

      {/* KPI ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 14 : 22 }}>
        <KpiCard title="الملفات المؤرشفة" value={archives} icon={<Archive size={15} stroke={C.goldD} />} note="ملف مؤرشف" />
        <KpiCard title="الملفات النشطة" value={actifs} icon={<FolderOpen size={15} stroke={C.goldD} />} note={`${evenementsJour} حدث اليوم`} />
        <KpiCard title="الآجال الحرجة" value={critiques} icon={<AlertTriangle size={15} stroke={C.red} />} iconBg={C.redBg} note={critiques > 0 ? 'تتطلب انتباهك' : 'لا شيء عاجل'} />
      </div>

      {/* KPI ROW 2 — calculés */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', gap: isMobile ? 14 : 22 }}>
        <KpiCard title="جلسات هذا الأسبوع" value={ov?.kpi.audiencesSemaine ?? 0} icon={<Activity size={15} stroke={C.goldD} />} note="خلال 7 أيام" />
        <KpiCard title="ملفات راكدة" value={ov?.kpi.dossiersDormants ?? 0} icon={<Clock size={15} stroke={C.warn} />} iconBg={C.warnBg} note="دون حركة منذ 90 يوماً" />
        <KpiCard title="آجال منصرمة" value={ov?.kpi.delaisExpires ?? 0} icon={<AlertTriangle size={15} stroke={C.red} />} iconBg={C.redBg} note="غير منجزة" />
        <KpiCard title="تأجيلات هذا الأسبوع" value={ov?.kpi.renvoisCetteSemaine ?? 0} icon={<Activity size={15} stroke={C.goldD} />} note="رصدها النظام" />
      </div>

      {/* MIDDLE ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isNarrow ? '1fr 1fr' : '0.92fr 1.35fr 1.05fr', gap: isMobile ? 14 : 22, alignItems: 'stretch' }}>
        {/* col1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <CardBox title="أنواع المساطر" icon={<BarChart3 size={14} stroke={C.goldD} />}>
            {procedures.length === 0 ? (
              <p style={{ fontSize: 12, color: C.muted, textAlign: 'right', padding: '8px 0' }}>لا توجد بيانات بعد</p>
            ) : (
              <>
                {procedures.slice(0, 4).map((p, i) => {
                  const w = `${Math.round((p.count / maxProc) * 100)}%`
                  const bg = i === 0 ? `linear-gradient(90deg, ${C.goldD}, ${C.goldM})` : i === 1 ? C.goldSoft : C.goldPale
                  return <Bar key={p.type} label={PROC_AR[p.type] ?? p.type} width={w} bg={bg} count={p.count} last={i === Math.min(procedures.length, 4) - 1} />
                })}
              </>
            )}
          </CardBox>
          <CardBox title="حالة الملفات" icon={<Users2 size={14} stroke={C.goldD} />} flex>
            <StatusRow label="قيد المتابعة" value={actifs} pct={`${ov?.statutFichiers.actifsPct ?? 0}%`} pctColor={C.green} />
            <StatusRow label="مؤرشفة" value={archives} pct={`${ov?.statutFichiers.archivesPct ?? 0}%`} pctColor={C.goldD} />
          </CardBox>

          <CardBox title="حالة القضايا (ذكاء اصطناعي)" icon={<Gauge size={14} stroke={C.goldD} />}>
            <StatusRow label="مفتوحة" value={ov?.statutsIA?.ouvert ?? 0} pct="" pctColor={C.green} />
            <StatusRow label="في المداولة" value={ov?.statutsIA?.enDelibere ?? 0} pct="" pctColor={C.goldD} />
            <StatusRow label="مغلقة" value={ov?.statutsIA?.clos ?? 0} pct="" pctColor={C.muted} />
          </CardBox>
        </div>

        {/* col2 — heatmap */}
        <div style={{ background: C.card, borderRadius: 22, padding: '20px 24px', boxShadow: '0 14px 34px -22px rgba(110,90,30,.4)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${C.border}`, borderRadius: 10, padding: '6px 11px' }}>
              <Clock size={13} stroke={C.goldD} />
              <span style={{ fontSize: 11.5, color: '#7A7461', fontFamily: "'IBM Plex Sans',sans-serif" }}>آخر 7 أيام</span>
            </div>
            <CardTitle title="الأحداث حسب اليوم" icon={<Clock size={14} stroke={C.goldD} />} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {evolutionPct !== null && (
                <span style={{ fontSize: 11, fontWeight: 600, color: evolutionPct >= 0 ? C.green : C.red, background: evolutionPct >= 0 ? C.greenBg : C.redBg, borderRadius: 6, padding: '2px 7px' }}>
                  {evolutionPct >= 0 ? '+' : ''}{evolutionPct}%
                </span>
              )}
              <span style={{ fontSize: 10.5, color: C.muted }}>عن الأسبوع الماضي</span>
            </div>
            <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 34, fontWeight: 700, color: C.ink }}>{evtSemaine}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, justifyContent: 'flex-end' }}>
            <LegendDot bg="#EFE6C8" txt="0–2" /><LegendDot bg="#F2D7C2" txt="3–5" /><LegendDot bg="#D9C06A" txt="+6" />
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {heat.map((v, ci) => (
                <div key={ci} title={`${v}`} style={{ flex: 1, height: 44, borderRadius: 8, background: heatPal[heatLevel(v)], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: v === 0 ? C.faint : C.ink2, fontFamily: "'IBM Plex Sans',sans-serif" }}>
                  {v > 0 ? v : ''}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
              {joursLabels.map((j, i) => <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, color: C.muted }}>{j}</div>)}
            </div>
          </div>
        </div>

        {/* col3 — gauge */}
        <div style={{ background: C.card, borderRadius: 22, padding: '20px 24px', boxShadow: '0 14px 34px -22px rgba(110,90,30,.4)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#C7C0AE', fontSize: 18 }}>⋯</span>
            <CardTitle title="مؤشر المتابعة" icon={<Gauge size={14} stroke={C.goldD} />} />
          </div>
          <div style={{ position: 'relative', margin: '14px auto 4px', width: 210, height: 120 }}>
            <svg width="210" height="120" viewBox="0 0 210 120">
              <path d="M15 110 A90 90 0 0 1 195 110" fill="none" stroke="#F0E8CF" strokeWidth="17" strokeLinecap="round" />
              <path d="M195 110 A90 90 0 0 0 15 110" fill="none" stroke="url(#mqg)" strokeWidth="17" strokeLinecap="round" strokeDasharray={`${gaugeOn.toFixed(1)} ${gaugeLen.toFixed(1)}`} />
              <defs><linearGradient id="mqg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={C.goldD} /><stop offset="1" stopColor={C.goldM} /></linearGradient></defs>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 22 }}>
              <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 32, fontWeight: 700, color: C.ink }}>{gaugePct}%</div>
              <div style={{ fontSize: 11, color: C.muted }}>آجال منجزة</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 6 }}>
            <GaugeRow label="آجال مُنجزة" pct={`${ov?.delais.completsPct ?? 0}%`} dot={C.goldM} />
            <GaugeRow label="آجال متأخرة" pct={`${ov?.delais.expiresPct ?? 0}%`} dot={C.goldD} />
            <GaugeRow label="ملفات نشطة" pct={`${actifs}`} dot={C.green} />
          </div>
          <button style={{ marginTop: 16, width: '100%', border: `1px solid ${C.goldSoft}`, background: '#FBF6E7', color: C.goldD, fontWeight: 600, fontSize: 13, borderRadius: 12, padding: 11, cursor: 'pointer', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>
            إضافة المزيد من المؤشرات
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ background: C.card, borderRadius: 22, padding: isMobile ? '18px 14px' : '22px 24px', boxShadow: '0 14px 34px -22px rgba(110,90,30,.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ color: '#C7C0AE', fontSize: 18 }}>⋯</span>
          <CardTitle title="آخر الأحداث القضائية" icon={<Activity size={14} stroke={C.goldD} />} />
        </div>
        <div style={{ overflowX: isMobile ? 'auto' : 'visible' }}>
        <div style={{ minWidth: isMobile ? 560 : undefined }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1.1fr 2.4fr', gap: 14, padding: '0 6px 12px', borderBottom: `1px solid #F1EBDC` }}>
          {['الحالة', 'التاريخ', 'المحكمة', 'الملف', 'تفاصيل الحدث'].map((h) => (
            <div key={h} style={{ fontSize: 11.5, color: C.muted, textAlign: 'right' }}>{h}</div>
          ))}
        </div>
        {derniersDossiers.length === 0 ? (
          <div style={{ padding: '28px 6px', textAlign: 'center', color: C.muted, fontSize: 13 }}>لا توجد أحداث بعد — أضف ملفاً لبدء المتابعة</div>
        ) : (
          derniersDossiers.map((d) => {
            const aDelai = d.echeances.length > 0
            const sc = aDelai ? { c: C.red, b: C.redBg, txt: 'أجل حرج' } : { c: C.goldD, b: C.goldChip, txt: 'منشور' }
            const tag = (d.titreAffaire ?? d.numeroDossier).trim().charAt(0) || 'م'
            return (
              <Link key={d.id} href={`/dossiers/${d.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1.1fr 2.4fr', gap: 14, padding: '14px 6px', alignItems: 'center', borderBottom: '1px solid #F6F1E5' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 600, borderRadius: 7, padding: '4px 10px', color: sc.c, background: sc.b }}>{sc.txt}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#7A7461', textAlign: 'right', fontFamily: "'IBM Plex Sans',sans-serif" }}>{new Date(d.updatedAt).toLocaleDateString('fr-MA')}</div>
                  <div style={{ fontSize: 12.5, color: C.ink2, textAlign: 'right' }}>{tribunalAr(d.tribunal)}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, textAlign: 'right', fontFamily: "'IBM Plex Sans',sans-serif" }}>{d.numeroDossier}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 12.5, color: '#4A4538', textAlign: 'right' }}>{d.titreAffaire || 'تتبّع الملف'}</span>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: sc.c, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600 }}>{tag}</span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
        </div>
        </div>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, options, onChange, labels }: { label: string; value: string; options: string[]; onChange: (v: string) => void; labels?: Record<string, string> }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        border: `1px solid ${value ? C.goldM : C.border}`, background: value ? C.goldChip : '#fff',
        borderRadius: 9, padding: '7px 10px', fontSize: 12.5, color: value ? C.ink2 : C.muted,
        fontWeight: value ? 600 : 400, fontFamily: "'IBM Plex Sans Arabic',sans-serif", cursor: 'pointer', outline: 'none',
        direction: 'rtl', textAlign: 'right',
      }}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>{labels?.[o] ?? o}</option>
      ))}
    </select>
  )
}

function KpiCard({ title, value, icon, iconBg = C.goldChip, note }: { title: string; value: React.ReactNode; icon: React.ReactNode; iconBg?: string; note: string }) {
  return (
    <div style={{ background: C.card, borderRadius: 22, padding: '22px 24px', boxShadow: '0 14px 34px -22px rgba(110,90,30,.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#C7C0AE', fontSize: 18, letterSpacing: 1 }}>⋯</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.label }}>{title}</span>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        </div>
      </div>
      <div style={{ textAlign: 'left', marginTop: 18, fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 40, fontWeight: 700, color: C.ink }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <span style={{ fontSize: 11.5, color: C.muted }}>{note}</span>
      </div>
    </div>
  )
}

function CardTitle({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: C.label }}>{title}</span>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: C.goldChip, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
    </div>
  )
}

function CardBox({ title, icon, children, flex }: { title: string; icon: React.ReactNode; children: React.ReactNode; flex?: boolean }) {
  return (
    <div style={{ background: C.card, borderRadius: 22, padding: '20px 22px', boxShadow: '0 14px 34px -22px rgba(110,90,30,.4)', ...(flex ? { flex: 1 } : {}) }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <span style={{ color: '#C7C0AE', fontSize: 18 }}>⋯</span>
        <CardTitle title={title} icon={icon} />
      </div>
      {children}
    </div>
  )
}

function Bar({ label, width, bg, last, count }: { label: string; width: string; bg: string; last?: boolean; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: last ? 0 : 14 }}>
      {count !== undefined && <span style={{ fontSize: 11, fontWeight: 700, color: C.ink2, minWidth: 18, textAlign: 'left', fontFamily: "'IBM Plex Sans',sans-serif" }}>{count}</span>}
      <div style={{ flex: 1, height: 13, borderRadius: 7, background: '#F3EEE0', overflow: 'hidden' }}>
        <div style={{ width, height: '100%', borderRadius: 7, background: bg }} />
      </div>
      <span style={{ fontSize: 11, color: C.muted, minWidth: 44, textAlign: 'right' }}>{label}</span>
    </div>
  )
}

function StatusRow({ label, value, pct, pctColor }: { label: string; value: React.ReactNode; pct: string; pctColor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: pctColor }}>{pct}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontSize: 13, color: C.ink2 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, fontFamily: "'IBM Plex Sans',sans-serif" }}>{value}</span>
      </div>
    </div>
  )
}

function GaugeRow({ label, pct, dot, chip, chipColor, chipBg }: { label: string; pct: string; dot: string; chip?: string; chipColor?: string; chipBg?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {chip ? <span style={{ fontSize: 11, fontWeight: 600, color: chipColor, background: chipBg, borderRadius: 6, padding: '2px 7px' }}>{chip}</span> : <span />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12.5, color: C.ink2 }}>{label}</span>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, fontFamily: "'IBM Plex Sans',sans-serif" }}>{pct}</span>
      </div>
    </div>
  )
}

function LegendDot({ bg, txt }: { bg: string; txt: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 11, height: 11, borderRadius: 3, background: bg }} />
      <span style={{ fontSize: 10.5, color: C.muted, fontFamily: "'IBM Plex Sans',sans-serif" }}>{txt}</span>
    </div>
  )
}