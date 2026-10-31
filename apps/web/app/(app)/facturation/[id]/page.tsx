'use client'
// Facture : création (/facturation/nouvelle?client=&dossier=), édition du brouillon, émission, impression, encaissement, annulation par avoir.
import { Suspense, use, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Ban, Download, Plus, Printer, Send, Trash2, Wallet } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { Attente, ErreurChargement, SqueletteFiche, useEnvoi } from '@/components/ui/Chargement'
import { BTN, fmtDate } from '@/components/legal/DeadlineCard'
import { FormulaireReglement } from '@/components/legal/FormulaireReglement'
import { CARTE, H2, INPUT, LABEL, MODE, TAUX_TVA, TYPE_FACTURE, centimesVersSaisie, dh, etatFacture, totaux, versCentimes, type Client, type Facture, type Profil, type TypeFacture } from '@/lib/facturation'
import { documentWord, factureHtml } from '@/lib/pack/documents'
import { telecharger } from '@/lib/zip'
import { t as tr } from '@/lib/langue'

interface LigneSaisie { designation: string; quantite: string; prix: string }
const ERREURS: Record<string, string> = {
  PROFIL_INCOMPLET: tr('أكملوا ICE والتعريف الضريبي للمكتب في «معلومات المكتب» قبل الإصدار.'),
  ICE_CLIENT: tr('المعرّف الموحد (ICE) للموكل (شركة) إلزامي على الفاتورة: أضيفوه في بطاقة الموكل.'),
  DATE_ANTERIEURE: tr('التاريخ أقدم من آخر فاتورة مصدرة: يجب أن يبقى الترقيم متسلسلاً زمنياً.'),
  DATE_FUTURE: tr('لا يمكن إصدار فاتورة بتاريخ لاحق.'),
  MONTANT_NUL: tr('مبلغ الفاتورة منعدم.'),
}
const aujourdHui = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export default function FacturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <Suspense fallback={<SqueletteFiche />}>{id === 'nouvelle' ? <Editeur /> : <Fiche id={id} />}</Suspense>
}

function Fiche({ id }: { id: string }) {
  const { data: f, loading, error, refetch } = useApi<Facture>(`/facturation/factures/${id}`)
  if (loading && !f) return <SqueletteFiche />
  if (!f) return error ? <ErreurChargement quoi={tr('الفاتورة')} onReessayer={refetch} /> : null
  return f.statut === 'BROUILLON' ? <Editeur facture={f} onChange={refetch} /> : <Emise f={f} onChange={refetch} />
}

