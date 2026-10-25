'use client'
// Facturation › الفوترة والأتعاب : factures, encaissements, synthèse annuelle et en-tête du cabinet.
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Plus, Receipt, Wallet } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { EtatVide } from '@/components/ui/Visuels'
import { Attente, ErreurChargement, SqueletteListe, useEnvoi } from '@/components/ui/Chargement'
import { BTN, fmtDate } from '@/components/legal/DeadlineCard'
import { CARTE, H2, INPUT, LABEL, MODE, TYPE_FACTURE, dh, etatFacture, type Facture, type Profil, type Reglement } from '@/lib/facturation'

type Onglet = 'factures' | 'reglements' | 'synthese' | 'profil'
interface Synthese {
  annee: number; factureTtcCentimes: number; factureHtCentimes: number; tvaCentimes: number; encaisseCentimes: number
  provisionsNonImputeesCentimes: number; impayesCentimes: number; impayes: Facture[]; mois: { mois: number; factureCentimes: number; encaisseCentimes: number }[]
}
const MOIS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر']
const CSS = `.fa-tbl th{font-size:13px;font-weight:600;color:#5E6B67;text-align:right;padding:12px 14px;border-bottom:1px solid #E4E0D6;white-space:nowrap}
.fa-tbl td{padding:12px 14px;border-bottom:1px solid #EEEAE1;font-size:14px;vertical-align:middle}
.fa-tbl tbody tr{cursor:pointer}.fa-tbl tbody tr:hover{background:#FAF8F3}`

export default function FacturationPage() {
  return <Suspense fallback={<SqueletteListe n={6} />}><Facturation /></Suspense>
}

function Facturation() {
  const params = useSearchParams()
  const router = useRouter()
  const [onglet, setOnglet] = useState<Onglet>((params.get('onglet') as Onglet) || 'factures')
  useEffect(() => { router.replace(`/facturation${onglet === 'factures' ? '' : `?onglet=${onglet}`}`, { scroll: false }) }, [onglet, router])
  const ONGLETS: [Onglet, string][] = [['factures', 'الفواتير'], ['reglements', 'الأداءات'], ['synthese', 'الحصيلة'], ['profil', 'معلومات المكتب']]

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{CSS}</style>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600 }}>الفوترة والأتعاب</h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: '#3B4A47' }}>فواتير ومذكرات أتعاب مرقّمة، أداءات وتسبيقات.</p>
        </div>
        <Link href="/facturation/nouvelle" className="mp-action" style={{ ...BTN, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, gap: 8, minHeight: 48, padding: '0 20px' }}><Plus size={18} aria-hidden />فاتورة جديدة</Link>
      </header>
      <div role="tablist" aria-label="أقسام الفوترة" style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E4E0D6', overflowX: 'auto' }}>
        {ONGLETS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={onglet === k} onClick={() => setOnglet(k)} style={{ fontFamily: 'inherit', fontSize: 15, fontWeight: onglet === k ? 600 : 400, background: 'transparent', color: onglet === k ? '#15201E' : '#3B4A47', border: 0, borderBottom: onglet === k ? '3px solid var(--mp-action)' : '3px solid transparent', padding: '12px 16px', minHeight: 44, cursor: 'pointer', whiteSpace: 'nowrap' }}>{l}</button>
        ))}
      </div>
      {onglet === 'factures' && <ListeFactures />}
      {onglet === 'reglements' && <ListeReglements />}
      {onglet === 'synthese' && <VueSynthese />}
      {onglet === 'profil' && <ProfilCabinet />}
    </div>
  )
}

