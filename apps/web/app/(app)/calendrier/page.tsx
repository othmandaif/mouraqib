'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronRight, ChevronLeft, Calendar as CalIcon, Clock, AlertTriangle, Gavel } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface CalItem {
  id: string
  type: 'audience' | 'echeance'
  date: string
  titre: string
  numeroDossier: string
  tribunal: string
  titreAffaire: string | null
  dossierId: string
  critique: boolean
}
interface SemaineData { debut: string; fin: string; offset: number; items: CalItem[] }

const C = {
  card: '#fff', ink: '#2C2A24', ink2: '#3A3322', muted: '#A39C8B', faint: '#BDB6A4',
  goldD: '#9A7820', goldM: '#CBAE55', goldChip: '#F4EFDF', goldSubtle: '#FBF6E7',
  green: '#3F9E6B', greenBg: '#E6F3EB', red: '#DB6A52', redBg: '#FCE8E2',
  border: '#EEE7D6', borderL: '#F1EBDC', surfaceAlt: '#F4EFDF',
}

const JOURS_AR = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد']
const HEURE_DEBUT = 8
const HEURE_FIN = 18

const fmtHeure = (d: Date) => d.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })
const fmtCourt = (d: Date) => d.toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' })

export default function CalendrierPage() {
  const [offset, setOffset] = useState(0)
  const { data, loading, error } = useApi<SemaineData>(`/calendrier/semaine?offset=${offset}`)
  const isMobile = useMediaQuery('(max-width: 768px)')

  const debut = data?.debut ? new Date(data.debut) : null
  const items = Array.isArray(data?.items) ? data!.items : []

  const jours = useMemo(() => {
    if (!debut) return []
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(debut); d.setDate(d.getDate() + i); return d })
  }, [debut])

  const grille = useMemo(() => {
    const map = new Map<string, CalItem[]>()
    for (const item of items) {
      const d = new Date(item.date)
      const key = `${(d.getDay() + 6) % 7}-${d.getHours()}`
      const arr = map.get(key) ?? []; arr.push(item); map.set(key, arr)
    }
    return map
  }, [items])

  const journee = useMemo(() => {
    const map = new Map<number, CalItem[]>()
    for (const item of items) {
      const d = new Date(item.date)
      if (d.getHours() === 0 && d.getMinutes() === 0) {
        const ji = (d.getDay() + 6) % 7; const arr = map.get(ji) ?? []; arr.push(item); map.set(ji, arr)
      }
    }
    return map
  }, [items])

  const heures = Array.from({ length: HEURE_FIN - HEURE_DEBUT + 1 }, (_, i) => HEURE_DEBUT + i)
  const total = items.length
  const aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0)
  const libelle = offset === 0 ? 'هذا الأسبوع' : offset === 1 ? 'الأسبوع المقبل' : offset === -1 ? 'الأسبوع الماضي' : `${offset > 0 ? '+' : ''}${offset} أسابيع`

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>الأجندة الأسبوعية</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>جلساتكم وآجالكم القادمة لهذا الأسبوع</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NavBtn onClick={() => setOffset((o) => o - 1)} title="الأسبوع الماضي"><ChevronRight size={16} /></NavBtn>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: C.ink, cursor: 'pointer' }}>اليوم</button>
          )}
          <NavBtn onClick={() => setOffset((o) => o + 1)} title="الأسبوع المقبل"><ChevronLeft size={16} /></NavBtn>
        </div>
      </div>

      {/* Bandeau résumé + légende */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.ink2 }}>
          <CalIcon size={15} stroke={C.goldD} />
          <span style={{ fontWeight: 600 }}>{libelle}</span>
          {debut && <span dir="ltr" style={{ color: C.muted, fontFamily: "'IBM Plex Sans',sans-serif" }}>{fmtCourt(jours[0])} — {fmtCourt(jours[6])}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Legend color={C.goldD} txt="جلسة" /><Legend color={C.goldM} txt="أجل" /><Legend color={C.red} txt="أجل عاجل" />
        </div>
      </div>

      {error ? (
        <Shell><div style={{ padding: 18, textAlign: 'center' }}><p style={{ color: C.red, fontWeight: 600, fontSize: 14 }}>تعذّر تحميل الأجندة</p></div></Shell>
      ) : loading ? (
        <Shell><div style={{ height: 320 }} /></Shell>
      ) : total === 0 ? (
        <Shell>
          <div style={{ padding: '56px 0', textAlign: 'center' }}>
            <CalIcon size={36} color={C.muted} style={{ margin: '0 auto 14px' }} />
            <p style={{ fontSize: 18, fontWeight: 600, color: C.ink2 }}>لا توجد جلسات أو آجال هذا الأسبوع</p>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>تُحدَّث الأجندة تلقائياً كل مساء بعد فحص ملفاتكم</p>
          </div>
        </Shell>
      ) : (
        <Shell pad={isMobile ? 10 : 14}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 780 }}>
              {/* En-tête jours */}
              <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(7,1fr)', borderBottom: `1px solid ${C.border}` }}>
                <div />
                {jours.map((j, i) => {
                  const today = j.getTime() === aujourdhui.getTime()
                  return (
                    <div key={i} style={{ padding: 8, textAlign: 'center', borderRight: `1px solid ${C.borderL}`, background: today ? C.goldChip : 'transparent' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: today ? C.goldD : C.ink2 }}>{JOURS_AR[i]}</div>
                      <div dir="ltr" style={{ fontSize: 17, fontWeight: 700, color: today ? C.goldD : C.ink, fontFamily: "'IBM Plex Sans',sans-serif" }}>{j.getDate()}</div>
                    </div>
                  )
                })}
              </div>

              {/* Toute la journée */}
              {Array.from(journee.values()).some((a) => a.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(7,1fr)', borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt }}>
                  <div style={{ padding: 8, fontSize: 10, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>طوال اليوم</div>
                  {Array.from({ length: 7 }, (_, ji) => (
                    <div key={ji} style={{ padding: 4, borderRight: `1px solid ${C.borderL}`, minHeight: 40, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(journee.get(ji) ?? []).map((it) => <Chip key={it.id} item={it} />)}
                    </div>
                  ))}
                </div>
              )}

              {/* Grille horaire */}
              {heures.map((h) => (
                <div key={h} style={{ display: 'grid', gridTemplateColumns: '64px repeat(7,1fr)', borderBottom: `1px solid ${C.borderL}` }}>
                  <div dir="ltr" style={{ padding: 8, fontSize: 11, color: C.muted, fontFamily: "'IBM Plex Sans',sans-serif" }}>{String(h).padStart(2, '0')}:00</div>
                  {Array.from({ length: 7 }, (_, ji) => (
                    <div key={ji} style={{ padding: 4, borderRight: `1px solid ${C.borderL}`, minHeight: 48, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(grille.get(`${ji}-${h}`) ?? []).map((it) => <Chip key={it.id} item={it} showTime />)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Shell>
      )}
    </div>
  )
}

function Shell({ children, pad = 22 }: { children: React.ReactNode; pad?: number }) {
  return <div style={{ background: C.card, borderRadius: 22, padding: pad, boxShadow: '0 14px 34px -22px rgba(110,90,30,.4)' }}>{children}</div>
}
function NavBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return <button onClick={onClick} title={title} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 10, padding: 8, color: C.ink2, cursor: 'pointer', display: 'flex' }}>{children}</button>
}
function Legend({ color, txt }: { color: string; txt: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.ink2 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />{txt}</span>
}
function Chip({ item, showTime }: { item: CalItem; showTime?: boolean }) {
  const d = new Date(item.date)
  const isAud = item.type === 'audience'
  const sty = item.critique
    ? { bg: C.redBg, bd: `${C.red}66`, fg: C.red }
    : isAud ? { bg: 'rgba(154,120,32,.10)', bd: `${C.goldD}4D`, fg: C.goldD }
            : { bg: C.goldChip, bd: `${C.goldM}66`, fg: C.goldD }
  const Icon = item.critique ? AlertTriangle : isAud ? Gavel : Clock
  return (
    <Link href={`/dossiers/${item.dossierId}`} style={{ textDecoration: 'none' }}>
      <div style={{ borderRadius: 8, border: `1px solid ${sty.bd}`, background: sty.bg, color: sty.fg, padding: '6px 8px', textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <Icon size={12} />
          {showTime && <span dir="ltr" style={{ fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Sans',sans-serif" }}>{fmtHeure(d)}</span>}
        </div>
        <div dir="ltr" style={{ fontSize: 11, fontWeight: 700, fontFamily: "'IBM Plex Sans',sans-serif" }}>{item.numeroDossier}</div>
        <div style={{ fontSize: 10, opacity: 0.9, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.titre}</div>
      </div>
    </Link>
  )
}