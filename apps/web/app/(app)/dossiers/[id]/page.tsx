'use client'

import { use } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, RefreshCw, CheckCircle2, Clock, AlertTriangle, Activity } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface Evenement {
  id: string
  texteArabe: string
  typeEvenement?: string
  dateAudience?: string
  datePublicationGreffe: string
  estNouvel: boolean
}
interface Echeance {
  id: string
  description: string
  typeDelai: string
  dateLimite: string
  estCritique: boolean
  estComplete: boolean
}
interface DossierDetail {
  id: string
  numeroDossier: string
  tribunal: string
  titreAffaire?: string
  typeProcedure: string
  evenements: Evenement[]
  echeances: Echeance[]
  rawData?: {
    infosCarte: Record<string, string> | null
    parties: { qualite: string; nom: string; avocats: string; delegues: string; agents: string; representants: string }[]
    expertises: string[]
    recours: { type: string; partie: string; dateDepot: string; numero: string; numeroEnvoi: string; dateEnvoi: string; tribunal: string }[]
    dossiersLies: { type: string; numeroDossier: string; dateInscription: string; tribunal: string }[]
  }
}

const C = {
  card: '#fff', ink: '#2C2A24', ink2: '#3A3322', label: '#5B5544', muted: '#A39C8B', faint: '#BDB6A4',
  goldD: '#9A7820', goldM: '#CBAE55', goldChip: '#F4EFDF', green: '#3F9E6B', greenBg: '#E6F3EB',
  red: '#DB6A52', redBg: '#FCE8E2', warn: '#B8860B', warnBg: '#FBF6E9', border: '#EEE7D6', surfaceAlt: '#F4EFDF',
}
const val = (s?: string) => (s && s.trim() ? s.trim() : '—')
const joursRestants = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)

