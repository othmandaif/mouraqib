'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { FileText, Sparkles, Save, Loader2, Wand2, ChevronDown, Download, Upload, Check, X } from 'lucide-react'
import { exporterWordHtml } from '@/lib/exportDocument'

interface Variable { cle: string; label: string; type: string; requis: boolean }
interface TypeActe { cle: string; titreAr: string; categorie: string; langue: 'AR' | 'FR'; variables: Variable[] }

const C = {
  card: '#fff', ink: '#2C2A24', ink2: '#3A3322', muted: '#A39C8B', faint: '#BDB6A4',
  goldD: '#9A7820', goldM: '#CBAE55', goldChip: '#F4EFDF', goldSubtle: '#FBF6E7',
  grad: 'linear-gradient(140deg,#CBAE55,#9A7820)', border: '#EEE7D6', panel: '#FBF9F2',
  warnBg: '#FBF6E9', warn: '#B8860B',
}

const CAT_AR: Record<string, string> = {
  CONTRAT: 'عقود', REQUETE: 'مقالات ومذكرات', CORRESPONDANCE: 'مراسلات وإنذارات', SOCIETE: 'الشركات', AUTRE: 'أخرى',
}

function token() { return typeof window !== 'undefined' ? localStorage.getItem('mouraqib_token') || '' : '' }
const auth = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' })

