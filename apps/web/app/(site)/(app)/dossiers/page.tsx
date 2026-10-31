'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, X } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { useTribunaux } from '@/hooks/useTribunaux'
import { useToast, useActionAnnulable } from '@/components/Toast'
import { useRestaurerDefilement } from '@/hooks/useDefilement'
import { labelProcedure } from '@/lib/labels'
import { AjoutDossier } from '@/components/legal/AjoutDossier'
import { joursRestants, tone, fmtJM, jourSemaine, heure, titreDelai, JOUR_MS } from '@/components/legal/DeadlineCard'
import { SqueletteListe, Nombre, ErreurChargement, useEnvoi, Attente } from '@/components/ui/Chargement'
import { t as tr } from '@/lib/langue'

interface Dossier {
  id: string
  numeroDossier: string
  tribunal: string
  typeProcedure?: string
  titreAffaire?: string | null
  statutIA?: string
  updatedAt: string
  dernierEvenement?: { texteArabe: string; datePublicationGreffe: string } | null
  prochaineEcheance?: { id: string; typeDelai: string; descriptionAr: string | null; description: string; dateLimite: string; camp: 'AGIR' | 'SURVEILLER' } | null
  prochaineAudience?: { dateAudience: string } | null
}

type Onglet = 'tous' | 'agir' | 'surveiller' | 'semaine' | 'dormants' | 'archives'
interface PageDossiers { total: number; compteurs: Record<Onglet, number>; tribunaux: string[]; procedures: string[]; items: Dossier[] }
const TAILLE = 50
const DELAI_COURT: Record<string, string> = { APPEL: tr('استئناف'), OPPOSITION: tr('تعرّض'), CASSATION: tr('نقض'), TIERCE_OPPOSITION: tr('تعرّض الغير'), REQUETE_CIVILE: tr('إعادة النظر'), EXECUTION_JUGEMENT: tr('تنفيذ'), EXPERTISE: tr('خبرة'), NOTIFICATION_JUGEMENT: tr('تبليغ'), AUTRE: tr('أجل') }

const CSS = `
.ds-champ:focus-within{border-color:#0E5A4E !important;box-shadow:0 0 0 3px #CDE5DD}
.ds-fab{display:none}
@media (max-width: 900px){.ds-fab{display:inline-flex;position:fixed;inset-inline-end:16px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:45;width:56px;height:56px;border-radius:50%;border:0;background:var(--mp-action);color:var(--mp-action-texte);align-items:center;justify-content:center;box-shadow:0 12px 24px -10px rgba(156,82,10,.6);cursor:pointer}}
.mp-tbl th{font-size:13px;font-weight:600;color:#5E6B67;text-align:start;padding:12px 14px;border-bottom:1px solid #E4E0D6;white-space:nowrap}
.mp-tbl td{padding:14px;border-bottom:1px solid #EEEAE1;vertical-align:middle;font-size:14px}
.mp-tbl tbody tr:hover{background:#FAF8F3}
.mp-tbl tbody tr:last-child td{border-bottom:0}
.mp-cards{display:none}
@media (max-width: 760px){.mp-tblw{display:none !important}.mp-cards{display:flex !important}}
`
const CHIP: React.CSSProperties = { fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: '#FFFFFF', color: '#15201E', border: '1px solid #E4E0D6', borderRadius: 999, padding: '0 16px', minHeight: 40, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }
const CHIP_ON: React.CSSProperties = { ...CHIP, background: '#15201E', color: '#FFFFFF', border: 0 }
const SELECT: React.CSSProperties = { fontSize: 14, background: '#FFFFFF', color: '#15201E', border: '1px solid #E4E0D6', borderRadius: 10, padding: '0 12px', minHeight: 44 }
// Filtre appliqué = option choisie (orange clair, comme .mp-choix) : on voit d'un coup d'œil que la liste est filtrée
const SELECT_ON: React.CSSProperties = { ...SELECT, background: 'var(--mp-choix-fond)', border: '1px solid var(--mp-choix-bord)', boxShadow: 'inset 0 0 0 1px var(--mp-choix-bord)', fontWeight: 600 }
const BARRE_BTN: React.CSSProperties = { fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: 'transparent', color: '#FFFFFF', border: '1px solid #5E6B67', borderRadius: 999, padding: '0 14px', minHeight: 40, cursor: 'pointer' }
const sansMouvement = (d: Dossier) => Math.floor((Date.now() - new Date(d.dernierEvenement?.datePublicationGreffe ?? d.updatedAt).getTime()) / JOUR_MS)
const resumeEvenement = (t: string) => (t.length > 42 ? `${t.slice(0, 40)}…` : t)

