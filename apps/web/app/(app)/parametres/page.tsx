'use client'

import Link from 'next/link'
import { Settings, CreditCard, Smartphone, User2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useApi } from '@/hooks/useApi'

const C = {
  card: '#fff', ink: '#2C2A24', ink2: '#3A3322', label: '#5B5544', muted: '#A39C8B',
  goldD: '#9A7820', goldChip: '#F4EFDF', green: '#3F9E6B', greenBg: '#E6F3EB',
  warn: '#B8860B', warnBg: '#FBF6E9', border: '#EEE7D6',
}

export default function ParametresPage() {
  const { user } = useAuth()
  const { data: abonnement } = useApi<{ abonnement: { plan: string; dateFin: string }; dossierCount: number }>('/abonnements/current')

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 720 }}>
      <div style={{ textAlign: 'right' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>الإعدادات</h1>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>إدارة حسابكم واشتراككم وتنبيهاتكم</p>
      </div>

      {/* Profil */}
      <Section icon={<User2 size={18} stroke={C.goldD} />} title="الملف الشخصي">
        <Row label="الاسم" value={`الأستاذ(ة) ${user?.prenom ?? ''} ${user?.nom ?? ''}`} />
        <Divider />
        <Row label="البريد الإلكتروني" value={user?.email ?? '—'} ltr />
        <Divider />
        <div style={rowStyle}>
          <div>
            {user?.whatsappVerifie
              ? <span style={{ fontSize: 12, fontWeight: 600, color: C.green, background: C.greenBg, borderRadius: 7, padding: '4px 10px' }}>مؤكَّد</span>
              : <Link href="/parametres/whatsapp" style={{ fontSize: 13, fontWeight: 600, color: C.warn, textDecoration: 'none' }}>غير مؤكَّد — إعداد</Link>}
          </div>
          <span style={{ fontSize: 13, color: C.muted }}>واتساب</span>
        </div>
      </Section>

      {/* Abonnement */}
      <Section icon={<CreditCard size={18} stroke={C.goldD} />} title="الاشتراك">
        <Row label="الخطة الحالية" value={planAr(abonnement?.abonnement?.plan)} />
        <Divider />
        <Row label="عدد الملفات المستعملة" value={`${abonnement?.dossierCount ?? 0}`} ltr />
        {abonnement?.abonnement?.dateFin && (
          <>
            <Divider />
            <Row label="تاريخ التجديد" value={new Date(abonnement.abonnement.dateFin).toLocaleDateString('fr-MA')} ltr />
          </>
        )}
        <Link href="/abonnement" style={{ textDecoration: 'none' }}>
          <button style={btnStyle}>تغيير الخطة</button>
        </Link>
      </Section>

      {/* WhatsApp */}
      <Section icon={<Smartphone size={18} stroke={C.goldD} />} title="تنبيهات واتساب">
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 14, textAlign: 'right' }}>
          أكّدوا رقم واتساب الخاص بكم لتلقّي التنبيهات القضائية فور صدورها.
        </p>
        <Link href="/parametres/whatsapp" style={{ textDecoration: 'none' }}>
          <button style={btnStyle}>إعداد واتساب</button>
        </Link>
      </Section>
    </div>
  )
}

function planAr(plan?: string) {
  if (!plan) return 'مجاني'
  const map: Record<string, string> = { GRATUIT: 'مجاني', PRO: 'احترافي', CABINET: 'مكتب', ENTREPRISE: 'مؤسسة' }
  return map[plan] ?? plan
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row-reverse', padding: '4px 0' }
const btnStyle: React.CSSProperties = { marginTop: 16, border: `1px solid ${C.border}`, background: '#fff', color: C.ink, fontWeight: 600, fontSize: 13, borderRadius: 11, padding: '9px 16px', cursor: 'pointer', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, borderRadius: 22, padding: '22px 24px', boxShadow: '0 14px 34px -22px rgba(110,90,30,.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row-reverse', justifyContent: 'flex-end', marginBottom: 18 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{title}</h2>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: C.goldChip, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div style={rowStyle}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.ink, ...(ltr ? { direction: 'ltr', fontFamily: "'IBM Plex Sans',sans-serif" } : {}) }}>{value}</span>
      <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#F1EBDC', margin: '10px 0' }} />
}