/** Création ou modification d'un brouillon. */
function Editeur({ facture, onChange }: { facture?: Facture; onChange?: () => void }) {
  const router = useRouter()
  const params = useSearchParams()
  const { toast } = useToast()
  const { cle, occupe, lancer } = useEnvoi()
  const [clientId, setClientId] = useState(facture?.clientId ?? params.get('client') ?? '')
  const [dossierId, setDossierId] = useState(facture?.dossierId ?? params.get('dossier') ?? '')
  const [type, setType] = useState<TypeFacture>(facture?.type ?? 'NOTE_HONORAIRES')
  const [taux, setTaux] = useState<string>(facture ? String(facture.tauxTva) : '')
  const [lignes, setLignes] = useState<LigneSaisie[]>(facture?.lignes.map((l) => ({ designation: l.designation, quantite: String(l.quantite).replace('.', ','), prix: centimesVersSaisie(l.prixUnitaireCentimes) })) ?? [{ designation: tr('أتعاب'), quantite: '1', prix: '' }])
  const [echeance, setEcheance] = useState(facture?.dateEcheance?.slice(0, 10) ?? '')
  const [modePaiement, setModePaiement] = useState(facture?.modePaiement ?? '')
  const [notes, setNotes] = useState(facture?.notes ?? '')
  const [dateEmission, setDateEmission] = useState(aujourdHui())
  const { data: clients } = useApi<{ id: string; nom: string; type: string }[]>('/clients')
  // ICE et IF du cabinet manquants : prévenu avant d'émettre, avec le lien vers « معلومات المكتب »
  const { data: profilCabinet } = useApi<Profil>('/facturation/profil')
  const profilIncomplet = !!profilCabinet && (!profilCabinet.ice || !profilCabinet.identifiantFiscal)
  const { data: fiche } = useApi<Client & { dossiers: { id: string; numeroDossier: string; honorairesConvenusCentimes: number | null }[] }>(clientId ? `/clients/${clientId}` : null)

  // Un dossier choisi sans client (lien depuis la fiche dossier) : pas de pré-remplissage ici, le client est demandé
  useEffect(() => { if (fiche && dossierId && !fiche.dossiers.some((d) => d.id === dossierId)) setDossierId('') }, [fiche, dossierId])
  useEffect(() => { if (!facture && fiche?.type === 'SOCIETE') setType('FACTURE') }, [fiche, facture])

  const lues = lignes.map((l) => ({ designation: l.designation.trim(), quantite: Number(l.quantite.replace(',', '.')), prixUnitaireCentimes: versCentimes(l.prix) ?? NaN }))
  const valides = lues.every((l) => l.designation && l.quantite > 0 && Number.isFinite(l.prixUnitaireCentimes))
  const t = totaux(valides ? lues : [], Number(taux) || 0)
  const pret = !!clientId && taux !== '' && valides

  const corps = () => ({ type, clientId, dossierId: dossierId || null, lignes: lues, tauxTva: Number(taux), dateEcheance: echeance ? new Date(`${echeance}T12:00:00`).toISOString() : null, modePaiement: modePaiement || null, notes: notes || null })
  const sauver = async (): Promise<string> => {
    if (facture) { await apiFetch(`/facturation/factures/${facture.id}`, { method: 'PATCH', body: JSON.stringify(corps()) }); return facture.id }
    const r = await apiFetch<{ id: string }>('/facturation/factures', { method: 'POST', body: JSON.stringify(corps()) })
    return r.id
  }
  const enregistrer = () => lancer('sauver', async () => {
    try { const fid = await sauver(); toast(tr('حُفظت المسودة.'), 'success'); if (!facture) router.replace(`/facturation/${fid}`); else onChange?.() } catch { toast(tr('تعذّر الحفظ. تحقّقوا من الحقول.'), 'error') }
  })
  const emettre = () => {
    if (!window.confirm(tr('بعد الإصدار يُعطى للفاتورة رقم نهائي ولا يمكن تعديلها أو حذفها (الإلغاء يتم بفاتورة مضادة). متابعة؟'))) return
    lancer('emettre', async () => {
      try {
        const fid = await sauver()
        await apiFetch(`/facturation/factures/${fid}/emettre`, { method: 'POST', body: JSON.stringify({ dateEmission: new Date(`${dateEmission}T12:00:00`).toISOString() }) })
        toast(tr('صدرت الفاتورة.'), 'success')
        if (!facture) router.replace(`/facturation/${fid}`); else onChange?.()
      } catch (e: any) {
        // L'erreur mène directement à l'endroit où compléter l'ICE
        const code = e?.message as string
        toast(ERREURS[code] ?? tr('تعذّر الإصدار.'), 'error',
          code === 'PROFIL_INCOMPLET' ? { label: tr('فتح معلومات المكتب'), onClick: () => router.push('/facturation?onglet=profil') }
            : code === 'ICE_CLIENT' && clientId ? { label: tr('فتح بطاقة الموكل'), onClick: () => router.push(`/clients/${clientId}?modifier=1`) } : undefined)
      }
    })
  }
  const supprimer = () => facture && window.confirm(tr('حذف المسودة؟')) && lancer('suppr', async () => {
    try { await apiFetch(`/facturation/factures/${facture.id}`, { method: 'DELETE' }); router.push('/facturation') } catch { toast(tr('تعذّر الحذف.'), 'error') }
  })
  const majLigne = (i: number, k: keyof LigneSaisie, v: string) => setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)))
  const dossierChoisi = fiche?.dossiers.find((d) => d.id === dossierId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <nav aria-label={tr('مسار التنقل')} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: '#5E6B67' }}>
        <Link href="/facturation" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>{tr('الفوترة')}</Link><span aria-hidden>‹</span><span style={{ color: '#15201E' }}>{facture ? tr('مسودة') : tr('فاتورة جديدة')}</span>
      </nav>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>{facture ? tr('مسودة {v0}', { v0: TYPE_FACTURE[type] }) : tr('فاتورة جديدة')}</h1>

      <section style={CARTE}>
        <div role="radiogroup" aria-label={tr('نوع الوثيقة')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['NOTE_HONORAIRES', 'FACTURE'] as const).map((v) => <button key={v} type="button" role="radio" aria-checked={type === v} className={type === v ? 'mp-choix' : ''} onClick={() => setType(v)} style={{ ...BTN, flex: '1 1 160px', justifyContent: 'center' }}>{TYPE_FACTURE[v]}</button>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <label style={LABEL}>{tr('الموكل *')}
            <select value={clientId} onChange={(e) => { setClientId(e.target.value); setDossierId('') }} style={INPUT}>
              <option value="">{tr('— اختاروا —')}</option>
              {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            {!clients?.length && <Link href="/clients" style={{ fontWeight: 400 }}>{tr('أضيفوا موكلاً أولاً')}</Link>}
          </label>
          <label style={LABEL}>{tr('الملف')}
            <select value={dossierId} onChange={(e) => setDossierId(e.target.value)} disabled={!fiche} style={INPUT}>
              <option value="">{tr('— دون ملف —')}</option>
              {(fiche?.dossiers ?? []).map((d) => <option key={d.id} value={d.id}>{d.numeroDossier}</option>)}
            </select>
            {dossierChoisi?.honorairesConvenusCentimes != null && <span style={{ fontWeight: 400, color: '#5E6B67' }}>{tr('المتفق عليه:')}{' '}{dh(dossierChoisi.honorairesConvenusCentimes)}</span>}
          </label>
          <label style={LABEL}>{tr('الرسم على القيمة المضافة *')}
            <select value={taux} onChange={(e) => setTaux(e.target.value)} style={INPUT} required>
              <option value="">{tr('— اختاروا السعر —')}</option>
              {TAUX_TVA.map((x) => <option key={x} value={x}>{x} %</option>)}
            </select>
          </label>
        </div>
        {profilIncomplet && <span role="note" style={{ fontSize: 13, color: '#7A4E06', background: '#FDF1DC', borderRadius: 10, padding: '8px 12px' }}>{tr('لإصدار فاتورة: أدخلوا ICE والتعريف الضريبي (IF) لمكتبكم مرة واحدة في')}{' '}<Link href="/facturation?onglet=profil" style={{ fontWeight: 600 }}>{tr('الفوترة › معلومات المكتب')}</Link>.</span>}
        {fiche?.type === 'SOCIETE' && !fiche.ice && <span style={{ fontSize: 13, color: '#7A4E06' }}>{tr('الموكل شركة دون ICE: أضيفوه في')}{' '}<Link href={`/clients/${fiche.id}`}>{tr('بطاقته')}</Link>{' '}{tr('قبل الإصدار.')}</span>}
      </section>

      <section style={CARTE}>
        <h2 style={H2}>{tr('البيانات')}</h2>
        {lignes.map((l, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(70px, .7fr) minmax(110px, 1.2fr) auto', gap: 8, alignItems: 'end' }}>
            <label style={LABEL}>{i === 0 ? tr('البيان') : <span className="sr-only-ar">{tr('البيان')}</span>}<input value={l.designation} onChange={(e) => majLigne(i, 'designation', e.target.value)} style={INPUT} placeholder={tr('أتعاب المرحلة الابتدائية…')} /></label>
            <label style={LABEL}>{i === 0 ? tr('الكمية') : <span className="sr-only-ar">{tr('الكمية')}</span>}<input value={l.quantite} onChange={(e) => majLigne(i, 'quantite', e.target.value)} inputMode="decimal" className="num" style={{ ...INPUT, textAlign: 'start' }} /></label>
            <label style={LABEL}>{i === 0 ? tr('الثمن دون رسوم') : <span className="sr-only-ar">{tr('الثمن')}</span>}<input value={l.prix} onChange={(e) => majLigne(i, 'prix', e.target.value)} inputMode="decimal" className="num" style={{ ...INPUT, textAlign: 'start' }} /></label>
            <button type="button" aria-label={tr('حذف السطر')} disabled={lignes.length === 1} onClick={() => setLignes((ls) => ls.filter((_, j) => j !== i))} style={{ ...BTN, padding: 0, width: 44, justifyContent: 'center', borderRadius: '50%' }}><Trash2 size={16} aria-hidden /></button>
          </div>
        ))}
        <button type="button" onClick={() => setLignes((ls) => [...ls, { designation: '', quantite: '1', prix: '' }])} style={{ ...BTN, alignSelf: 'flex-start', gap: 4 }}><Plus size={16} aria-hidden />{tr('سطر')}</button>
        <dl style={{ margin: 0, alignSelf: 'flex-end', minWidth: 260, display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 18px', fontSize: 15 }}>
          <dt>{tr('المجموع دون رسوم')}</dt><dd className="num" style={{ margin: 0 }}>{dh(t.ht)}</dd>
          <dt>{tr('الرسم (')}{taux || '—'} %)</dt><dd className="num" style={{ margin: 0 }}>{dh(t.tva)}</dd>
          <dt style={{ fontWeight: 700 }}>{tr('المجموع مع الرسوم')}</dt><dd className="num" style={{ margin: 0, fontWeight: 700 }}>{dh(t.ttc)}</dd>
        </dl>
      </section>

      <section style={CARTE}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <label style={LABEL}>{tr('أجل الأداء')}<input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} style={INPUT} /></label>
          <label style={LABEL}>{tr('طريقة الأداء المذكورة')}<input value={modePaiement} onChange={(e) => setModePaiement(e.target.value)} placeholder={tr('تحويل بنكي / شيك')} style={INPUT} /></label>
          <label style={LABEL}>{tr('تاريخ الإصدار')}<input type="date" value={dateEmission} max={aujourdHui()} onChange={(e) => setDateEmission(e.target.value)} style={INPUT} /></label>
        </div>
        <label style={LABEL}>{tr('ملاحظة على الفاتورة')}<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...INPUT, padding: 10, minHeight: 60 }} /></label>
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button type="button" className="mp-action" onClick={emettre} disabled={!pret || occupe} style={{ ...BTN, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, gap: 8, minHeight: 48, padding: '0 22px' }}><Attente actif={cle === 'emettre'} texte={tr('جارٍ الإصدار…')}><Send size={18} aria-hidden />{tr('إصدار وترقيم')}</Attente></button>
        <button type="button" onClick={enregistrer} disabled={!pret || occupe} style={{ ...BTN, minHeight: 48 }}><Attente actif={cle === 'sauver'} texte={tr('جارٍ الحفظ…')} sombre>{tr('حفظ كمسودة')}</Attente></button>
        {facture && <button type="button" onClick={supprimer} disabled={occupe} style={{ ...BTN, minHeight: 48, color: '#9B2C20', borderColor: '#F0C9C2', gap: 6 }}><Trash2 size={16} aria-hidden />{tr('حذف')}</button>}
      </div>
      {!pret && <span style={{ fontSize: 13, color: '#5E6B67' }}>{tr('للحفظ: اختاروا الموكل وسعر الرسم، واملؤوا كل سطر.')}</span>}
    </div>
  )
}

