'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { FileText, Plus, Download, Trash2, Save, Loader2, ArrowRight, Search } from 'lucide-react'
import { exporterWordHtml } from '@/lib/exportDocument'

interface DocItem { id: string; titre: string; typeActe: string; categorie: string; langue: 'AR' | 'FR'; statut: string; dossierId: string | null; updatedAt: string }
interface DocFull extends DocItem { contenu: string }

const C = {
  card: '#fff', ink: '#2C2A24', ink2: '#3A3322', muted: '#A39C8B', faint: '#BDB6A4',
  goldD: '#9A7820', goldM: '#CBAE55', goldChip: '#F4EFDF', goldSubtle: '#FBF6E7',
  grad: 'linear-gradient(140deg,#CBAE55,#9A7820)', border: '#EEE7D6', panel: '#FBF9F2', red: '#DB6A52',
}
const CAT_AR: Record<string, string> = { CONTRAT: 'عقد', REQUETE: 'مقال/مذكرة', CORRESPONDANCE: 'مراسلة', SOCIETE: 'شركة', AUTRE: 'وثيقة' }
const STATUT_AR: Record<string, string> = { BROUILLON: 'مسوّدة', FINALISE: 'نهائية', ARCHIVE: 'مؤرشفة' }

function token() { return typeof window !== 'undefined' ? localStorage.getItem('mouraqib_token') || '' : '' }
const auth = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' })

export default function MesDocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [actif, setActif] = useState<DocFull | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)

  const charger = () => {
    setLoading(true)
    fetch('/api/documents', { headers: auth() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setDocs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(charger, [])

  const ouvrir = async (id: string) => {
    try {
      const r = await fetch(`/api/documents/${id}`, { headers: auth() })
      if (r.ok) { setActif(await r.json()); setSavedOk(false) }
    } catch {}
  }

  const sauver = async () => {
    if (!actif) return
    setSaving(true)
    try {
      const r = await fetch(`/api/documents/${actif.id}`, { method: 'PATCH', headers: auth(), body: JSON.stringify({ titre: actif.titre, contenu: actif.contenu }) })
      if (r.ok) { setSavedOk(true); charger() }
    } catch {} finally { setSaving(false) }
  }

  const supprimer = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!confirm('حذف هذه الوثيقة نهائياً؟')) return
    try { await fetch(`/api/documents/${id}`, { method: 'DELETE', headers: auth() }) } catch {}
    setDocs((d) => d.filter((x) => x.id !== id))
    if (actif?.id === id) setActif(null)
  }

  const filtres = useMemo(() => {
    if (!q.trim()) return docs
    const s = q.toLowerCase()
    return docs.filter((d) => d.titre.toLowerCase().includes(s))
  }, [docs, q])

  // Vue édition
  if (actif) {
    return (
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={sauver} disabled={saving} style={btnGrad}>
              {saving ? <Loader2 size={14} style={spin} /> : <Save size={14} />}{savedOk ? 'تم الحفظ ✓' : 'حفظ'}
            </button>
            <button onClick={() => exporterWordHtml({ titre: actif.titre, contenu: actif.contenu, langue: actif.langue })} style={btnGhost}>
              <Download size={14} stroke={C.goldD} /> تحميل Word
            </button>
            <button onClick={() => supprimer(actif.id)} style={{ ...btnGhost, color: C.red }}>
              <Trash2 size={14} stroke={C.red} /> حذف
            </button>
          </div>
          <button onClick={() => { setActif(null); charger() }} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: C.muted, fontSize: 13, cursor: 'pointer' }}>
            رجوع إلى القائمة <ArrowRight size={15} />
          </button>
        </div>
        <input value={actif.titre} onChange={(e) => { setActif({ ...actif, titre: e.target.value }); setSavedOk(false) }} dir="rtl"
          style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 16, fontWeight: 700, color: C.ink, textAlign: 'right', outline: 'none', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }} />
        <textarea value={actif.contenu} onChange={(e) => { setActif({ ...actif, contenu: e.target.value }); setSavedOk(false) }} dir="rtl"
          style={{ minHeight: 480, resize: 'vertical', padding: 18, borderRadius: 14, border: `1px solid ${C.border}`, background: C.goldSubtle, fontSize: 14, lineHeight: 1.9, color: C.ink2, fontFamily: "'IBM Plex Sans Arabic',sans-serif", outline: 'none', textAlign: 'right' }} />
        <style>{spinCss}</style>
      </div>
    )
  }

  // Vue liste
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/documents" style={{ textDecoration: 'none' }}>
          <span style={{ ...btnGrad, display: 'inline-flex' }}><Plus size={15} /> وثيقة جديدة</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.ink }}>وثائقي</h1>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: C.goldChip, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} stroke={C.goldD} />
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div style={{ position: 'relative' }}>
        <Search size={16} stroke={C.faint} style={{ position: 'absolute', right: 14, top: 13 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في وثائقك..." dir="rtl"
          style={{ width: '100%', padding: '11px 42px 11px 14px', borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff', fontSize: 13.5, color: C.ink, outline: 'none', fontFamily: "'IBM Plex Sans Arabic',sans-serif", textAlign: 'right' }} />
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: C.muted, padding: 40 }}>جارٍ التحميل...</p>
      ) : filtres.length === 0 ? (
        <div style={{ background: C.card, borderRadius: 18, padding: 48, textAlign: 'center', boxShadow: '0 14px 34px -26px rgba(110,90,30,.4)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: C.goldChip, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <FileText size={26} stroke={C.goldD} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: C.ink2, marginBottom: 6 }}>لا توجد وثائق محفوظة</p>
          <p style={{ fontSize: 13, color: C.muted }}>أنشئ وثيقتك الأولى من «وثيقة جديدة».</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {filtres.map((d) => (
            <div key={d.id} onClick={() => ouvrir(d.id)} style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 10px 26px -20px rgba(110,90,30,.4)', cursor: 'pointer', position: 'relative', border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <button onClick={(e) => supprimer(d.id, e)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2 }}>
                  <Trash2 size={15} stroke={C.faint} />
                </button>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.goldD, background: C.goldChip, borderRadius: 6, padding: '3px 9px' }}>{CAT_AR[d.categorie] || 'وثيقة'}</span>
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: C.ink, textAlign: 'right', marginBottom: 8, lineHeight: 1.5 }}>{d.titre}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span dir="ltr" style={{ fontSize: 11.5, color: C.muted, fontFamily: "'IBM Plex Sans',sans-serif" }}>{new Date(d.updatedAt).toLocaleDateString('fr-MA')}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{STATUT_AR[d.statut] || ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{spinCss}</style>
    </div>
  )
}

const btnGrad: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 11, border: 'none', background: C.grad, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 11, border: `1px solid ${C.border}`, background: '#fff', color: C.ink2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const spin: React.CSSProperties = { animation: 'spin 1s linear infinite' }
const spinCss = `@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`