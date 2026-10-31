'use client'

import { MessageCircle, Phone, Mail, Check, Server, Users } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { AbonnementCourant, lienWhatsapp } from '@/lib/abonnement'
import { fmtDate } from '@/components/legal/DeadlineCard'
import { t as tr } from '@/lib/langue'

const CARTE: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }
const BTN: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, borderRadius: 999, padding: '0 18px', minHeight: 48, textDecoration: 'none', border: '1px solid #CFCAC0', background: '#FFFFFF', color: '#15201E' }
const ETAT: Record<string, { texte: string; bg: string; fg: string }> = {
  ESSAI: { texte: tr('فترة مجانية'), bg: '#E3F0EC', fg: '#0B4A40' },
  PAYE: { texte: tr('مُفعّل'), bg: '#E3F0EC', fg: '#0B4A40' },
  A_RENOUVELER: { texte: tr('ينتهي قريباً'), bg: '#FDF1DC', fg: '#7A4E06' },
  GRACE: { texte: tr('منتهٍ · التنبيهات مستمرة'), bg: '#FBEAE7', fg: '#9B2C20' },
  EXPIRE: { texte: tr('منتهٍ'), bg: '#FBEAE7', fg: '#9B2C20' },
}

export default function AbonnementPage() {
  const { data, loading } = useApi<AbonnementCourant>('/abonnements/current')
  if (loading || !data) return null
  const a = data.abonnement
  const e = a ? ETAT[a.etat] : null
  const message = tr('السلام عليكم، أنا مشترك في ملفاتي{v0} وأريد ', { v0: a ? tr(' (عرض {nomAr})', { nomAr: tr(a.offre.nomAr) }) : '' })
  const contacts = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {data.contact.telephone && <a className="mp-action" href={lienWhatsapp(data.contact.telephone, message + tr('تجديد اشتراكي.'))} target="_blank" rel="noopener noreferrer" style={{ ...BTN, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0 }}><MessageCircle size={18} aria-hidden />{' '}{tr('واتساب')}</a>}
      {data.contact.telephone && <a href={`tel:${data.contact.telephone}`} style={BTN}><Phone size={18} aria-hidden /> <span className="num">{data.contact.telephone}</span></a>}
      <a href={`mailto:${data.contact.email}?subject=${encodeURIComponent(tr('اشتراك ملفاتي'))}`} style={BTN}><Mail size={18} aria-hidden />{' '}{tr('البريد')}</a>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600 }}>{tr('اشتراكي')}</h1>
        <p style={{ margin: 0, fontSize: 16, color: '#3B4A47' }}>{tr('يُدار اشتراككم مباشرة مع مستشارنا: لا دفع عبر الإنترنت.')}</p>
      </div>

      <section style={CARTE}>
        {a ? <>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{tr('العرض:')}{' '}{tr(a.offre.nomAr)}</h2>
            {a.estFondateur && <span style={{ fontSize: 13, fontWeight: 700, color: '#15201E', background: '#F2A93B', borderRadius: 999, padding: '3px 12px' }}>{tr('عضو مؤسس · سعر ثابت مدى الحياة')}</span>}
            {e && <span style={{ fontSize: 13, fontWeight: 600, color: e.fg, background: e.bg, borderRadius: 999, padding: '3px 12px' }}>{e.texte}</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Info titre={tr('الثمن الشهري')} valeur={a.prixMensuel != null ? <><span className="num">{a.prixMensuel}</span>{' '}{tr('درهم')}</> : tr('حسب العرض')} />
            <Info titre={a.etat === 'ESSAI' ? tr('الفترة المجانية حتى') : tr('الاشتراك صالح حتى')} valeur={a.fin ? <span className="num">{fmtDate(a.fin)}</span> : '—'} />
            <Info titre={tr('الملفات المتابعة')} valeur={<><span className="num">{data.dossierCount}</span>{a.offre.maxDossiers > 0 ? <> / <span className="num">{a.offre.maxDossiers}</span></> : tr(' · بلا حد')}</>} />
          </div>
          {(a.etat === 'GRACE' || a.etat === 'EXPIRE') && (
            <p role="alert" style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#6E1D14', background: '#FBF1EF', border: '1px solid #F0C9C2', borderRadius: 12, padding: '12px 14px' }}>
              {tr('الملفات الحالية ما زالت تحت المتابعة والتنبيهات مستمرة، حتى لا يفوتكم أي أجل.')}{a.etat === 'EXPIRE' ? tr(' إضافة ملفات جديدة متوقفة حتى التجديد.') : ''}
            </p>
          )}
        </> : <p style={{ margin: 0, color: '#3B4A47' }}>{tr('حسابكم مرتبط باشتراك مكتبكم.')}</p>}
        {contacts}
      </section>

      <section style={CARTE}>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>{tr('تحتاجون أكثر؟')}</h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Ligne Icon={Users} titre={tr('مكتب بعدة محامين')} texte={tr('حسابات لأعضاء المكتب والكتّاب، ودعوتهم من الإعدادات.')} />
          <Ligne Icon={Server} titre={tr('تثبيت على خوادم مكتبكم')} texte={tr('ملفاتي داخل مكتبكم، دون سحابة. عرض سعر حسب الحاجة.')} />
          <Ligne Icon={Check} titre={tr('مرافقة في البداية')} texte={tr('يضيف مستشارنا ملفاتكم الأولى معكم ويضبط التنبيهات.')} />
        </ul>
        {contacts}
      </section>
    </div>
  )
}

function Info({ titre, valeur }: { titre: string; valeur: React.ReactNode }) {
  return (
    <div style={{ background: '#F5F3EE', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 13, color: '#5E6B67' }}>{titre}</span>
      <strong style={{ fontSize: 18, fontWeight: 600 }}>{valeur}</strong>
    </div>
  )
}

function Ligne({ Icon, titre, texte }: { Icon: typeof Check; titre: string; texte: string }) {
  return (
    <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ flex: 'none', width: 36, height: 36, borderRadius: 10, background: '#E3F0EC', color: '#0E5A4E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={18} aria-hidden /></span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><strong style={{ fontSize: 15, fontWeight: 600 }}>{titre}</strong><span style={{ fontSize: 14, color: '#3B4A47', lineHeight: 1.6 }}>{texte}</span></span>
    </li>
  )
}