export default function DossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: dossier, loading, refetch } = useApi<DossierDetail>(`/dossiers/${id}`)
  const isMobile = useMediaQuery('(max-width: 768px)')

  const handleComplete = async (echeanceId: string) => {
    await apiFetch(`/echeances/${echeanceId}/complete`, { method: 'PATCH' }).catch(() => {})
    refetch()
  }
  const handleScrape = async () => {
    await apiFetch(`/dossiers/${id}/scraper`, { method: 'POST' }).catch(() => {})
    refetch()
  }

  if (loading) {
    return <CardShell><div style={{ height: 180 }} /></CardShell>
  }
  if (!dossier) {
    return (
      <CardShell>
        <div style={{ padding: '48px 0', textAlign: 'center' }} dir="rtl">
          <p style={{ fontSize: 20, fontWeight: 700, color: C.ink2 }}>لم يتم العثور على الملف</p>
          <Link href="/dossiers" style={{ fontSize: 13, color: C.goldD, textDecoration: 'none', display: 'inline-block', marginTop: 10 }}>← العودة إلى الملفات</Link>
        </div>
      </CardShell>
    )
  }

  const infoItems = dossier.rawData?.infosCarte
    ? Object.entries(dossier.rawData.infosCarte).map(([label, value]) => ({ label, value: value || '—' }))
    : []
  const parties = dossier.rawData?.parties ?? []
  const expertises = dossier.rawData?.expertises ?? []
  const recours = dossier.rawData?.recours ?? []
  const dossiersLies = dossier.rawData?.dossiersLies ?? []
  const echeancesActives = dossier.echeances.filter((e) => !e.estComplete)

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* En-tête */}
      <CardShell>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <Link href="/dossiers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.muted, textDecoration: 'none', marginBottom: 8 }}>
              الملفات <ArrowRight size={14} />
            </Link>
            <h1 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 700, color: C.ink, fontFamily: "'IBM Plex Sans',sans-serif", direction: 'ltr', textAlign: 'right' }}>
              {dossier.numeroDossier}
            </h1>
            <p style={{ fontSize: 13.5, color: C.ink2, marginTop: 6 }}>
              {dossier.tribunal}
              <span style={{ color: C.faint, margin: '0 8px' }}>·</span>
              {dossier.typeProcedure}
            </p>
            {dossier.titreAffaire && <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{dossier.titreAffaire}</p>}
          </div>
          <button onClick={handleScrape} style={{ display: 'flex', alignItems: 'center', gap: 7, border: `1px solid ${C.border}`, background: '#fff', borderRadius: 11, padding: '9px 15px', fontSize: 13, fontWeight: 600, color: C.ink, cursor: 'pointer' }}>
            <RefreshCw size={14} stroke={C.goldD} />
            تحديث
          </button>
        </div>
      </CardShell>

      {/* Échéances */}
      {echeancesActives.length > 0 && (
        <CardShell>
          <SectionTitle icon={<AlertTriangle size={15} stroke={C.goldD} />} title="الآجال" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {echeancesActives.map((e) => {
              const j = joursRestants(e.dateLimite)
              const tone = j <= 1 ? { bg: C.redBg, badge: C.red } : j <= 3 ? { bg: C.warnBg, badge: C.warn } : { bg: '#fff', badge: '#F0EAD8' }
              return (
                <div key={e.id} style={{ background: tone.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row-reverse' }}>
                  <div style={{ flex: 'none', width: 48, height: 48, borderRadius: 12, background: tone.badge, color: j <= 3 ? '#fff' : C.ink2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "'IBM Plex Sans',sans-serif" }}>متبقٍّ</span>
                    <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, fontFamily: "'IBM Plex Sans',sans-serif" }}>{j}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{e.description || e.typeDelai}</p>
                    <p style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginTop: 2 }}>
                      <span dir="ltr" style={{ fontFamily: "'IBM Plex Sans',sans-serif" }}>{new Date(e.dateLimite).toLocaleDateString('fr-MA')}</span>
                      <Clock size={12} stroke={C.muted} />
                    </p>
                  </div>
                  <button onClick={() => handleComplete(e.id)} title="تمّ الإنجاز" style={{ flex: 'none', width: 34, height: 34, borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', color: C.green, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </CardShell>
      )}

      {/* بطاقة الملف */}
      {infoItems.length > 0 && (
        <CardShell>
          <SectionTitle title="بطاقة الملف" />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: '16px 24px' }}>
            {infoItems.map((it, i) => (
              <div key={i} style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{it.label}</p>
                <p style={{ fontSize: 14, color: C.ink }}>{it.value || '—'}</p>
              </div>
            ))}
          </div>
        </CardShell>
      )}

      {/* لائحة الأطراف */}
      {parties.length > 0 && (
        <CardShell>
          <SectionTitle title="لائحة الأطراف" />
          <ScrollX isMobile={isMobile} min={680}>
            <Table headers={['الصفة', 'اسم الطرف', 'المحامون', 'المفوضون القضائيون', 'الوكلاء', 'الممثلون القانونيون']}>
              {parties.map((p, i) => (
                <Tr key={i} cells={[val(p.qualite), val(p.nom), val(p.avocats), val(p.delegues), val(p.agents), val(p.representants)]} strong={[1]} />
              ))}
            </Table>
          </ScrollX>
        </CardShell>
      )}

      {/* لائحة الخبرات */}
      {expertises.length > 0 && (
        <CardShell>
          <SectionTitle title="لائحة الخبرات" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {expertises.map((exp, i) => (
              <div key={i} style={{ background: C.surfaceAlt, borderRadius: 10, padding: 12 }}>
                <p style={{ fontSize: 14, color: C.ink, textAlign: 'right' }}>{exp}</p>
              </div>
            ))}
          </div>
        </CardShell>
      )}

      {/* عرائض الطعن */}
      {recours.length > 0 && (
        <CardShell>
          <SectionTitle title="عرائض الطعن" />
          <ScrollX isMobile={isMobile} min={760}>
            <Table headers={['تعرض/إستئناف/عريضة نقض', 'من طرف', 'تاريخ وضعه', 'رقمها', 'رقم الإرسال', 'تاريخ الإرسال', 'المحكمة']}>
              {recours.map((r, i) => (
                <Tr key={i}
                  cells={[val(r.type), val(r.partie), val(r.dateDepot), val(r.numero), val(r.numeroEnvoi), val(r.dateEnvoi), val(r.tribunal)]}
                  ltr={[2, 3, 4, 5]} />
              ))}
            </Table>
          </ScrollX>
        </CardShell>
      )}

      {/* الملفات المرتبطة */}
      {dossiersLies.length > 0 && (
        <CardShell>
          <SectionTitle title="الملفات المرتبطة (ابتدائي/استئنافي-تبليغ/تنفيذ)" />
          <ScrollX isMobile={isMobile} min={560}>
            <Table headers={['نوع الملف', 'رقم الملف', 'تاريخ تسجيل الملف', 'المحكمة']}>
              {dossiersLies.map((d, i) => (
                <Tr key={i} cells={[val(d.type), val(d.numeroDossier), val(d.dateInscription), val(d.tribunal)]} ltr={[1, 2]} strong={[1]} />
              ))}
            </Table>
          </ScrollX>
        </CardShell>
      )}

      {/* لائحة الإجراءات (historique) */}
      <CardShell>
        <SectionTitle icon={<Activity size={15} stroke={C.goldD} />} title="لائحة الإجراءات" />
        {dossier.evenements.length === 0 ? (
          <p style={{ padding: '24px 0', textAlign: 'center', color: C.muted, fontSize: 13 }}>لا توجد إجراءات مسجّلة بعد</p>
        ) : (
          <div style={{ position: 'relative', paddingRight: 4 }}>
            <div style={{ position: 'absolute', right: 11, top: 6, bottom: 6, width: 1, background: C.border }} />
            <div>
              {dossier.evenements.map((ev, i) => (
                <motion.div key={ev.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ position: 'relative', paddingRight: 28, paddingBottom: 18, ...(ev.estNouvel ? { background: '#FBF6E7', margin: '0 -8px', padding: '8px 8px 18px 8px', borderRadius: 8 } : {}) }}>
                  <div style={{ position: 'absolute', right: 5, top: 6, width: 13, height: 13, borderRadius: '50%', border: `2px solid ${ev.estNouvel ? C.goldD : C.border}`, background: '#fff' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, justifyContent: 'flex-end' }}>
                    {ev.estNouvel && <span style={{ fontSize: 10, fontWeight: 700, color: C.goldD }}>جديد</span>}
                    <span dir="ltr" style={{ fontSize: 12, fontWeight: 600, color: C.ink2, fontFamily: "'IBM Plex Sans',sans-serif" }}>
                      {new Date(ev.datePublicationGreffe).toLocaleDateString('fr-MA')}
                      {ev.dateAudience ? ` — ${new Date(ev.dateAudience).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: C.ink, textAlign: 'right' }}>{ev.texteArabe}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardShell>
    </div>
  )
}

/* helpers */
function CardShell({ children }: { children: React.ReactNode }) {
  return <div style={{ background: C.card, borderRadius: 22, padding: '22px 24px', boxShadow: '0 14px 34px -22px rgba(110,90,30,.4)' }}>{children}</div>
}

function SectionTitle({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: 'flex-end', marginBottom: 16 }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{title}</h3>
      {icon && <div style={{ width: 30, height: 30, borderRadius: 9, background: C.goldChip, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>}
    </div>
  )
}

function ScrollX({ children, isMobile, min }: { children: React.ReactNode; isMobile: boolean; min: number }) {
  return (
    <div style={{ overflowX: isMobile ? 'auto' : 'visible' }}>
      <div style={{ minWidth: isMobile ? min : undefined }}>{children}</div>
    </div>
  )
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
          {headers.map((h) => (
            <th key={h} style={{ padding: '0 12px 10px', fontSize: 11, fontWeight: 600, color: C.muted, whiteSpace: 'nowrap', textAlign: 'right' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

function Tr({ cells, ltr = [], strong = [] }: { cells: string[]; ltr?: number[]; strong?: number[] }) {
  return (
    <tr style={{ borderBottom: '1px solid #F6F1E5' }}>
      {cells.map((c, i) => (
        <td key={i} style={{
          padding: '11px 12px', fontSize: 13, color: strong.includes(i) ? C.ink : C.ink2,
          fontWeight: strong.includes(i) ? 600 : 400, textAlign: 'right',
          ...(ltr.includes(i) ? { direction: 'ltr', fontFamily: "'IBM Plex Sans',sans-serif" } : {}),
        }}>{c}</td>
      ))}
    </tr>
  )
}