'use client'
// CRM › الموكلون : liste, recherche tolérante à l'arabe, solde par client, ajout avec contrôle des conflits d'intérêts.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, Plus, Search, UserRound } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { EtatVide } from '@/components/ui/Visuels'
import { ErreurChargement, SqueletteListe } from '@/components/ui/Chargement'
import { FormulaireClient } from '@/components/legal/FormulaireClient'
import { BTN } from '@/components/legal/DeadlineCard'
import { CARTE, dh, type TypeClient } from '@/lib/facturation'
import { t as tr } from '@/lib/langue'

interface ClientListe { id: string; type: TypeClient; nom: string; telephone: string | null; ville: string | null; nbDossiers: number; factureCentimes: number; regleCentimes: number; resteCentimes: number }

const CSS = `
.cl-tbl th{font-size:13px;font-weight:600;color:#5E6B67;text-align:start;padding:12px 14px;border-bottom:1px solid #E4E0D6;white-space:nowrap}
.cl-tbl td{padding:14px;border-bottom:1px solid #EEEAE1;font-size:14px;vertical-align:middle}
.cl-tbl tbody tr{cursor:pointer}.cl-tbl tbody tr:hover{background:#FAF8F3}
.cl-cartes{display:none}
@media (max-width:760px){.cl-tblw{display:none !important}.cl-cartes{display:flex !important}}
`

export default function ClientsPage() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [debounce, setDebounce] = useState('')
  const [archives, setArchives] = useState(false)
  const [ajout, setAjout] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDebounce(q), 250); return () => clearTimeout(t) }, [q])
  const { data, loading, error, refetch } = useApi<ClientListe[]>(`/clients?q=${encodeURIComponent(debounce)}${archives ? '&archives=1' : ''}`)

  const totalReste = (data ?? []).reduce((s, c) => s + Math.max(0, c.resteCentimes), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{CSS}</style>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600 }}>{tr('الموكلون')}</h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: '#3B4A47' }}>
            {data ? <><span className="num">{data.length}</span>{' '}{tr('موكل')}{totalReste > 0 && <>{' '}{tr('· باقي الأداء:')}{' '}<strong className="num">{dh(totalReste)}</strong></>}</> : tr('بطاقات الموكلين، ملفاتهم وأتعابهم')}
          </p>
        </div>
        <button type="button" className="mp-action" onClick={() => setAjout(true)} style={{ ...BTN, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, gap: 8, minHeight: 48, padding: '0 20px' }}><Plus size={18} aria-hidden />{tr('موكل جديد')}</button>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <label style={{ flex: '1 1 280px', display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1px solid #CFCAC0', borderRadius: 999, padding: '0 14px', minHeight: 46 }}>
          <Search size={18} color="#5E6B67" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('بحث بالاسم، الهاتف، رقم البطاقة أو ICE')} aria-label={tr('بحث')} style={{ flex: 1, border: 0, outline: 'none', fontFamily: 'inherit', fontSize: 15, background: 'transparent', minWidth: 0 }} />
        </label>
        <div role="tablist" style={{ display: 'inline-flex', background: '#EEEAE1', borderRadius: 999, padding: 4 }}>
          {[[false, tr('النشطون')], [true, tr('المؤرشفون')]].map(([v, l]) => (
            <button key={String(v)} type="button" role="tab" aria-selected={archives === v} onClick={() => setArchives(v as boolean)} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, border: 0, borderRadius: 999, padding: '0 16px', minHeight: 38, cursor: 'pointer', background: archives === v ? '#FFFFFF' : 'transparent', color: '#15201E' }}>{l as string}</button>
          ))}
        </div>
      </div>

      {loading && !data ? <section style={CARTE}><SqueletteListe n={6} label={tr('جارٍ تحميل الموكلين')} /></section>
        : error && !data ? <ErreurChargement quoi={tr('الموكلين')} onReessayer={refetch} />
        : !data?.length ? (
          <section style={CARTE}>
            <EtatVide Icon={UserRound} texte={q ? tr('لا موكل بهذا الاسم.') : archives ? tr('لا موكلين مؤرشفين.') : tr('لا موكلين بعد. أضيفوا أول موكل، أو اربطوا موكلاً من صفحة الملف.')}
              action={!q && !archives ? <button type="button" onClick={() => setAjout(true)} style={{ ...BTN, background: '#E3F0EC', border: '1px solid #CDE5DD', color: '#0E5A4E' }}>{tr('إضافة موكل')}</button> : undefined} />
          </section>
        ) : <>
          <div className="cl-tblw" style={{ ...CARTE, padding: 0, overflowX: 'auto' }}>
            <table className="cl-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th>{tr('الموكل')}</th><th>{tr('الهاتف')}</th><th>{tr('المدينة')}</th><th>{tr('الملفات')}</th><th>{tr('مفوتر')}</th><th>{tr('مؤدى')}</th><th>{tr('الباقي')}</th></tr></thead>
              <tbody>{data.map((c) => (
                <tr key={c.id} onClick={() => router.push(`/clients/${c.id}`)}>
                  <td><Link href={`/clients/${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#15201E', fontWeight: 600, textDecoration: 'none' }}>{c.type === 'SOCIETE' ? <Building2 size={18} color="#22476A" aria-hidden /> : <UserRound size={18} color="#0E5A4E" aria-hidden />}{c.nom}</Link></td>
                  <td className="num" style={{ textAlign: 'start' }}>{c.telephone ?? '—'}</td>
                  <td>{c.ville ?? '—'}</td>
                  <td className="num" style={{ textAlign: 'start' }}>{c.nbDossiers}</td>
                  <td className="num" style={{ textAlign: 'start' }}>{dh(c.factureCentimes, false)}</td>
                  <td className="num" style={{ textAlign: 'start' }}>{dh(c.regleCentimes, false)}</td>
                  <td className="num" style={{ textAlign: 'start', fontWeight: 600, color: c.resteCentimes > 0 ? '#7A4E06' : '#0B4A40' }}>{dh(c.resteCentimes, false)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="cl-cartes" style={{ flexDirection: 'column', gap: 10 }}>
            {data.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`} style={{ ...CARTE, padding: 16, gap: 6, color: '#15201E', textDecoration: 'none' }}>
                <strong style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>{c.type === 'SOCIETE' ? <Building2 size={18} color="#22476A" aria-hidden /> : <UserRound size={18} color="#0E5A4E" aria-hidden />}{c.nom}</strong>
                <span style={{ fontSize: 13, color: '#5E6B67' }}><span className="num">{c.nbDossiers}</span>{' '}{tr('ملف')}{c.telephone ? <> · <span className="num">{c.telephone}</span></> : null}</span>
                {c.resteCentimes > 0 && <span style={{ fontSize: 14, fontWeight: 600, color: '#7A4E06' }}>{tr('الباقي:')}{' '}<span className="num">{dh(c.resteCentimes)}</span></span>}
              </Link>
            ))}
          </div>
        </>}

      {ajout && <FormulaireClient onFerme={() => setAjout(false)} onCree={(id) => router.push(`/clients/${id}`)} />}
    </div>
  )
}