/** Badge « الأجل أو الموعد القادم » (maquette Liste des dossiers) */
function Prochain({ d }: { d: Dossier }) {
  const e = d.prochaineEcheance
  if (e) {
    const j = Math.max(0, joursRestants(e.dateLimite))
    const court = DELAI_COURT[e.typeDelai] ?? tr('أجل')
    if (e.camp === 'SURVEILLER') return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFFFFF', color: '#4D5B57', border: '1.5px dashed #8C877C', borderRadius: 999, padding: '3px 12px 3px 3px', fontSize: 13, fontWeight: 600 }}>
        <span className="num" style={{ background: '#EEEAE1', borderRadius: 999, minWidth: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{j}</span>{tr('الخصم ·')}{' '}{court}
      </span>
    )
    if (j <= 2) return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#C0392B', color: '#FFFFFF', borderRadius: 999, padding: '4px 12px 4px 4px', fontSize: 13, fontWeight: 600 }}>
        <span className="num" style={{ background: '#FFFFFF', color: '#C0392B', borderRadius: 999, minWidth: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{j}</span>{tr('عليكم ·')}{' '}{court}
      </span>
    )
    if (j <= 7) return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FDF3E1', color: '#7A4E06', border: '1px solid #F2A93B', borderRadius: 999, padding: '3px 12px 3px 3px', fontSize: 13, fontWeight: 600 }}>
        <span className="num" style={{ background: '#F2A93B', color: '#15201E', borderRadius: 999, minWidth: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{j}</span>{tr('عليكم ·')}{' '}{court}
      </span>
    )
    if (e.typeDelai === 'AUTRE') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F5F3EE', color: '#3B4A47', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>{titreDelai(e).replace('مراقبة تاريخ ', '')} <span className="num">{fmtJM(e.dateLimite)}</span></span>
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E3F0EC', color: '#0B4A40', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>{tr('عليكم ·')}{' '}{court} <span className="num">{fmtJM(e.dateLimite)}</span></span>
  }
  if (d.prochaineAudience) {
    const a = d.prochaineAudience.dateAudience
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EAF0F5', color: '#22476A', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>{tr('جلسة')}{' '}{jourSemaine(a)} <span className="num">{fmtJM(a)}{heure(a) ? ` · ${heure(a)}` : ''}</span></span>
  }
  const n = sansMouvement(d)
  if (n >= 90) return <span style={{ fontSize: 13, color: '#4D5B57' }}>{tr('بلا حركة منذ')}{' '}<span className="num">{n}</span>{' '}{tr('يوماً')}</span>
  return <span style={{ fontSize: 13, color: '#5E6B67' }}>—</span>
}

export default function DossiersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { tribunalAr, map: tribunauxMap } = useTribunaux()
  const [onglet, setOnglet] = useState<Onglet>('tous')
  const [q, setQ] = useState('')
  const [tribunal, setTribunal] = useState('')
  const [procedure, setProcedure] = useState('')
  const [tri, setTri] = useState<'urgence' | 'recent'>('urgence')
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [ajout, setAjout] = useState(false)
  const champ = useRef<HTMLInputElement>(null)
  const { masques, differer } = useActionAnnulable()

  // ?q=…  ?ajouter=1  ?focus=1 (liens du tableau de bord et de l'en-tête mobile)
  // Filtres gardés dans l'adresse (?onglet=agir&tribunal=…) : retour arrière, lien partagé ou rechargement
  // retrouvent la même vue.
  const [filtresLus, setFiltresLus] = useState(false)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('q')) setQ(p.get('q')!)
    const o = p.get('onglet') as Onglet | null
    if (o && ['tous', 'agir', 'surveiller', 'semaine', 'dormants', 'archives'].includes(o)) setOnglet(o)
    if (p.get('tribunal')) setTribunal(p.get('tribunal')!)
    if (p.get('procedure')) setProcedure(p.get('procedure')!)
    if (p.get('tri') === 'recent') setTri('recent')
    if (p.get('ajouter')) setAjout(true)
    if (p.get('focus')) champ.current?.focus()
    setFiltresLus(true)
  }, [])
  // Bouton « ملف جديد » de la barre latérale quand on est déjà sur cette page
  useEffect(() => { const ouvrir = () => setAjout(true); window.addEventListener('mp:ajout-dossier', ouvrir); return () => window.removeEventListener('mp:ajout-dossier', ouvrir) }, [])
  useEffect(() => {
    if (!filtresLus) return
    const p = new URLSearchParams()
    if (onglet !== 'tous') p.set('onglet', onglet)
    if (q.trim()) p.set('q', q.trim())
    if (tribunal) p.set('tribunal', tribunal)
    if (procedure) p.set('procedure', procedure)
    if (tri !== 'urgence') p.set('tri', tri)
    const url = `${window.location.pathname}${p.toString() ? `?${p}` : ''}`
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, '', url)
  }, [filtresLus, onglet, q, tribunal, procedure, tri])
  // Liste paginée côté serveur : onglets, recherche, filtres et tri sont calculés en base ; un grand cabinet
  // (des milliers de dossiers) ne charge que 50 lignes à la fois, « عرض المزيد » ajoute les suivantes.
  const [qServeur, setQServeur] = useState('')
  useEffect(() => { const t = setTimeout(() => setQServeur(q.trim()), 300); return () => clearTimeout(t) }, [q])
  const params = new URLSearchParams({ onglet, tri, taille: String(TAILLE) })
  if (qServeur) params.set('q', qServeur)
  if (tribunal) params.set('tribunal', tribunal)
  if (procedure) params.set('procedure', procedure)
  const cle = params.toString()
  const { data: page1, error, refetch } = useApi<PageDossiers>(filtresLus ? `/dossiers/liste?${cle}&page=1` : null)
  const [suite, setSuite] = useState<{ cle: string; pages: number; items: Dossier[] }>({ cle: '', pages: 1, items: [] })
  const enPlus = suite.cle === cle ? suite.items : []
  // Nouveau filtre : on repart de la 1re page (les pages déjà chargées pourraient être périmées ou en double)
  useEffect(() => { setSuite({ cle: '', pages: 1, items: [] }) }, [cle])
  const [chargeSuite, setChargeSuite] = useState(false)
  const chargerPlus = async () => {
    const pages = suite.cle === cle ? suite.pages : 1
    setChargeSuite(true)
    const p = await apiFetch<PageDossiers>(`/dossiers/liste?${cle}&page=${pages + 1}`).catch(() => null)
    setChargeSuite(false)
    if (!p) { toast(tr('تعذّر تحميل المزيد. أعيدوا المحاولة.'), 'error'); return }
    setSuite({ cle, pages: pages + 1, items: [...enPlus, ...p.items] })
  }
  const actualiser = () => { setSuite({ cle: '', pages: 1, items: [] }); refetch() }
  const compteurs = page1?.compteurs
  const total = page1?.total ?? 0
  const charges = (page1?.items.length ?? 0) + enPlus.length
  const liste = [...(page1?.items ?? []), ...enPlus].filter((d) => !masques.has(d.id))
  useRestaurerDefilement('/dossiers', !!page1 && filtresLus)

  const tribunauxPresents = page1?.tribunaux ?? []
  const proceduresPresentes = page1?.procedures ?? []
  const tousCoches = liste.length > 0 && liste.every((d) => selection.has(d.id))
  const basculer = (id: string) => setSelection((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const ids = Array.from(selection)
  const { cle: envoi, occupe, lancer } = useEnvoi()

  const rafraichir = () => lancer('sync', async () => {
    const r = await apiFetch<{ lances: number }>('/dossiers/scraper-lot', { method: 'POST', body: JSON.stringify({ ids }) }).catch(() => null)
    toast(r ? tr('بدأ تحديث {lances} {v1} من محاكم.', { lances: r.lances, v1: r.lances === 1 ? tr('ملف') : tr('ملفات') }) : tr('تعذّر بدء التحديث.'), r ? 'success' : 'error')
  })
  const archiver = () => lancer('archiver', async () => {
    const choisis = ids
    const ok = await apiFetch('/dossiers/archiver-lot', { method: 'POST', body: JSON.stringify({ ids: choisis }) }).then(() => true).catch(() => false)
    if (!ok) { toast(tr('تعذّرت الأرشفة. أعيدوا المحاولة.'), 'error'); return }
    // Réversible : « تراجع » restaure tout de suite les dossiers archivés
    toast(tr('أُرشف {length} {v1}.', { length: choisis.length, v1: choisis.length === 1 ? tr('ملف') : tr('ملفات') }), 'success', {
      label: tr('تراجع'),
      onClick: async () => { await Promise.all(choisis.map((id) => apiFetch(`/dossiers/${id}/restaurer`, { method: 'PATCH' }).catch(() => null))); actualiser() },
    })
    setSelection(new Set()); actualiser()
  })
  const restaurer = () => lancer('restaurer', async () => {
    await Promise.all(ids.map((id) => apiFetch(`/dossiers/${id}/restaurer`, { method: 'PATCH' }).catch(() => null)))
    setSelection(new Set()); actualiser()
  })
  const supprimer = () => {
    const choisis = ids
    setSelection(new Set())
    differer(choisis, tr('سيُحذف {length} {v1} نهائياً.', { length: choisis.length, v1: choisis.length === 1 ? tr('ملف') : tr('ملفات') }),
      () => Promise.all(choisis.map((id) => apiFetch(`/dossiers/${id}`, { method: 'DELETE' }))), actualiser)
  }
  const exporter = () => {
    const lignes = (liste.filter((d) => selection.has(d.id))).map((d) => [d.numeroDossier, d.titreAffaire ?? '', tribunalAr(d.tribunal), d.dernierEvenement?.texteArabe ?? '', d.prochaineEcheance ? `${titreDelai(d.prochaineEcheance)} ${fmtJM(d.prochaineEcheance.dateLimite)}` : ''])
    const csv = '﻿' + [[tr('الملف'), tr('الموضوع'), tr('المحكمة'), tr('آخر مستجد'), tr('الأجل القادم')], ...lignes].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `malafipro-dossiers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (ajout) {
    return (
      <div style={{ maxWidth: 860, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 20, padding: 32 }}>
        <AjoutDossier titre={tr('إضافة ملف')} onAjoute={(id) => router.push(`/dossiers/${id}`)} onAnnuler={() => setAjout(false)} />
      </div>
    )
  }

  const ONGLETS: { k: Onglet; label: string; dot?: boolean }[] = [
    { k: 'tous', label: tr('الكل') },
    { k: 'agir', label: tr('أجل عليكم'), dot: true },
    { k: 'surveiller', label: tr('تحت المراقبة') },
    { k: 'semaine', label: tr('جلسة هذا الأسبوع') },
    { k: 'dormants', label: tr('بلا حركة') },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{CSS}</style>
      {/* Mobile : « إضافة ملف » toujours à portée du pouce */}
      <button type="button" className="ds-fab mp-action" onClick={() => setAjout(true)} aria-label={tr('إضافة ملف')}><Plus size={24} aria-hidden /></button>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600 }}>{tr('الملفات')}</h1>
          <span style={{ fontSize: 15, color: '#3B4A47' }}><Nombre v={compteurs?.tous} />{' '}{tr('ملفاً قيد المتابعة · مرتبة حسب')}{' '}{tri === 'urgence' ? tr('الاستعجال') : tr('آخر مستجد')}</span>
        </div>
        <button className="mp-action" type="button" onClick={() => setAjout(true)} style={{ ...CHIP_ON, gap: 8, fontSize: 15, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', padding: '0 20px', minHeight: 46 }}><Plus size={18} aria-hidden />{tr('إضافة ملف')}</button>
      </div>

      <div role="tablist" aria-label={tr('تصفية الملفات')} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ONGLETS.map((o) => (
          <button key={o.k} type="button" role="tab" className="mp-choix" aria-selected={onglet === o.k} onClick={() => { setOnglet(o.k); setSelection(new Set()) }} style={onglet === o.k ? CHIP_ON : CHIP}>
            {o.dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C0392B' }} />}{o.label} <Nombre v={compteurs ? compteurs[o.k] : null} />
          </button>
        ))}
        <button type="button" role="tab" className="mp-choix" aria-selected={onglet === 'archives'} onClick={() => { setOnglet('archives'); setSelection(new Set()) }} style={onglet === 'archives' ? CHIP_ON : { ...CHIP, background: 'transparent', color: '#3B4A47', border: 0, padding: '0 12px' }}>{tr('المؤرشفة')}{compteurs?.archives ? <> <span className="num">{compteurs.archives}</span></> : null}</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <label className="ds-champ" style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: 10, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 10, padding: '0 14px', minHeight: 44, color: '#5E6B67' }}>
          <Search size={18} strokeWidth={1.8} aria-hidden />
          <span className="sr-only-ar">{tr('بحث في الملفات')}</span>
          <input ref={champ} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('رقم الملف أو اسم طرف')} style={{ flex: 1, minWidth: 0, minHeight: 42, border: 0, outline: 0, boxShadow: 'none', background: 'transparent', fontSize: 15, color: '#15201E' }} />
          {q && <button type="button" onClick={() => setQ('')} aria-label={tr('مسح البحث')} style={{ width: 40, height: 40, border: 0, background: 'transparent', color: '#5E6B67', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} aria-hidden /></button>}
        </label>
        <label><span className="sr-only-ar">{tr('المحكمة')}</span>
          <select value={tribunal} onChange={(e) => setTribunal(e.target.value)} style={tribunal ? SELECT_ON : SELECT}>
            <option value="">{tr('كل المحاكم')}</option>
            {tribunauxPresents.map((t) => <option key={t} value={t}>{(tribunauxMap as any)?.[t]?.nomAr ?? tribunalAr(t)}</option>)}
          </select>
        </label>
        <label><span className="sr-only-ar">{tr('نوع المسطرة')}</span>
          <select value={procedure} onChange={(e) => setProcedure(e.target.value)} style={procedure ? SELECT_ON : SELECT}>
            <option value="">{tr('كل المساطر')}</option>
            {proceduresPresentes.map((p) => <option key={p} value={p}>{labelProcedure(p)}</option>)}
          </select>
        </label>
        <label><span className="sr-only-ar">{tr('الترتيب')}</span>
          <select value={tri} onChange={(e) => setTri(e.target.value as 'urgence' | 'recent')} style={SELECT}>
            <option value="urgence">{tr('حسب الاستعجال')}</option>
            <option value="recent">{tr('حسب آخر مستجد')}</option>
          </select>
        </label>
      </div>

      {selection.size > 0 && (
        <div role="region" aria-label={tr('إجراءات جماعية')} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, background: '#15201E', color: '#FFFFFF', borderRadius: 14, padding: '8px 8px 8px 16px' }}>
          <strong style={{ fontSize: 14, fontWeight: 600, paddingInlineStart: 6 }}>{selection.size === 1 ? tr('ملف واحد محدد') : selection.size === 2 ? tr('ملفان محددان') : <><span className="num">{selection.size}</span>{' '}{tr('ملفات محددة')}</>}</strong>
          <span style={{ flex: 1 }} />
          {onglet === 'archives' ? <>
            <button type="button" onClick={restaurer} disabled={occupe} aria-busy={envoi === 'restaurer'} style={BARRE_BTN}><Attente actif={envoi === 'restaurer'} texte={tr('جارٍ الاسترجاع…')}>{tr('استرجاع')}</Attente></button>
            <button type="button" onClick={supprimer} disabled={occupe} style={{ ...BARRE_BTN, background: '#C0392B', border: 0 }}>{tr('حذف نهائي')}</button>
          </> : <>
            <button type="button" onClick={rafraichir} disabled={occupe} aria-busy={envoi === 'sync'} style={BARRE_BTN}><Attente actif={envoi === 'sync'} texte={tr('جارٍ الطلب…')}>{tr('تحديث من محاكم')}</Attente></button>
            <button type="button" onClick={exporter} style={BARRE_BTN}>{tr('تصدير')}</button>
            <button type="button" onClick={archiver} disabled={occupe} aria-busy={envoi === 'archiver'} style={{ ...BARRE_BTN, background: '#F5F3EE', color: '#15201E', border: 0 }}><Attente actif={envoi === 'archiver'} texte={tr('جارٍ الأرشفة…')} sombre>{tr('أرشفة')}</Attente></button>
          </>}
        </div>
      )}

      {!page1 && error ? (
        <ErreurChargement quoi={tr('الملفات')} onReessayer={refetch} />
      ) : !page1 ? (
        <SqueletteListe n={6} label={tr('جارٍ تحميل الملفات')} />
      ) : liste.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          <strong style={{ fontSize: 18, fontWeight: 600 }}>{q || tribunal || procedure ? tr('لا ملف يطابق البحث') : (compteurs?.tous ?? 0) === 0 && onglet === 'tous' ? tr('لا ملفات بعد') : tr('لا ملفات في هذا القسم')}</strong>
          <span style={{ fontSize: 15, color: '#3B4A47' }}>{(compteurs?.tous ?? 0) === 0 && onglet === 'tous' ? tr('أضيفوا أول ملف، وسنجلب مساره من محاكم خلال دقائق.') : tr('جرّبوا كلمة بحث أو تصفية أخرى.')}</span>
          {(compteurs?.tous ?? 0) === 0 && onglet === 'tous' && <button className="mp-action" type="button" onClick={() => setAjout(true)} style={{ ...CHIP_ON, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', minHeight: 46, padding: '0 20px' }}><Plus size={18} aria-hidden />{tr('إضافة ملف')}</button>}
        </div>
      ) : (
        <>
          <div className="mp-tblw" style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, overflowX: 'auto' }}>
            <table className="mp-tbl" style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={{ width: 44 }}><span className="sr-only-ar">{tr('تحديد')}</span><input type="checkbox" aria-label={tr('تحديد الكل')} checked={tousCoches} onChange={() => setSelection(tousCoches ? new Set() : new Set(liste.map((d) => d.id)))} style={{ width: 24, height: 24, margin: 0, accentColor: '#0E5A4E', cursor: 'pointer' }} /></th>
                <th>{tr('الملف')}</th><th>{tr('المحكمة')}</th><th>{tr('آخر مستجد')}</th><th>{tr('الأجل أو الموعد القادم')}</th><th><span className="sr-only-ar">{tr('فتح')}</span></th>
              </tr></thead>
              <tbody>
                {liste.map((d) => (
                  <tr key={d.id}>
                    <td><input type="checkbox" aria-label={tr('تحديد الملف {numeroDossier}', { numeroDossier: d.numeroDossier })} checked={selection.has(d.id)} onChange={() => basculer(d.id)} style={{ width: 24, height: 24, margin: 0, accentColor: '#0E5A4E', cursor: 'pointer' }} /></td>
                    <td><Link href={`/dossiers/${d.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 2, color: '#15201E', textDecoration: 'none' }}><strong style={{ fontWeight: 600 }}>{d.titreAffaire || labelProcedure(d.typeProcedure)}</strong><span className="num" style={{ fontSize: 13, color: '#5E6B67', textAlign: 'start' }}>{d.numeroDossier}</span></Link></td>
                    <td style={{ color: '#3B4A47' }}>{tribunalAr(d.tribunal)}</td>
                    <td style={{ color: '#3B4A47' }}>{d.dernierEvenement ? <>{resumeEvenement(d.dernierEvenement.texteArabe)} · <span className="num">{fmtJM(d.dernierEvenement.datePublicationGreffe)}</span></> : '—'}</td>
                    <td><Prochain d={d} /></td>
                    <td><Link href={`/dossiers/${d.id}`} aria-label={tr('فتح الملف')} style={{ display: 'inline-flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', color: '#3B4A47', textDecoration: 'none', fontSize: 20 }}>‹</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mp-cards" aria-label={tr('الملفات')} style={{ listStyle: 'none', margin: 0, padding: 0, flexDirection: 'column', gap: 10 }}>
            {liste.map((d) => (
              <li key={d.id}>
                <Link href={`/dossiers/${d.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: '14px 16px', color: '#15201E', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><strong style={{ fontSize: 15, fontWeight: 600 }}>{d.titreAffaire || labelProcedure(d.typeProcedure)}</strong><span style={{ fontSize: 13, color: '#5E6B67' }}><span className="num">{d.numeroDossier}</span> · {tribunalAr(d.tribunal)}</span></div>
                  {d.dernierEvenement && <span style={{ fontSize: 13, color: '#3B4A47' }}>{resumeEvenement(d.dernierEvenement.texteArabe)} · <span className="num">{fmtJM(d.dernierEvenement.datePublicationGreffe)}</span></span>}
                  <span style={{ alignSelf: 'flex-start' }}><Prochain d={d} /></span>
                </Link>
              </li>
            ))}
          </ul>
          {charges < total && (
            <button type="button" onClick={chargerPlus} disabled={chargeSuite} style={{ ...CHIP, alignSelf: 'center', minHeight: 46, padding: '0 22px' }}>
              {chargeSuite ? tr('جارٍ التحميل…') : <>{tr('عرض المزيد ·')}{' '}<span className="num">{total - charges}</span> {total - charges === 1 ? tr('ملف متبقٍ') : tr('ملفات متبقية')}</>}
            </button>
          )}
        </>
      )}
    </div>
  )
}