/** Facture émise ou annulée : aperçu imprimable, Word, encaissements, annulation. */
function Emise({ f, onChange }: { f: Facture; onChange: () => void }) {
  const router = useRouter()
  const { toast } = useToast()
  const { cle, occupe, lancer } = useEnvoi()
  const [reglement, setReglement] = useState(false)
  const cadre = useRef<HTMLIFrameElement>(null)
  const titre = `${TYPE_FACTURE[f.type]} ${f.numero}`
  const html = useMemo(() => documentWord(titre, factureHtml(f, f.emetteur ?? {}, f.destinataire ?? { nom: f.client.nom })), [f, titre])
  const etat = etatFacture(f)
  const annuler = () => {
    const motif = window.prompt(tr('سبب الإلغاء (يظهر على الفاتورة المضادة):'), '')
    if (motif === null) return
    lancer('annuler', async () => {
      try { const a = await apiFetch<{ id: string }>(`/facturation/factures/${f.id}/annuler`, { method: 'POST', body: JSON.stringify({ motif }) }); toast(tr('أُلغيت الفاتورة بفاتورة مضادة.'), 'success'); router.push(`/facturation/${a.id}`) }
      catch { toast(tr('تعذّر الإلغاء.'), 'error') }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <nav aria-label={tr('مسار التنقل')} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: '#5E6B67' }}>
        <Link href="/facturation" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>{tr('الفوترة')}</Link><span aria-hidden>‹</span><span className="num" style={{ color: '#15201E' }}>{f.numero}</span>
      </nav>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>{TYPE_FACTURE[f.type]} <span className="num">{f.numero}</span></h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: '#3B4A47', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href={`/clients/${f.client.id}`} style={{ fontWeight: 600 }}>{f.client.nom}</Link> · <span className="num">{fmtDate(f.dateEmission!)}</span>
            <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '2px 10px', background: etat.bg, color: etat.fg }}>{etat.label}</span>
          </p>
          {f.avoir && <p style={{ margin: '6px 0 0', fontSize: 14 }}>{tr('أُلغيت بالفاتورة المضادة')}{' '}<Link href={`/facturation/${f.avoir.id}`} className="num">{f.avoir.numero}</Link></p>}
          {f.factureOrigine && <p style={{ margin: '6px 0 0', fontSize: 14 }}>{tr('تلغي الفاتورة')}{' '}<Link href={`/facturation/${f.factureOrigine.id}`} className="num">{f.factureOrigine.numero}</Link></p>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" onClick={() => cadre.current?.contentWindow?.print()} style={{ ...BTN, gap: 6 }}><Printer size={16} aria-hidden />{tr('طباعة / PDF')}</button>
          <button type="button" onClick={() => telecharger(new Blob(['﻿', html], { type: 'application/msword' }), `${titre}.doc`)} style={{ ...BTN, gap: 6 }}><Download size={16} aria-hidden />Word</button>
          {f.statut === 'EMISE' && f.type !== 'AVOIR' && <>
            {f.resteCentimes > 0 && <button type="button" className="mp-action" onClick={() => setReglement(true)} style={{ ...BTN, gap: 6, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0 }}><Wallet size={16} aria-hidden />{tr('تسجيل أداء')}</button>}
            <button type="button" onClick={annuler} disabled={occupe} style={{ ...BTN, gap: 6, color: '#9B2C20', borderColor: '#F0C9C2' }}><Attente actif={cle === 'annuler'} texte="…" sombre><Ban size={16} aria-hidden />{tr('إلغاء بفاتورة مضادة')}</Attente></button>
          </>}
        </div>
      </div>

      {f.type !== 'AVOIR' && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          {[[tr('المبلغ'), f.totalTtcCentimes], [tr('مؤدى'), f.regleCentimes], [tr('الباقي'), f.resteCentimes]].map(([l, v]) => <div key={l as string} style={{ ...CARTE, padding: 16, gap: 4 }}><span style={{ fontSize: 13, color: '#5E6B67' }}>{l as string}</span><strong className="num" style={{ fontSize: 21, textAlign: 'start' }}>{dh(v as number)}</strong></div>)}
        </section>
      )}

      {f.reglements.length > 0 && (
        <section style={CARTE}>
          <h2 style={H2}>{tr('الأداءات')}</h2>
          {f.reglements.map((r) => <div key={r.id} style={{ display: 'flex', gap: 10, fontSize: 14 }}><span className="num" style={{ flex: 1 }}>{fmtDate(r.date)}</span><span>{MODE[r.mode]}{r.reference ? <> · <span className="num">{r.reference}</span></> : ''}</span><strong className="num">{dh(r.montantCentimes)}</strong></div>)}
        </section>
      )}

      <section style={{ ...CARTE, padding: 0, overflow: 'hidden' }}>
        <iframe ref={cadre} title={titre} srcDoc={html} style={{ border: 0, width: '100%', height: '80vh', background: '#FFFFFF' }} />
      </section>

      {reglement && <FormulaireReglement clientId={f.clientId} factureId={f.id} montantPropose={f.resteCentimes} factures={[{ id: f.id, numero: f.numero, resteCentimes: f.resteCentimes }]} onFerme={() => setReglement(false)} onFait={() => { setReglement(false); onChange() }} />}
    </div>
  )
}