function ListeFactures() {
  const router = useRouter()
  const [statut, setStatut] = useState('')
  const { data, loading, error, refetch } = useApi<Facture[]>(`/facturation/factures${statut ? `?statut=${statut}` : ''}`)
  if (loading && !data) return <section style={CARTE}><SqueletteListe n={6} label="جارٍ تحميل الفواتير" /></section>
  if (error && !data) return <ErreurChargement quoi="الفواتير" onReessayer={refetch} />
  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[['', 'الكل'], ['BROUILLON', 'مسودات'], ['EMISE', 'مصدرة'], ['ANNULEE', 'ملغاة']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setStatut(v)} aria-pressed={statut === v} style={{ ...BTN, minHeight: 40, ...(statut === v ? { background: '#15201E', color: '#FFFFFF', borderColor: '#15201E' } : {}) }}>{l}</button>
        ))}
      </div>
      {!data?.length ? <section style={CARTE}><EtatVide Icon={Receipt} texte="لا فواتير بعد." action={<Link href="/facturation/nouvelle" style={{ ...BTN, background: '#E3F0EC', border: '1px solid #CDE5DD', color: '#0E5A4E' }}>إنشاء فاتورة</Link>} /></section> : (
        <div style={{ ...CARTE, padding: 0, overflowX: 'auto' }}>
          <table className="fa-tbl" style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
            <thead><tr><th>الرقم</th><th>النوع</th><th>الموكل</th><th>الملف</th><th>التاريخ</th><th>المبلغ</th><th>الباقي</th><th>الحالة</th></tr></thead>
            <tbody>{data.map((f) => {
              const e = etatFacture(f)
              return (
                <tr key={f.id} onClick={() => router.push(`/facturation/${f.id}`)}>
                  <td><Link href={`/facturation/${f.id}`} className="num" style={{ fontWeight: 600, color: '#15201E' }}>{f.numero ?? '—'}</Link></td>
                  <td>{TYPE_FACTURE[f.type]}</td>
                  <td>{f.client.nom}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{f.dossier?.numeroDossier ?? '—'}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{fmtDate(f.dateEmission ?? f.createdAt)}</td>
                  <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{dh(f.totalTtcCentimes, false)}</td>
                  <td className="num" style={{ textAlign: 'right', color: f.statut === 'EMISE' && f.resteCentimes > 0 ? '#7A4E06' : '#5E6B67' }}>{f.statut === 'EMISE' && f.type !== 'AVOIR' ? dh(f.resteCentimes, false) : '—'}</td>
                  <td><span style={{ fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '2px 10px', background: e.bg, color: e.fg, whiteSpace: 'nowrap' }}>{e.label}</span></td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
    </>
  )
}

function ListeReglements() {
  const { toast } = useToast()
  const [provisions, setProvisions] = useState(false)
  const { data, loading, error, refetch } = useApi<Reglement[]>(`/facturation/reglements${provisions ? '?provisions=1' : ''}`)
  const { lancer } = useEnvoi()
  if (loading && !data) return <section style={CARTE}><SqueletteListe n={6} label="جارٍ تحميل الأداءات" /></section>
  if (error && !data) return <ErreurChargement quoi="الأداءات" onReessayer={refetch} />
  const supprimer = (id: string) => window.confirm('حذف هذا الأداء؟') && lancer(id, async () => {
    try { await apiFetch(`/facturation/reglements/${id}`, { method: 'DELETE' }); toast('حُذف الأداء.', 'success'); refetch() } catch { toast('تعذّر الحذف.', 'error') }
  })
  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        {[[false, 'كل الأداءات'], [true, 'تسبيقات غير مخصومة']].map(([v, l]) => <button key={String(v)} type="button" aria-pressed={provisions === v} onClick={() => setProvisions(v as boolean)} style={{ ...BTN, minHeight: 40, ...(provisions === v ? { background: '#15201E', color: '#FFFFFF', borderColor: '#15201E' } : {}) }}>{l as string}</button>)}
      </div>
      {!data?.length ? <section style={CARTE}><EtatVide Icon={Wallet} texte="لا أداءات. تُسجَّل من بطاقة الموكل أو من الفاتورة." /></section> : (
        <div style={{ ...CARTE, padding: 0, overflowX: 'auto' }}>
          <table className="fa-tbl" style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
            <thead><tr><th>التاريخ</th><th>الموكل</th><th>عن</th><th>الطريقة</th><th>المبلغ</th><th /></tr></thead>
            <tbody>{data.map((r) => (
              <tr key={r.id} style={{ cursor: 'default' }}>
                <td className="num" style={{ textAlign: 'right' }}>{fmtDate(r.date)}</td>
                <td>{r.client ? <Link href={`/clients/${r.client.id}`} style={{ color: '#15201E', fontWeight: 600 }}>{r.client.nom}</Link> : '—'}</td>
                <td>{r.facture?.numero ? <Link href={`/facturation/${r.facture.id}`}>فاتورة <span className="num">{r.facture.numero}</span></Link> : <>تسبيق{r.dossier ? <> · <span className="num">{r.dossier.numeroDossier}</span></> : ''}</>}</td>
                <td>{MODE[r.mode]}{r.reference ? <> · <span className="num">{r.reference}</span></> : ''}</td>
                <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{dh(r.montantCentimes, false)}</td>
                <td><button type="button" onClick={() => supprimer(r.id)} style={{ ...BTN, minHeight: 36, fontSize: 13 }}>حذف</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  )
}

function VueSynthese() {
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const { data: s, loading, error, refetch } = useApi<Synthese>(`/facturation/synthese?annee=${annee}`)
  if (loading && !s) return <section style={CARTE}><SqueletteListe n={4} /></section>
  if (!s) return error ? <ErreurChargement quoi="الحصيلة" onReessayer={refetch} /> : null
  const max = Math.max(1, ...s.mois.map((m) => Math.max(m.factureCentimes, m.encaisseCentimes)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label style={{ ...LABEL, flexDirection: 'row', alignItems: 'center', gap: 10 }}>السنة
        <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} style={{ ...INPUT, width: 120 }}>{[0, 1, 2, 3].map((i) => new Date().getFullYear() - i).map((a) => <option key={a} value={a}>{a}</option>)}</select>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[['مفوتر (مع الرسوم)', s.factureTtcCentimes], ['منها الرسم على القيمة المضافة', s.tvaCentimes], ['مُحصّل', s.encaisseCentimes], ['غير مؤدى', s.impayesCentimes], ['تسبيقات غير مخصومة', s.provisionsNonImputeesCentimes]].map(([l, v]) => (
          <div key={l as string} style={{ ...CARTE, padding: 16, gap: 4 }}><span style={{ fontSize: 13, color: '#5E6B67' }}>{l as string}</span><strong className="num" style={{ fontSize: 21, textAlign: 'right' }}>{dh(v as number)}</strong></div>
        ))}
      </div>
      <section style={CARTE}>
        <h2 style={H2}>حسب الشهر</h2>
        <div style={{ display: 'flex', gap: 14, fontSize: 13, color: '#3B4A47' }}><span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#0E5A4E', marginInlineEnd: 6 }} />مفوتر</span><span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#9FC9BE', marginInlineEnd: 6 }} />مُحصّل</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 6, alignItems: 'end', height: 180 }} role="img" aria-label="المفوتر والمحصل حسب الشهر">
          {s.mois.map((m) => (
            <div key={m.mois} title={`${MOIS[m.mois - 1]}: ${dh(m.factureCentimes)} / ${dh(m.encaisseCentimes)}`} style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: '100%' }}>
              <span style={{ flex: 1, height: `${(m.factureCentimes / max) * 100}%`, minHeight: m.factureCentimes ? 2 : 0, background: '#0E5A4E', borderRadius: '4px 4px 0 0' }} />
              <span style={{ flex: 1, height: `${(m.encaisseCentimes / max) * 100}%`, minHeight: m.encaisseCentimes ? 2 : 0, background: '#9FC9BE', borderRadius: '4px 4px 0 0' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 6, fontSize: 11, color: '#5E6B67', textAlign: 'center' }}>{MOIS.map((m) => <span key={m}>{m.slice(0, 3)}</span>)}</div>
      </section>
      <section style={CARTE}>
        <h2 style={{ ...H2, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={18} color="#7A4E06" aria-hidden />فواتير غير مؤداة</h2>
        {s.impayes.length === 0 ? <span style={{ fontSize: 14, color: '#5E6B67' }}>لا فواتير غير مؤداة.</span> : s.impayes.map((f) => (
          <Link key={f.id} href={`/facturation/${f.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, background: '#F5F3EE', color: '#15201E', textDecoration: 'none' }}>
            <span style={{ flex: 1 }}><strong className="num">{f.numero}</strong> · {f.client.nom}<br /><span style={{ fontSize: 12, color: '#5E6B67' }}>منذ <span className="num">{fmtDate(f.dateEmission!)}</span></span></span>
            <strong className="num" style={{ color: '#7A4E06' }}>{dh(f.resteCentimes)}</strong>
          </Link>
        ))}
      </section>
    </div>
  )
}

function ProfilCabinet() {
  const { toast } = useToast()
  const { data, loading, refetch } = useApi<Profil>('/facturation/profil')
  const [f, setF] = useState<Partial<Profil>>({})
  const { cle, lancer } = useEnvoi()
  useEffect(() => { if (data) setF(data) }, [data])
  if (loading && !data) return <section style={CARTE}><SqueletteListe n={4} /></section>
  const champ = (k: keyof Profil) => ({ value: (f[k] as string) ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value })) })
  const enregistrer = (e: React.FormEvent) => {
    e.preventDefault()
    lancer('ok', async () => {
      const { existe: _e, ...corps } = f as Profil & { espace?: string; id?: string; updatedAt?: string }
      delete (corps as Record<string, unknown>).espace; delete (corps as Record<string, unknown>).id; delete (corps as Record<string, unknown>).updatedAt
      try { await apiFetch('/facturation/profil', { method: 'PUT', body: JSON.stringify(corps) }); toast('حُفظت معلومات المكتب.', 'success'); refetch() }
      catch (err: any) { toast(/ICE/.test(err?.message ?? '') ? 'ICE: 15 رقماً.' : 'تحقّقوا من الحقول.', 'error') }
    })
  }
  return (
    <form onSubmit={enregistrer} style={{ ...CARTE, gap: 16 }}>
      <div>
        <h2 style={H2}>رأسية الفواتير والوثائق</h2>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#3B4A47', lineHeight: 1.7 }}>تظهر على الفواتير ووثائق «ملف العمل». المعرّف الموحد للمقاولة (ICE) والتعريف الضريبي (IF) إلزاميان لإصدار فاتورة (المادة 145 من المدونة العامة للضرائب).</p>
      </div>
      {data && !data.existe && <span style={{ fontSize: 14, color: '#7A4E06', background: '#FDF1DC', borderRadius: 10, padding: '8px 12px' }}>قيم مقترحة من حسابكم: راجعوها ثم احفظوا.</span>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <label style={LABEL}>الاسم كما يظهر (الأستاذ… أو اسم المكتب) *<input required {...champ('nom')} style={INPUT} /></label>
        <label style={LABEL}>الهيئة<input {...champ('barreau')} placeholder="هيئة المحامين بالدار البيضاء" style={INPUT} /></label>
        <label style={LABEL}>الهاتف<input {...champ('telephone')} className="num" style={INPUT} /></label>
        <label style={LABEL}>البريد<input {...champ('email')} dir="ltr" style={INPUT} /></label>
        <label style={LABEL}>العنوان<input {...champ('adresse')} style={INPUT} /></label>
        <label style={LABEL}>المدينة<input {...champ('ville')} style={INPUT} /></label>
        <label style={LABEL}>ICE (15 رقماً) *<input {...champ('ice')} inputMode="numeric" className="num" style={INPUT} /></label>
        <label style={LABEL}>التعريف الضريبي IF *<input {...champ('identifiantFiscal')} className="num" style={INPUT} /></label>
        <label style={LABEL}>الضريبة المهنية TP<input {...champ('taxeProfessionnelle')} className="num" style={INPUT} /></label>
        <label style={LABEL}>RIB<input {...champ('rib')} className="num" style={INPUT} /></label>
        <label style={LABEL}>البنك<input {...champ('banque')} style={INPUT} /></label>
      </div>
      <label style={LABEL}>تذييل الفاتورة (اختياري)<textarea {...champ('piedPage')} rows={2} style={{ ...INPUT, padding: 10, minHeight: 60 }} /></label>
      <button type="submit" className="mp-action" disabled={cle === 'ok'} style={{ ...BTN, alignSelf: 'flex-start', background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, minHeight: 48, padding: '0 22px' }}><Attente actif={cle === 'ok'} texte="جارٍ الحفظ…">حفظ</Attente></button>
    </form>
  )
}