export default function DocumentsPage() {
  const [types, setTypes] = useState<TypeActe[]>([])
  const [mode, setMode] = useState<'modele' | 'libre'>('modele')
  const [typeChoisi, setTypeChoisi] = useState<string>('')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [promptLibre, setPromptLibre] = useState('')
  const [langue, setLangue] = useState<'AR' | 'FR'>('AR')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contenu, setContenu] = useState('')
  const [titre, setTitre] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [modelesImportes, setModelesImportes] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [instruction, setInstruction] = useState('')
  const [modifying, setModifying] = useState(false)

  const modifier = async () => {
    const instr = instruction.trim()
    if (!instr || modifying || !contenu) return
    setModifying(true)
    try {
      const r = await fetch('/api/documents/modifier', {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ contenuActuel: contenu, instruction: instr, langue }),
      })
      const data = await r.json()
      if (r.ok && data.contenu) {
        setContenu(data.contenu)
        setInstruction('')
        setSavedId(null)
      } else {
        alert(data.error || 'فشل التعديل')
      }
    } catch { alert('تعذّر الاتصال') } finally { setModifying(false) }
  }

  const chargerModeles = () => {
    fetch('/api/documents/modeles/importes', { headers: auth() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setModelesImportes(Array.isArray(d) ? d : []))
      .catch(() => {})
  }

  useEffect(() => {
    fetch('/api/documents/types', { headers: auth() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTypes(Array.isArray(d) ? d : []))
      .catch(() => {})
    chargerModeles()
  }, [])

  const importerFichier = async (file: File) => {
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('fichier', file)
      if (typeChoisi) fd.append('typeActe', typeChoisi)
      const r = await fetch('/api/documents/modeles/importer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` }, // pas de Content-Type : FormData le gère
        body: fd,
      })
      if (r.ok) chargerModeles()
      else { const e = await r.json().catch(() => ({})); alert(e.error || 'فشل الاستيراد') }
    } catch { alert('تعذّر الاتصال') } finally { setImporting(false) }
  }

  const typeActif = useMemo(() => types.find((t) => t.cle === typeChoisi), [types, typeChoisi])

  // Grouper les types par catégorie
  const parCategorie = useMemo(() => {
    const g: Record<string, TypeActe[]> = {}
    for (const t of types) { (g[t.categorie] ??= []).push(t) }
    return g
  }, [types])

  const genererDoc = async () => {
    if (mode === 'modele' && !typeChoisi) return
    if (mode === 'libre' && !promptLibre.trim()) return
    setGenerating(true)
    setContenu('')
    setSavedId(null)
    try {
      const body = mode === 'modele'
        ? { typeActe: typeChoisi, variables, langue }
        : { promptLibre, langue }
      const r = await fetch('/api/documents/generer', { method: 'POST', headers: auth(), body: JSON.stringify(body) })
      const data = await r.json()
      if (r.ok) {
        setContenu(data.contenu || '')
        setTitre(data.titre || 'وثيقة قانونية')
      } else {
        setContenu(`خطأ: ${data.error || 'فشل التوليد'}`)
      }
    } catch {
      setContenu('تعذّر الاتصال بالخادم.')
    } finally {
      setGenerating(false)
    }
  }

  const sauver = async () => {
    if (!contenu.trim()) return
    setSaving(true)
    try {
      const body = {
        typeActe: mode === 'modele' ? typeChoisi : undefined,
        titre, contenu, langue,
        variables: mode === 'modele' ? variables : undefined,
        promptLibre: mode === 'libre' ? promptLibre : undefined,
      }
      const r = await fetch('/api/documents', { method: 'POST', headers: auth(), body: JSON.stringify(body) })
      const data = await r.json()
      if (r.ok) setSavedId(data.id)
    } catch {} finally { setSaving(false) }
  }

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 12.5, color: C.muted }}>توليد العقود والمحرّرات القانونية بالذكاء الاصطناعي</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.ink }}>محرّر الوثائق</h1>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: C.goldChip, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} stroke={C.goldD} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,360px) 1fr', gap: 20, alignItems: 'start' }}>
        {/* Colonne config */}
        <div style={{ background: C.card, borderRadius: 20, padding: 20, boxShadow: '0 14px 34px -24px rgba(110,90,30,.4)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Switch mode */}
          <div style={{ display: 'flex', gap: 8, background: C.panel, padding: 4, borderRadius: 12 }}>
            {([['modele', 'نموذج جاهز'], ['libre', 'طلب حر']] as const).map(([m, lab]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: mode === m ? '#fff' : 'transparent', color: mode === m ? C.goldD : C.muted,
                boxShadow: mode === m ? '0 4px 12px -6px rgba(0,0,0,.15)' : 'none',
              }}>{lab}</button>
            ))}
          </div>

          {/* Langue */}
          <div style={{ display: 'flex', gap: 8 }}>
            {([['AR', 'العربية'], ['FR', 'الفرنسية']] as const).map(([l, lab]) => (
              <button key={l} onClick={() => setLangue(l)} style={{
                flex: 1, padding: '7px 0', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${langue === l ? C.goldM : C.border}`, background: langue === l ? C.goldChip : '#fff', color: langue === l ? C.goldD : C.muted,
              }}>{lab}</button>
            ))}
          </div>

          {mode === 'modele' ? (
            <>
              {/* Import de modèle Word + indicateur style avocat */}
              <div style={{ background: C.goldSubtle, border: `1px dashed ${C.goldM}`, borderRadius: 12, padding: 12 }}>
                <input ref={fileRef} type="file" accept=".docx" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importerFichier(f); e.target.value = '' }} />
                <button onClick={() => fileRef.current?.click()} disabled={importing} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '9px 0',
                  borderRadius: 9, border: 'none', background: '#fff', color: C.goldD, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                }}>
                  {importing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                  {importing ? 'جارٍ التحليل...' : 'استيراد نموذج Word (تعليم الأسلوب)'}
                </button>
                {(() => {
                  const m = modelesImportes.find((x) => x.typeActe === typeChoisi)
                  if (typeChoisi && m) return (
                    <p style={{ fontSize: 11, color: C.warn, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                      <Check size={12} stroke={C.warn} /> سيُحرَّر بأسلوبك المستورد: {m.titre}
                    </p>
                  )
                  if (modelesImportes.length > 0) return (
                    <p style={{ fontSize: 10.5, color: C.muted, marginTop: 8, textAlign: 'center' }}>{modelesImportes.length} نموذج مستورد — يُطبَّق تلقائياً حسب النوع</p>
                  )
                  return <p style={{ fontSize: 10.5, color: C.faint, marginTop: 8, textAlign: 'center' }}>استورد نماذجك ليحاكي الذكاء الاصطناعي أسلوبك</p>
                })()}
              </div>

              {/* Sélecteur de type groupé */}
              <div style={{ position: 'relative' }}>
                <select value={typeChoisi} onChange={(e) => { setTypeChoisi(e.target.value); setVariables({}) }} style={{
                  width: '100%', appearance: 'none', padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`,
                  background: '#fff', fontSize: 13.5, color: typeChoisi ? C.ink : C.muted, fontFamily: "'IBM Plex Sans Arabic',sans-serif",
                  cursor: 'pointer', direction: 'rtl', textAlign: 'right', outline: 'none',
                }}>
                  <option value="">اختر نوع الوثيقة...</option>
                  {Object.entries(parCategorie).map(([cat, list]) => (
                    <optgroup key={cat} label={CAT_AR[cat] || cat}>
                      {list.map((t) => <option key={t.cle} value={t.cle}>{t.titreAr}</option>)}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown size={16} stroke={C.faint} style={{ position: 'absolute', left: 12, top: 14, pointerEvents: 'none' }} />
              </div>

              {/* Formulaire variables */}
              {typeActif && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {typeActif.variables.map((v) => (
                    <div key={v.cle}>
                      <label style={{ fontSize: 12, color: C.ink2, fontWeight: 600, display: 'block', marginBottom: 4, textAlign: 'right' }}>
                        {v.label}{v.requis && <span style={{ color: C.warn }}> *</span>}
                      </label>
                      {v.type === 'textarea' ? (
                        <textarea value={variables[v.cle] || ''} onChange={(e) => setVariables((s) => ({ ...s, [v.cle]: e.target.value }))}
                          rows={2} dir="rtl" style={inputStyle} />
                      ) : (
                        <input type={v.type === 'number' ? 'number' : v.type === 'date' ? 'date' : 'text'}
                          value={variables[v.cle] || ''} onChange={(e) => setVariables((s) => ({ ...s, [v.cle]: e.target.value }))}
                          dir="rtl" style={inputStyle} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div>
              <label style={{ fontSize: 12, color: C.ink2, fontWeight: 600, display: 'block', marginBottom: 4, textAlign: 'right' }}>صف الوثيقة المطلوبة</label>
              <textarea value={promptLibre} onChange={(e) => setPromptLibre(e.target.value)} rows={6} dir="rtl"
                placeholder="مثال: حرّر عقد شراكة بين طرفين لإنشاء مقهى، رأس المال 200.000 درهم مناصفة..."
                style={inputStyle} />
            </div>
          )}

          <button onClick={genererDoc} disabled={generating || (mode === 'modele' ? !typeChoisi : !promptLibre.trim())} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', borderRadius: 12, border: 'none',
            background: generating ? '#E5DFCD' : C.grad, color: '#fff', fontSize: 14, fontWeight: 600, cursor: generating ? 'default' : 'pointer',
          }}>
            {generating ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> : <Wand2 size={17} />}
            {generating ? 'جارٍ التحرير...' : 'توليد الوثيقة'}
          </button>
        </div>

        {/* Colonne éditeur */}
        <div style={{ background: C.card, borderRadius: 20, padding: 22, boxShadow: '0 14px 34px -24px rgba(110,90,30,.4)', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
          {contenu ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={sauver} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: C.grad, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                    {savedId ? 'تم الحفظ ✓' : 'حفظ'}
                  </button>
                  <button onClick={() => exporterWordHtml({ titre, contenu, langue })} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', color: C.ink2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <Download size={14} stroke={C.goldD} /> تحميل Word
                  </button>
                </div>
                <input value={titre} onChange={(e) => setTitre(e.target.value)} dir="rtl"
                  style={{ flex: 1, border: 'none', fontSize: 16, fontWeight: 700, color: C.ink, textAlign: 'right', outline: 'none', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }} />
              </div>
              <textarea value={contenu} onChange={(e) => { setContenu(e.target.value); setSavedId(null) }} dir="rtl"
                style={{ flex: 1, minHeight: 400, resize: 'vertical', padding: '16px', borderRadius: 12, border: `1px solid ${C.border}`,
                  background: C.goldSubtle, fontSize: 14, lineHeight: 1.9, color: C.ink2, fontFamily: "'IBM Plex Sans Arabic',sans-serif", outline: 'none', textAlign: 'right' }} />

              {/* Zone chatbot : modifier le contrat par instruction naturelle */}
              <div style={{ marginTop: 14, background: C.panel, borderRadius: 14, padding: 14, border: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.ink2, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                  تعديل بالمحادثة <Wand2 size={13} stroke={C.goldD} />
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <button onClick={modifier} disabled={modifying || !instruction.trim()} style={{
                    flex: 'none', width: 42, height: 42, borderRadius: 11, border: 'none',
                    background: modifying || !instruction.trim() ? '#E5DFCD' : C.grad, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: modifying || !instruction.trim() ? 'default' : 'pointer',
                  }}>
                    {modifying ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Wand2 size={16} />}
                  </button>
                  <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); modifier() } }}
                    rows={1} dir="rtl" placeholder="مثال: أضف بنداً لعدم المنافسة، أو غيّر المدة إلى سنتين..."
                    style={{ flex: 1, resize: 'none', maxHeight: 90, padding: '11px 13px', borderRadius: 11, border: `1px solid ${C.border}`,
                      background: '#fff', fontSize: 13, color: C.ink, fontFamily: "'IBM Plex Sans Arabic',sans-serif", outline: 'none', textAlign: 'right' }} />
                </div>
                <p style={{ fontSize: 10, color: C.faint, marginTop: 6, textAlign: 'center' }}>يطبّق التعديل المطلوب فقط ويحافظ على باقي الوثيقة</p>
              </div>
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 380 }}>
              <div style={{ width: 60, height: 60, borderRadius: 17, background: C.goldChip, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Sparkles size={28} stroke={C.goldD} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: C.ink2, marginBottom: 8 }}>وثيقتك ستظهر هنا</p>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>اختر نوع الوثيقة واملأ المعطيات، أو صف طلبك بحرية، ثم اضغط «توليد الوثيقة».</p>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #EEE7D6',
  background: '#fff', fontSize: 13, color: '#2C2A24', fontFamily: "'IBM Plex Sans Arabic',sans-serif",
  outline: 'none', resize: 'vertical', textAlign: 'right',
}