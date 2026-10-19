'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, CalendarClock } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'

interface Echeance {
  id: string
  description: string
  typeDelai: string
  dateLimite: string
  estCritique: boolean
  dossier: { numeroDossier: string; tribunal: string; titreAffaire?: string }
}

const C = {
  card: '#fff', ink: '#2C2A24', ink2: '#3A3322', label: '#5B5544', muted: '#A39C8B',
  goldD: '#9A7820', goldChip: '#F4EFDF', green: '#3F9E6B', greenBg: '#E6F3EB',
  red: '#DB6A52', redBg: '#FCE8E2', warn: '#B8860B', warnBg: '#FBF6E9', border: '#EEE7D6',
}

const joursRestants = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)

export default function EcheancesPage() {
  const { data: echeances, loading, refetch } = useApi<Echeance[]>('/echeances')

  const handleComplete = async (id: string) => {
    await apiFetch(`/echeances/${id}/complete`, { method: 'PATCH' }).catch(() => {})
    refetch()
  }

  const items = echeances ?? []
  const groups = {
    urgent: items.filter((e) => joursRestants(e.dateLimite) <= 3),
    soon: items.filter((e) => { const j = joursRestants(e.dateLimite); return j > 3 && j <= 7 }),
    later: items.filter((e) => joursRestants(e.dateLimite) > 7),
  }

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* En-tête de page */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>الآجال</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{items.length} أجل قيد المتابعة</p>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: C.goldChip, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CalendarClock size={19} stroke={C.goldD} />
        </div>
      </div>

      {loading ? (
        <CardShell><div style={{ height: 160 }} /></CardShell>
      ) : items.length === 0 ? (
        <CardShell>
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <CheckCircle2 size={34} color={C.green} style={{ margin: '0 auto 14px' }} />
            <p style={{ fontSize: 18, fontWeight: 600, color: C.ink2 }}>لا توجد آجال قيد المتابعة</p>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>ستظهر هنا الآجال المحسوبة تلقائياً من ملفاتكم</p>
          </div>
        </CardShell>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {groups.urgent.length > 0 && (
            <Section title="عاجلة — أقل من 3 أيام" count={groups.urgent.length} color={C.red}>
              {groups.urgent.map((e) => <EcheanceRow key={e.id} e={e} onComplete={handleComplete} />)}
            </Section>
          )}
          {groups.soon.length > 0 && (
            <Section title="قريباً — من 4 إلى 7 أيام" count={groups.soon.length} color={C.warn}>
              {groups.soon.map((e) => <EcheanceRow key={e.id} e={e} onComplete={handleComplete} />)}
            </Section>
          )}
          {groups.later.length > 0 && (
            <Section title="قادمة — أكثر من 7 أيام" count={groups.later.length} color={C.label}>
              {groups.later.map((e) => <EcheanceRow key={e.id} e={e} onComplete={handleComplete} />)}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function CardShell({ children }: { children: React.ReactNode }) {
  return <div style={{ background: C.card, borderRadius: 22, padding: '22px 24px', boxShadow: '0 14px 34px -22px rgba(110,90,30,.4)' }}>{children}</div>
}

function Section({ title, count, color, children }: { title: string; count: number; color: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ fontSize: 15, fontWeight: 700, color, marginBottom: 12, textAlign: 'right' }}>
        {title} <span style={{ fontFamily: "'IBM Plex Sans',sans-serif" }}>({count})</span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </section>
  )
}

function EcheanceRow({ e, onComplete }: { e: Echeance; onComplete: (id: string) => void }) {
  const j = joursRestants(e.dateLimite)
  const tone = j <= 1
    ? { bg: C.redBg, badge: C.red, badgeTxt: '#fff' }
    : j <= 3
      ? { bg: C.warnBg, badge: C.warn, badgeTxt: '#fff' }
      : { bg: C.card, badge: '#F0EAD8', badgeTxt: C.ink2 }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ background: tone.bg, borderRadius: 16, padding: '14px 18px', boxShadow: '0 10px 26px -20px rgba(110,90,30,.4)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 16, flexDirection: 'row-reverse' }}>
        {/* Compteur de jours */}
        <div style={{ flex: 'none', width: 52, height: 52, borderRadius: 13, background: tone.badge, color: tone.badgeTxt, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1, fontFamily: "'IBM Plex Sans',sans-serif" }}>متبقٍّ</span>
          <span style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.1, fontFamily: "'IBM Plex Sans',sans-serif" }}>{j}</span>
        </div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 3 }}>{e.description || e.typeDelai}</p>
          <Link href={`/dossiers/${e.dossier.numeroDossier}`} style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>
            <span dir="ltr" style={{ fontFamily: "'IBM Plex Sans',sans-serif" }}>{e.dossier.numeroDossier}</span> — {e.dossier.tribunal}
          </Link>
        </div>

        {/* Date */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 5, color: C.ink2, fontSize: 12 }}>
          <Clock size={13} stroke={C.muted} />
          <span dir="ltr" style={{ fontFamily: "'IBM Plex Sans',sans-serif" }}>{new Date(e.dateLimite).toLocaleDateString('fr-MA')}</span>
        </div>

        {/* Action */}
        <button onClick={() => onComplete(e.id)} title="تمّ الإنجاز"
          style={{ flex: 'none', width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', color: C.green, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle2 size={17} />
        </button>
      </div>
    </motion.div>
  )
}