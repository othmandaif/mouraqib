'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  Archive, FolderOpen, AlertTriangle, BarChart3, Users2,
  Clock, Gauge, Activity,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface Stats {
  totalDossiers: number
  delaisCritiques: number
  evenementsAujourdhui: number
}
interface Echeance {
  id: string
  description: string
  dateLimite: string
  dossier: { numeroDossier: string; tribunal: string }
}
interface Overview {
  kpi: { dossiersActifs: number; dossiersArchives: number; delaisCritiques: number; evenementsAujourdhui: number; renvoisCetteSemaine: number }
  evenements: { semaine: number; evolutionPct: number | null; heatmap: number[] }
  procedures: { type: string; count: number }[]
  delais: { total: number; completsPct: number; expiresPct: number; actifs: number }
  statutFichiers: { actifs: number; archives: number; actifsPct: number; archivesPct: number }
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

const C = {
  card: '#fff',
  ink: '#2C2A24', ink2: '#3A3322', label: '#5B5544', muted: '#A39C8B', faint: '#BDB6A4',
  goldD: '#9A7820', goldM: '#CBAE55', goldSoft: '#E7D9A6', goldPale: '#EFE6C8', goldChip: '#F4EFDF',
  green: '#3F9E6B', greenBg: '#E6F3EB', red: '#DB6A52', redBg: '#FCE8E2', border: '#EEE7D6',
}
const heatPal: Record<number, string> = { 0: '#F7F1E1', 1: '#EFE6C8', 2: '#F2D7C2', 3: '#E2C77C', 4: '#D9C06A' }

export default function DashboardPage() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isNarrow = useMediaQuery('(max-width: 1100px)')
  const { data: stats } = useApi<Stats>('/dashboard/stats')
  const { data: echeances } = useApi<Echeance[]>('/echeances/critiques')
  const { data: dossiers } = useApi<Dossier[]>('/dossiers')

  const actifs = stats?.totalDossiers ?? dossiers?.length ?? 0
  const critiques = stats?.delaisCritiques ?? echeances?.length ?? 0
  const evenementsJour = stats?.evenementsAujourdhui ?? 0

  const derniersDossiers = useMemo(() =>
    [...(dossiers ?? [])].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
  [dossiers])

  const gaugePct = 72
  const gaugeLen = Math.PI * 90
  const gaugeOn = (gaugePct / 100) * gaugeLen

  const matrix = [[1, 2, 4, 3, 2, 1, 0], [2, 3, 2, 4, 1, 2, 1], [0, 1, 3, 2, 4, 1, 0]]
  const jours = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* KPI ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 14 : 22 }}>
        <KpiCard title="الملفات المؤرشفة" value="—" icon={<Archive size={15} stroke={C.goldD} />} note="غير متوفر" />
        <KpiCard title="الملفات النشطة" value={actifs} icon={<FolderOpen size={15} stroke={C.goldD} />} note={`${evenementsJour} حدث اليوم`} />
        <KpiCard title="الآجال الحرجة" value={critiques} icon={<AlertTriangle size={15} stroke={C.red} />} iconBg={C.redBg} note={critiques > 0 ? 'تتطلب انتباهك' : 'لا شيء عاجل'} />
      </div>

      {/* MIDDLE ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isNarrow ? '1fr 1fr' : '0.92fr 1.35fr 1.05fr', gap: isMobile ? 14 : 22, alignItems: 'stretch' }}>
        {/* col1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <CardBox title="أنواع المساطر" icon={<BarChart3 size={14} stroke={C.goldD} />}>
            <Bar label="مدني" width="100%" bg={`linear-gradient(90deg, ${C.goldD}, ${C.goldM})`} />
            <Bar label="تجاري" width="62%" bg={C.goldSoft} />
            <Bar label="جنائي" width="34%" bg={C.goldPale} last />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, color: C.faint, fontSize: 10.5, fontFamily: "'IBM Plex Sans',sans-serif" }}>
              <span>30</span><span>20</span><span>10</span><span>0</span>
            </div>
          </CardBox>
          <CardBox title="حالة الملفات" icon={<Users2 size={14} stroke={C.goldD} />} flex>
            <StatusRow label="قيد المتابعة" value={actifs} pct="82%" pctColor={C.green} />
            <StatusRow label="مؤرشفة" value="—" pct="18%" pctColor={C.goldD} />
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
              <span style={{ fontSize: 11, fontWeight: 600, color: C.green, background: C.greenBg, borderRadius: 6, padding: '2px 7px' }}>+1,4%</span>
              <span style={{ fontSize: 10.5, color: C.muted }}>عن الأسبوع الماضي</span>
            </div>
            <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 34, fontWeight: 700, color: C.ink }}>{evenementsJour || 392}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, justifyContent: 'flex-end' }}>
            <LegendDot bg="#EFE6C8" txt="0–2" /><LegendDot bg="#F2D7C2" txt="3–5" /><LegendDot bg="#D9C06A" txt="+6" />
          </div>
          <div style={{ marginTop: 14 }}>
            {matrix.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                {row.map((v, ci) => <div key={ci} style={{ flex: 1, height: 30, borderRadius: 7, background: heatPal[v] }} />)}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
              {jours.map((j) => <div key={j} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, color: C.muted }}>{j}</div>)}
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
              <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 32, fontWeight: 700, color: C.ink }}>{actifs}</div>
              <div style={{ fontSize: 11, color: C.muted }}>ملف نشط</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 6 }}>
            <GaugeRow label="آجال مُنجزة" pct="70%" dot={C.goldM} chip="+5,1%" chipColor={C.green} chipBg={C.greenBg} />
            <GaugeRow label="آجال متأخرة" pct="13%" dot={C.goldD} chip="−1,9%" chipColor={C.red} chipBg={C.redBg} />
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
                  <div style={{ fontSize: 12.5, color: C.ink2, textAlign: 'right' }}>{d.tribunal}</div>
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

function Bar({ label, width, bg, last }: { label: string; width: string; bg: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: last ? 0 : 14 }}>
      <span style={{ fontSize: 11, color: C.muted, minWidth: 34, textAlign: 'left' }}>{label}</span>
      <div style={{ flex: width === '100%' ? 1 : undefined, width: width === '100%' ? undefined : width, height: 13, borderRadius: 7, background: bg }} />
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

function GaugeRow({ label, pct, dot, chip, chipColor, chipBg }: { label: string; pct: string; dot: string; chip: string; chipColor: string; chipBg: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: chipColor, background: chipBg, borderRadius: 6, padding: '2px 7px' }}>{chip}</span>
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