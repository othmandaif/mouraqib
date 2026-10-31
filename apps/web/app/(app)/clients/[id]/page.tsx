'use client'
// CRM › fiche client : identité, dossiers liés, journal des échanges, factures et encaissements, solde.
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Building2, FileText, FolderOpen, MessageSquare, Pencil, Phone, Plus, Receipt, Trash2, UserRound, Wallet, X } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { useTribunaux } from '@/hooks/useTribunaux'
import { EtatVide } from '@/components/ui/Visuels'
import { Attente, ErreurChargement, SqueletteFiche, useEnvoi } from '@/components/ui/Chargement'
import { BTN, fmtDate } from '@/components/legal/DeadlineCard'
import { FormulaireClient } from '@/components/legal/FormulaireClient'
import { FormulaireReglement } from '@/components/legal/FormulaireReglement'
import { CARTE, H2, INPUT, MODE, TYPE_FACTURE, dh, etatFacture, type Client, type EtatPaiement, type ModeReglement, type Solde, type StatutFacture, type TypeFacture } from '@/lib/facturation'
import { t as tr } from '@/lib/langue'

interface Fiche extends Client {
  dossiers: { id: string; numeroDossier: string; tribunal: string; titreAffaire: string | null; estActif: boolean; honorairesConvenusCentimes: number | null }[]
  interactions: { id: string; type: 'APPEL' | 'RENDEZ_VOUS' | 'MESSAGE' | 'EMAIL' | 'NOTE'; resume: string; date: string; dossierId: string | null }[]
  factures: { id: string; numero: string | null; type: TypeFacture; statut: StatutFacture; dateEmission: string | null; totalTtcCentimes: number; createdAt: string; reglements: { montantCentimes: number }[] }[]
  reglements: { id: string; montantCentimes: number; date: string; mode: ModeReglement; reference: string | null; factureId: string | null; facture: { numero: string | null } | null }[]
  solde: Solde
}
const TYPES_ECHANGE = { APPEL: tr('مكالمة'), RENDEZ_VOUS: tr('موعد'), MESSAGE: tr('رسالة'), EMAIL: tr('بريد'), NOTE: tr('ملاحظة') } as const

