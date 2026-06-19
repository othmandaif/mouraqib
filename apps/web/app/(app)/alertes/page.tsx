'use client'

import Link from 'next/link'
import { Bell, CheckCircle2, Clock, XCircle, MinusCircle } from 'lucide-react'
import { useApi } from '@/hooks/useApi'

interface Alerte {
  id: string
  typeAlerte: string
  canal: string
  statut: string
  createdAt: string
  dossier?: { numeroDossier: string; tribunal: string }
}

const C = {
  card: '#fff', ink: '#2C2A24', ink2: '#3A3322', muted: '#A39C8B',
  goldD: '#9A7820', goldChip: '#F4EFDF', green: '#3F9E6B', greenBg: '#E6F3EB',
  red: '#DB6A52', redBg: '#FCE8E2', warn: '#B8860B', warnBg: '#FBF6E9', border: '#EEE7D6',
}

const TYPE_LABEL: Record<string, string> = {
  NOUVEL_EVENEMENT: 'حدث جديد',
  DELAI_CRITIQUE: 'أجل حرج',
  DIGEST_QUOTIDIEN: 'الملخّص اليومي',
  RENVOI_DETECTE: 'تأجيل مرصود',
}

const STATUT: Record<string, { label: string; color: string; bg: string }> = {
  ENVOYE: { label: 'مُرسَل', color: C.green, bg: C.greenBg },
  ENVOYEE: { label: 'مُرسَل', color: C.green, bg: C.greenBg },
  EN_ATTENTE: { label: 'قيد الانتظار', color: C.warn, bg: C.warnBg },
  ECHEC: { label: 'فشل', color: C.red, bg: C.redBg },
  IGNOREE: { label: 'مُتجاهَل', color: C.muted, bg: '#F2EFE8' },
}

const STATUT_ICON: Record<string, any> = {
  ENVOYE: CheckCircle2, ENVOYEE: CheckCircle2, EN_ATTENTE: Clock, ECHEC: XCircle, IGNOREE: MinusCircle,
}

export default function AlertesPage() {
  const { data: alertes, loading } = useApi<Alerte[]>('/alertes')
  const items = alertes ?? []

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.ink }}>سجلّ التنبيهات</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{items.length} تنبيه</p>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: C.goldChip, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={19} stroke={C.goldD} />
        </div>
      </div>

      {loading ? (
        <Shell><div style={{ height: 140 }} /></Shell>
      ) : items.length === 0 ? (
        <Shell>
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Bell size={34} color={C.muted} style={{ margin: '0 auto 14px' }} />
            <p style={{ fontSize: 18, fontWeight: 600, color: C.ink2 }}>لا توجد تنبيهات بعد</p>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>ستظهر هنا تنبيهات واتساب التي تتلقّونها</p>
          </div>
        </Shell>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((a) => {
            const st = STATUT[a.statut] ?? { label: a.statut, color: C.muted, bg: '#F2EFE8' }
            const Icon = STATUT_ICON[a.statut] ?? Bell
            return (
              <div key={a.id} style={{ background: C.card, borderRadius: 16, padding: '14px 18px', boxShadow: '0 10px 26px -20px rgba(110,90,30,.4)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row-reverse' }}>
                {/* icône statut */}
                <div style={{ flex: 'none', width: 40, height: 40, borderRadius: 11, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={st.color} />
                </div>

                {/* contenu */}
                <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{TYPE_LABEL[a.typeAlerte] ?? a.typeAlerte}</p>
                  {a.dossier && (
                    <Link href={`/dossiers/${a.dossier.numeroDossier}`} style={{ fontSize: 12, color: C.muted, textDecoration: 'none' }}>
                      <span dir="ltr" style={{ fontFamily: "'IBM Plex Sans',sans-serif" }}>{a.dossier.numeroDossier}</span> — {a.dossier.tribunal}
                    </Link>
                  )}
                </div>

                {/* méta */}
                <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 7, padding: '4px 10px' }}>{st.label}</span>
                  <span style={{ fontSize: 11.5, color: C.muted }}>{a.canal}</span>
                  <span dir="ltr" style={{ fontSize: 11.5, color: C.muted, fontFamily: "'IBM Plex Sans',sans-serif" }}>{new Date(a.createdAt).toLocaleDateString('fr-MA')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ background: C.card, borderRadius: 22, padding: '22px 24px', boxShadow: '0 14px 34px -22px rgba(110,90,30,.4)' }}>{children}</div>
}