export default function FicheClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { tribunalAr } = useTribunaux()
  const { data: c, loading, error, refetch } = useApi<Fiche>(`/clients/${id}`)
  const { cle, occupe, lancer } = useEnvoi()
  const [edition, setEdition] = useState(false)
  // ?modifier=1 (depuis une facture refusée faute d'ICE) : la fiche s'ouvre directement en modification
  useEffect(() => { if (new URLSearchParams(window.location.search).get('modifier')) setEdition(true) }, [])
  const [reglement, setReglement] = useState(false)
  const [lierDossier, setLierDossier] = useState(false)
  const [echange, setEchange] = useState<{ type: keyof typeof TYPES_ECHANGE; resume: string }>({ type: 'APPEL', resume: '' })
  const { data: dossiersLibres } = useApi<{ id: string; numeroDossier: string; titreAffaire: string | null }[]>(lierDossier ? '/dossiers' : null)

  if (loading && !c) return <SqueletteFiche />
  if (!c && error && !/non trouv|404/i.test(error)) return <ErreurChargement quoi={tr('بطاقة الموكل')} onReessayer={refetch} />
  if (!c) return <div style={{ ...CARTE, alignItems: 'center' }}><strong>{tr('لم يُعثر على الموكل')}</strong><Link href="/clients">{tr('العودة إلى الموكلين')}</Link></div>

  const action = (k: string, fn: () => Promise<unknown>, ok: string) => lancer(k, async () => {
    try { await fn(); toast(ok, 'success'); await refetch() } catch (e: any) { toast(/archiv/i.test(e?.message ?? '') ? tr('للموكل فواتير أو أداءات: أرشفوه بدل حذفه.') : tr('تعذّر تنفيذ العملية.'), 'error') }
  })
  const ajouterEchange = (e: React.FormEvent) => {
    e.preventDefault()
    if (!echange.resume.trim()) return
    action('echange', () => apiFetch(`/clients/${id}/interactions`, { method: 'POST', body: JSON.stringify(echange) }), tr('سُجّل في سجل التواصل.')).then(() => setEchange((x) => ({ ...x, resume: '' })))
  }
  const supprimer = () => {
    if (!window.confirm(tr('حذف بطاقة الموكل نهائياً؟'))) return
    lancer('suppr', async () => {
      try { await apiFetch(`/clients/${id}`, { method: 'DELETE' }); toast(tr('حُذف الموكل.'), 'success'); router.push('/clients') }
      catch { toast(tr('للموكل فواتير أو أداءات: أرشفوه بدل حذفه.'), 'error') }
    })
  }
  const lies = new Set(c.dossiers.map((d) => d.id))
  const s = c.solde

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <nav aria-label={tr('مسار التنقل')} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: '#5E6B67' }}>
        <Link href="/clients" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>{tr('الموكلون')}</Link><span aria-hidden>‹</span><span style={{ color: '#15201E' }}>{c.nom}</span>
      </nav>

      <section style={{ ...CARTE, padding: '24px 26px', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
            <span style={{ width: 56, height: 56, borderRadius: 16, background: '#0E5A4E', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{c.type === 'SOCIETE' ? <Building2 size={26} aria-hidden /> : <UserRound size={26} aria-hidden />}</span>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, lineHeight: 1.3 }}>{c.nom}</h1>
              <span style={{ fontSize: 14, color: '#5E6B67' }}>{c.type === 'SOCIETE' ? tr('شركة') : tr('شخص ذاتي')}{c.estArchive ? tr(' · مؤرشف') : ''}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {c.telephone && <a href={`tel:${c.telephone}`} style={{ ...BTN, gap: 6 }}><Phone size={16} aria-hidden />{tr('اتصال')}</a>}
            <button type="button" onClick={() => setEdition(true)} style={{ ...BTN, gap: 6 }}><Pencil size={16} aria-hidden />{tr('تعديل')}</button>
            <Link href={`/facturation/nouvelle?client=${c.id}`} className="mp-action" style={{ ...BTN, gap: 6, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0 }}><Receipt size={16} aria-hidden />{tr('فاتورة')}</Link>
            <button type="button" onClick={() => setReglement(true)} style={{ ...BTN, gap: 6 }}><Wallet size={16} aria-hidden />{tr('تسجيل أداء')}</button>
          </div>
        </div>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, borderTop: '1px solid #EEEAE1', paddingTop: 16 }}>
          {([[tr('الهاتف'), c.telephone, true], [tr('البريد'), c.email, true], [c.type === 'SOCIETE' ? 'ICE' : tr('البطاقة الوطنية'), c.type === 'SOCIETE' ? c.ice : c.cin, true], [tr('السجل التجاري'), c.type === 'SOCIETE' ? c.rc : null, true], [tr('الممثل القانوني'), c.representant, false], [tr('العنوان'), [c.adresse, c.ville].filter(Boolean).join(' — '), false]] as const)
            .filter(([, v]) => v).map(([k, v, n]) => <div key={k}><dt style={{ fontSize: 13, color: '#5E6B67' }}>{k}</dt><dd className={n ? 'num' : undefined} style={{ margin: 0, fontSize: 15, fontWeight: 600, textAlign: 'start' }}>{v}</dd></div>)}
        </dl>
        {c.notes && <p style={{ margin: 0, fontSize: 14, color: '#3B4A47', background: '#F5F3EE', borderRadius: 12, padding: 12, whiteSpace: 'pre-wrap' }}>{c.notes}</p>}
      </section>

      <section aria-label={tr('الحساب')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {[[tr('مفوتر'), s.factureCentimes, '#15201E'], [tr('مؤدى'), s.regleCentimes, '#0B4A40'], [tr('الباقي على الفواتير'), s.resteCentimes, s.resteCentimes > 0 ? '#7A4E06' : '#0B4A40'], ...(s.resteSurConvenuCentimes != null ? [[tr('الباقي من المتفق عليه'), s.resteSurConvenuCentimes, s.resteSurConvenuCentimes > 0 ? '#7A4E06' : '#0B4A40']] : [])].map(([l, v, col]) => (
          <div key={l as string} style={{ ...CARTE, padding: 16, gap: 4 }}><span style={{ fontSize: 13, color: '#5E6B67' }}>{l as string}</span><strong className="num" style={{ fontSize: 22, color: col as string, textAlign: 'start' }}>{dh(v as number)}</strong></div>
        ))}
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section style={CARTE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ ...H2, display: 'flex', gap: 10, alignItems: 'center' }}><FolderOpen size={20} color="#0E5A4E" aria-hidden />{tr('الملفات')}</h2><button type="button" onClick={() => setLierDossier((v) => !v)} style={{ ...BTN, gap: 4 }}><Plus size={16} aria-hidden />{tr('ربط ملف')}</button></div>
            {lierDossier && (
              <select defaultValue="" onChange={(e) => e.target.value && action('lier', () => apiFetch(`/clients/${id}/dossiers/${e.target.value}`, { method: 'PUT' }), tr('رُبط الملف.')).then(() => setLierDossier(false))} style={INPUT} aria-label={tr('اختيار ملف')}>
                <option value="">{tr('— اختاروا ملفاً —')}</option>
                {(dossiersLibres ?? []).filter((d) => !lies.has(d.id)).map((d) => <option key={d.id} value={d.id}>{d.numeroDossier}{d.titreAffaire ? ` — ${d.titreAffaire.slice(0, 60)}` : ''}</option>)}
              </select>
            )}
            {c.dossiers.length === 0 ? <EtatVide Icon={FolderOpen} texte={tr('لا ملفات مرتبطة بهذا الموكل.')} /> : c.dossiers.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, background: '#F5F3EE' }}>
                <Link href={`/dossiers/${d.id}`} style={{ flex: 1, minWidth: 0, color: '#15201E', textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
                  <strong className="num" style={{ textAlign: 'start' }}>{d.numeroDossier}</strong>
                  <span style={{ fontSize: 13, color: '#5E6B67' }}>{tribunalAr(d.tribunal)}{d.titreAffaire ? ` · ${d.titreAffaire.slice(0, 70)}` : ''}{!d.estActif ? tr(' · مؤرشف') : ''}</span>
                </Link>
                {d.honorairesConvenusCentimes != null && <span className="num" style={{ fontSize: 13, color: '#3B4A47' }}>{dh(d.honorairesConvenusCentimes)}</span>}
                <button type="button" aria-label={tr('فك الربط')} title={tr('فك الربط')} disabled={occupe} onClick={() => action(`delier:${d.id}`, () => apiFetch(`/clients/${id}/dossiers/${d.id}`, { method: 'DELETE' }), tr('فُك الربط.'))} style={{ ...BTN, padding: 0, width: 40, minHeight: 40, justifyContent: 'center', borderRadius: '50%' }}><X size={16} aria-hidden /></button>
              </div>
            ))}
          </section>

          <section style={CARTE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ ...H2, display: 'flex', gap: 10, alignItems: 'center' }}><Receipt size={20} color="#0E5A4E" aria-hidden />{tr('الفواتير')}</h2><Link href={`/facturation/nouvelle?client=${c.id}`} style={{ ...BTN, gap: 4 }}><Plus size={16} aria-hidden />{tr('فاتورة')}</Link></div>
            {c.factures.length === 0 ? <EtatVide Icon={FileText} texte={tr('لا فواتير بعد.')} /> : c.factures.map((f) => {
              const regle = f.reglements.reduce((x, r) => x + r.montantCentimes, 0)
              const etat = etatFacture({ statut: f.statut, etatPaiement: (regle >= f.totalTtcCentimes ? 'PAYEE' : regle > 0 ? 'PARTIELLE' : 'NON_PAYEE') as EtatPaiement })
              return (
                <Link key={f.id} href={`/facturation/${f.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, background: '#F5F3EE', color: '#15201E', textDecoration: 'none', flexWrap: 'wrap' }}>
                  <span style={{ flex: 1, minWidth: 140 }}><strong>{TYPE_FACTURE[f.type]}</strong> {f.numero ? <span className="num">{f.numero}</span> : <span style={{ color: '#5E6B67' }}>{tr('(مسودة)')}</span>}<br /><span className="num" style={{ fontSize: 13, color: '#5E6B67' }}>{fmtDate(f.dateEmission ?? f.createdAt)}</span></span>
                  <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '2px 10px', background: etat.bg, color: etat.fg }}>{etat.label}</span>
                  <strong className="num">{dh(f.totalTtcCentimes)}</strong>
                </Link>
              )
            })}
          </section>
        </div>

        <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section style={{ ...CARTE, padding: 20 }}>
            <h2 style={{ ...H2, display: 'flex', gap: 10, alignItems: 'center' }}><MessageSquare size={20} color="#0E5A4E" aria-hidden />{tr('سجل التواصل')}</h2>
            <form onSubmit={ajouterEchange} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div role="radiogroup" aria-label={tr('نوع التواصل')} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(Object.keys(TYPES_ECHANGE) as (keyof typeof TYPES_ECHANGE)[]).map((k) => <button key={k} type="button" role="radio" aria-checked={echange.type === k} className={echange.type === k ? 'mp-choix' : ''} onClick={() => setEchange((x) => ({ ...x, type: k }))} style={{ ...BTN, minHeight: 36, fontSize: 13, padding: '0 12px' }}>{TYPES_ECHANGE[k]}</button>)}
              </div>
              <textarea value={echange.resume} onChange={(e) => setEchange((x) => ({ ...x, resume: e.target.value }))} rows={2} placeholder={tr('ملخص: ماذا قيل، ماذا طُلب…')} aria-label={tr('الملخص')} style={{ ...INPUT, padding: 10, minHeight: 64, resize: 'vertical' }} />
              <button type="submit" disabled={occupe || !echange.resume.trim()} style={{ ...BTN, alignSelf: 'flex-start' }}><Attente actif={cle === 'echange'} texte="…" sombre>{tr('تسجيل')}</Attente></button>
            </form>
            {c.interactions.length === 0 ? <span style={{ fontSize: 14, color: '#5E6B67' }}>{tr('لا شيء مسجّل بعد.')}</span> : (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.interactions.map((it) => (
                  <li key={it.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, background: '#E3F0EC', color: '#0B4A40', borderRadius: 999, padding: '2px 10px', flex: 'none' }}>{TYPES_ECHANGE[it.type]}</span>
                    <span style={{ flex: 1, fontSize: 14, lineHeight: 1.6 }}>{it.resume}<br /><span className="num" style={{ fontSize: 12, color: '#5E6B67' }}>{fmtDate(it.date)}</span></span>
                    <button type="button" aria-label={tr('حذف')} onClick={() => action(`it:${it.id}`, () => apiFetch(`/clients/${id}/interactions/${it.id}`, { method: 'DELETE' }), tr('حُذف.'))} style={{ border: 0, background: 'transparent', color: '#5E6B67', cursor: 'pointer', minWidth: 36, minHeight: 36 }}><Trash2 size={15} aria-hidden /></button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section style={{ ...CARTE, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ ...H2, display: 'flex', gap: 10, alignItems: 'center' }}><Wallet size={20} color="#0E5A4E" aria-hidden />{tr('الأداءات')}</h2><button type="button" onClick={() => setReglement(true)} style={{ ...BTN, gap: 4, minHeight: 40 }}><Plus size={16} aria-hidden />{tr('أداء')}</button></div>
            {c.reglements.length === 0 ? <span style={{ fontSize: 14, color: '#5E6B67' }}>{tr('لا أداءات بعد.')}</span> : c.reglements.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <span style={{ flex: 1 }}>{MODE[r.mode]}{r.reference ? <> · <span className="num">{r.reference}</span></> : ''}<br /><span style={{ fontSize: 12, color: '#5E6B67' }}><span className="num">{fmtDate(r.date)}</span> · {r.facture?.numero ? <>{tr('فاتورة')}{' '}<span className="num">{r.facture.numero}</span></> : tr('تسبيق')}</span></span>
                <strong className="num">{dh(r.montantCentimes)}</strong>
              </div>
            ))}
          </section>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" disabled={occupe} onClick={() => action('archive', () => apiFetch(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify({ estArchive: !c.estArchive }) }), c.estArchive ? tr('استُرجع الموكل.') : tr('أُرشف الموكل.'))} style={{ ...BTN, gap: 6 }}>
              {c.estArchive ? <ArchiveRestore size={16} aria-hidden /> : <Archive size={16} aria-hidden />}{c.estArchive ? tr('استرجاع') : tr('أرشفة')}
            </button>
            <button type="button" disabled={occupe} onClick={supprimer} style={{ ...BTN, gap: 6, color: '#9B2C20', borderColor: '#F0C9C2' }}><Trash2 size={16} aria-hidden />{tr('حذف')}</button>
          </div>
        </div>
      </div>

      {edition && <FormulaireClient initial={c} onFerme={() => setEdition(false)} onCree={() => { setEdition(false); refetch() }} />}
      {reglement && <FormulaireReglement clientId={c.id} dossiers={c.dossiers} factures={c.factures.filter((f) => f.statut === 'EMISE' && f.type !== 'AVOIR').map((f) => ({ id: f.id, numero: f.numero, resteCentimes: f.totalTtcCentimes - f.reglements.reduce((x, r) => x + r.montantCentimes, 0) }))} onFerme={() => setReglement(false)} onFait={() => { setReglement(false); refetch() }} />}
    </div>
  )
}
