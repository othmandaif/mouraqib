'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Sparkles, Plus, Lock, X, FolderOpen, ThumbsUp, ThumbsDown, Copy, ArrowUp, Trash2, Menu, FileText } from 'lucide-react'
import { apiFetch, getToken } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { Markdown } from './Markdown'
import { Indicateur } from '@/components/ui/Chargement'

interface Source { titre: string | null; article: string | null; url: string | null }
interface Msg { id?: string; role: 'user' | 'assistant'; contenu: string; sources?: Source[]; feedback?: number | null; erreur?: boolean }
interface Conv { id: string; titre: string; dossierId: string | null; updatedAt: string; dossier?: { numeroDossier: string } | null }

function token(): string {
  if (typeof window === 'undefined') return ''
  return getToken() || ''
}
const authHeaders = () => ({ Authorization: `Bearer ${token()}` })

const ETAPES: Record<string, string> = { thinking: 'أفكّر…', searching: 'أبحث في القوانين…', analyzing: 'أحلّل المواد…', writing: 'أحرّر الجواب…', checking: 'أراجع الجواب قانونياً…' }
const SUGGESTIONS_DOSSIER = ['هل يوقف الاستئناف التنفيذ؟', 'لخّص آخر حكم في الملف', 'اجتهادات محكمة النقض المشابهة']
const SUGGESTIONS = ['ما أجل الطعن بالنقض؟', 'لخّص آخر المستجدات في ملفاتي', 'شروط قبول التعرّض']
const JOUR = 86_400_000
const groupe = (d: string) => { const age = Date.now() - new Date(d).getTime(); return age < JOUR ? 'اليوم' : age < 7 * JOUR ? 'هذا الأسبوع' : 'أقدم' }

const CSS = `
.as-hist a:hover,.as-hist button.conv:hover{background:#FFFFFF}
.as-hist-btn{display:none}
@media (max-width: 900px){.as-hist{display:none !important}.as-hist-btn{display:inline-flex !important}.as-pad{padding-left:0 !important;padding-right:0 !important}}
`
const BTN: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: '#FFFFFF', color: '#15201E', border: '1px solid #CFCAC0', borderRadius: 999, padding: '0 16px', minHeight: 44, cursor: 'pointer', textDecoration: 'none' }
const ROND: React.CSSProperties = { width: 44, height: 44, borderRadius: '50%', border: '1px solid #E4E0D6', background: '#FFFFFF', color: '#3B4A47', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }

export default function AssistantPage() {
  const { toast } = useToast()
  const [convs, setConvs] = useState<Conv[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dossier, setDossier] = useState<{ id: string; numeroDossier: string } | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [etape, setEtape] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const zone = useRef<HTMLTextAreaElement>(null)

  const chargerConvs = useCallback(async () => {
    try { const r = await fetch('/api/assistant/conversations', { headers: authHeaders() }); if (r.ok) setConvs(await r.json()) } catch {}
  }, [])

  const ouvrirConv = useCallback(async (id: string, conv?: Conv) => {
    setActiveId(id); setListOpen(false); setMessages([])
    if (conv?.dossierId) setDossier({ id: conv.dossierId, numeroDossier: conv.dossier?.numeroDossier ?? '' }); else setDossier(null)
    try {
      const r = await fetch(`/api/assistant/conversations/${id}/messages`, { headers: authHeaders() })
      if (r.ok) {
        const data: any[] = await r.json()
        setMessages(data.map((m) => ({ id: m.id, role: m.role === 'USER' ? 'user' : 'assistant', contenu: m.contenu, sources: m.sources ?? undefined, feedback: m.feedback ?? null })))
      }
    } catch {}
  }, [])

  // ?q=…  ?dossier=…  ?conversation=…
  useEffect(() => {
    chargerConvs()
    const p = new URLSearchParams(window.location.search)
    if (p.get('q')) setInput(p.get('q')!)
    const d = p.get('dossier')
    if (d) apiFetch<{ id: string; numeroDossier: string }>(`/dossiers/${d}`).then((x) => setDossier({ id: x.id, numeroDossier: x.numeroDossier })).catch(() => {})
    const c = p.get('conversation')
    if (c) ouvrirConv(c)
  }, [chargerConvs, ouvrirConv])

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, streaming, etape])

  const nouvelleConv = () => { setActiveId(null); setMessages([]); setInput(''); setListOpen(false); setDossier(null) }

  const supprimerConv = async (id: string) => {
    try { await fetch(`/api/assistant/conversations/${id}`, { method: 'DELETE', headers: authHeaders() }) } catch {}
    setConvs((c) => c.filter((x) => x.id !== id))
    if (activeId === id) nouvelleConv()
  }

  const majDernier = (fn: (m: Msg) => Msg) => setMessages((m) => { const c = [...m]; c[c.length - 1] = fn(c[c.length - 1]); return c })

  const envoyer = async (texteForce?: string) => {
    const texte = (texteForce ?? input).trim()
    if (!texte || streaming) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', contenu: texte }, { role: 'assistant', contenu: '' }])
    setStreaming(true); setEtape('thinking')
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: texte, conversationId: activeId, dossierId: dossier?.id }),
      })
      if (!res.ok || !res.body) throw new Error('no stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          try {
            const p = JSON.parse(t.slice(5).trim())
            if (p.conversationId && !activeId) setActiveId(p.conversationId)
            if (p.etape) setEtape(p.etape)
            if (p.sources) majDernier((m) => ({ ...m, sources: p.sources }))
            if (p.delta) { setEtape(null); majDernier((m) => ({ ...m, contenu: m.contenu + p.delta })) }
            // Garde-fou : la réponse relue et corrigée remplace la première version
            if (p.correction) { setEtape(null); majDernier((m) => ({ ...m, contenu: p.correction })); toast('راجعنا الجواب وصحّحنا نقطة قانونية.', 'success') }
            if (p.error) { setEtape(null); majDernier((m) => ({ ...m, contenu: m.contenu ? `${m.contenu}\n\n> ${p.error}` : p.error, erreur: !m.contenu })) }
            if (p.done) { setEtape(null); if (p.messageId) majDernier((m) => ({ ...m, id: p.messageId })); chargerConvs() }
          } catch {}
        }
      }
    } catch {
      majDernier((m) => ({ ...m, contenu: 'تعذّر الاتصال بالمساعد. حاولوا مجدداً.' }))
    } finally {
      setStreaming(false); setEtape(null)
    }
  }

  const avis = async (m: Msg, valeur: 1 | -1) => {
    if (!m.id) return
    const nouvelle = m.feedback === valeur ? null : valeur
    setMessages((all) => all.map((x) => (x === m ? { ...x, feedback: nouvelle } : x)))
    await apiFetch(`/assistant/messages/${m.id}/feedback`, { method: 'POST', body: JSON.stringify({ valeur: nouvelle }) }).catch(() => {})
    if (nouvelle === -1) toast('شكراً. سنراجع هذه الإجابة لتحسين المساعد.', 'info')
  }
  const copier = async (texte: string) => { await navigator.clipboard?.writeText(texte).catch(() => {}); toast('نُسخت الإجابة.', 'success') }

  const groupes = useMemo(() => {
    const g = new Map<string, Conv[]>()
    for (const c of convs) { const k = groupe(c.updatedAt); g.set(k, [...(g.get(k) ?? []), c]) }
    return Array.from(g.entries())
  }, [convs])

  const historique = (dansTiroir: boolean) => (
    <section className={dansTiroir ? undefined : 'as-hist'} aria-label="المحادثات السابقة" style={{ flex: dansTiroir ? '1 1 auto' : '0 0 280px', borderLeft: '1px solid #E4E0D6', background: '#FAF8F4', padding: '24px 16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
      <button className="mp-action" type="button" onClick={nouvelleConv} style={{ ...BTN, justifyContent: 'center', gap: 8, fontSize: 15, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, minHeight: 46 }}><Plus size={18} aria-hidden />سؤال جديد</button>
      {convs.length === 0 && <span style={{ fontSize: 13, color: '#5E6B67', padding: '8px' }}>لا محادثات بعد.</span>}
      {groupes.map(([titre, liste]) => (
        <div key={titre} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#5E6B67', padding: '8px 8px 0' }}>{titre}</span>
          {liste.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, borderRadius: 12, ...(c.id === activeId ? { background: '#FFFFFF', border: '1px solid #E4E0D6' } : { border: '1px solid transparent' }) }}>
              <button type="button" className="conv" aria-current={c.id === activeId ? 'true' : undefined} onClick={() => ouvrirConv(c.id, c)} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px', borderRadius: 12, background: 'transparent', border: 0, textAlign: 'right', fontFamily: 'inherit', color: '#15201E', cursor: 'pointer' }}>
                <span style={{ fontSize: 14, fontWeight: c.id === activeId ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.titre}</span>
                <span style={{ fontSize: 12, color: '#5E6B67' }}>{c.dossier?.numeroDossier ? <span className="num">{c.dossier.numeroDossier}</span> : 'بدون ملف'}</span>
              </button>
              <button type="button" onClick={() => supprimerConv(c.id)} aria-label="حذف المحادثة" style={{ width: 36, height: 36, border: 0, background: 'transparent', color: '#6B665C', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Trash2 size={15} aria-hidden /></button>
            </div>
          ))}
        </div>
      ))}
      <div style={{ marginTop: 'auto', display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#3B4A47', lineHeight: 1.6, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 12, padding: 12 }}>
        <Lock size={18} color="#0E5A4E" style={{ flex: 'none', marginTop: 2 }} aria-hidden />
        <span>محادثاتكم خاصة بكم ولا تُستعمل لتدريب أي نموذج.</span>
      </div>
    </section>
  )

  const suggestions = dossier ? SUGGESTIONS_DOSSIER : SUGGESTIONS

  return (
    <div dir="rtl" style={{ display: 'flex', alignItems: 'stretch', margin: '-28px -32px -48px', minHeight: 'calc(100vh)', background: '#F5F3EE' }} className="as-wrap">
      <style>{CSS + '@media (max-width: 900px){.as-wrap{margin:-12px -16px -96px !important;min-height:calc(100vh - 140px) !important}}'}</style>
      {historique(false)}
      {listOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} role="dialog" aria-modal="true" aria-label="المحادثات السابقة">
          <div onClick={() => setListOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(21,32,30,.45)' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: 290, maxWidth: '85vw', display: 'flex' }}>{historique(true)}</div>
        </div>
      )}

      <section aria-label="المحادثة" style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 32px', borderBottom: '1px solid #E4E0D6', background: '#F5F3EE' }} className="as-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" className="as-hist-btn" onClick={() => setListOpen(true)} aria-label="المحادثات السابقة" style={ROND}><Menu size={18} aria-hidden /></button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>المساعد القانوني</h1>
              <span style={{ fontSize: 14, color: '#3B4A47' }}>يجيب من النصوص المغربية ويذكر مصدر كل فقرة.</span>
            </div>
          </div>
          {dossier && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 999, padding: '0 6px 0 14px', minHeight: 40, fontSize: 14 }}>
              <FolderOpen size={16} color="#0E5A4E" style={{ marginRight: 8 }} aria-hidden />السياق: ملف <span className="num">{dossier.numeroDossier}</span>
              {!activeId && <button type="button" onClick={() => setDossier(null)} aria-label="إزالة سياق الملف" style={{ width: 32, height: 32, borderRadius: '50%', border: 0, background: '#F1EFEA', color: '#3B4A47', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} aria-hidden /></button>}
            </span>
          )}
        </header>

        <div ref={scrollRef} style={{ flex: '1 1 auto', overflowY: 'auto', padding: '28px 32px' }} className="as-pad">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 860, margin: '0 auto' }}>
            {messages.length === 0 && (
              <div style={{ margin: '40px auto', textAlign: 'center', maxWidth: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 56, height: 56, borderRadius: 16, background: '#E3F0EC', color: '#0E5A4E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={26} aria-hidden /></span>
                <strong style={{ fontSize: 18, fontWeight: 600 }}>كيف يمكنني مساعدتكم اليوم؟</strong>
                <span style={{ fontSize: 15, color: '#3B4A47', lineHeight: 1.8 }}>اسألوا عن نص، أجل، مسطرة أو ملف. يجيب من النصوص المغربية ويذكر القانون والفصل.</span>
              </div>
            )}
            {messages.map((m, i) => m.role === 'user' ? (
              <div key={i} style={{ alignSelf: 'flex-start', maxWidth: '78%', background: '#0E5A4E', color: '#FFFFFF', borderRadius: '18px 18px 18px 4px', padding: '14px 18px', fontSize: 16, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{m.contenu}</div>
            ) : (
              <article key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ flex: 'none', width: 36, height: 36, borderRadius: 12, background: '#E3F0EC', color: '#0E5A4E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={18} aria-hidden /></span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 16, lineHeight: 1.85 }}>
                  {m.contenu ? <Markdown texte={m.contenu} /> : streaming && i === messages.length - 1 ? (
                    <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#5E6B67' }}><Indicateur taille={16} />{etape ? ETAPES[etape] ?? 'لحظة…' : 'لحظة…'}</span>
                  ) : null}
                  {m.sources && m.sources.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {m.sources.map((s, k) => (
                        <a key={k} href={s.url ?? undefined} target={s.url ? '_blank' : undefined} rel="noopener noreferrer" style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 12, padding: '10px 14px', color: '#15201E', minHeight: 44, boxSizing: 'border-box', textDecoration: 'none' }}>
                          <span className="num" style={{ flex: 'none', width: 24, height: 24, borderRadius: 6, background: '#E3F0EC', color: '#0B4A40', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{k + 1}</span>
                          <span style={{ flex: 1, fontSize: 14 }}><strong style={{ fontWeight: 600 }}>{s.titre ?? 'نص قانوني'}</strong>{s.article ? <> · الفصل <span className="num">{s.article}</span></> : ''}</span>
                          {s.url && <span style={{ fontSize: 13, color: '#0E5A4E', fontWeight: 600 }}>فتح النص</span>}
                        </a>
                      ))}
                    </div>
                  )}
                  {/* Pas de réponse (service indisponible) : ni mention « إجابة استرشادية » ni actions, seulement réessayer */}
                  {m.erreur && !streaming && messages[i - 1]?.role === 'user' && (
                    <button type="button" onClick={() => envoyer(messages[i - 1].contenu)} style={{ ...BTN, alignSelf: 'flex-start' }}>إعادة المحاولة</button>
                  )}
                  {m.contenu && !m.erreur && !(streaming && i === messages.length - 1) && <>
                    <span style={{ fontSize: 13, color: '#5E6B67', lineHeight: 1.6 }}>إجابة استرشادية مبنية على النصوص المذكورة. تحققوا من الصيغة الرسمية المحيَّنة.</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <Link href={dossier ? `/documents?dossier=${dossier.id}` : '/documents'} style={{ ...BTN, background: '#15201E', color: '#FFFFFF', border: 0 }}><FileText size={16} aria-hidden />تحرير وثيقة</Link>
                      <button type="button" onClick={() => copier(m.contenu)} style={BTN}><Copy size={16} aria-hidden />نسخ</button>
                      <span style={{ flex: 1 }} />
                      <button type="button" aria-label="إجابة مفيدة" aria-pressed={m.feedback === 1} disabled={!m.id} onClick={() => avis(m, 1)} style={{ ...ROND, ...(m.feedback === 1 ? { background: '#E3F0EC', color: '#0B4A40', borderColor: '#0E5A4E' } : {}) }}><ThumbsUp size={18} aria-hidden /></button>
                      <button type="button" aria-label="إجابة غير دقيقة" aria-pressed={m.feedback === -1} disabled={!m.id} onClick={() => avis(m, -1)} style={{ ...ROND, ...(m.feedback === -1 ? { background: '#FBEAE7', color: '#9B2C20', borderColor: '#C0392B' } : {}) }}><ThumbsDown size={18} aria-hidden /></button>
                    </div>
                  </>}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div style={{ position: 'sticky', bottom: 0, padding: '16px 32px 24px', background: 'linear-gradient(to top, #F5F3EE 70%, rgba(245,243,238,0))' }} className="as-pad">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 860, margin: '0 auto' }}>
            {!streaming && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {suggestions.map((s) => <button key={s} type="button" onClick={() => envoyer(s)} style={{ fontFamily: 'inherit', fontSize: 14, background: '#FFFFFF', color: '#15201E', border: '1px solid #E4E0D6', borderRadius: 999, padding: '0 14px', minHeight: 40, cursor: 'pointer' }}>{s}</button>)}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); envoyer() }} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, background: '#FFFFFF', border: '1px solid #CFCAC0', borderRadius: 20, padding: 8, boxShadow: '0 1px 0 rgba(8,59,52,.04), 0 14px 30px -18px rgba(8,59,52,.28)' }}>
              <label style={{ flex: 1, minWidth: 0, display: 'flex' }}>
                <span className="sr-only-ar">سؤالكم</span>
                <textarea ref={zone} rows={2} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
                  placeholder="اسألوا عن نص، أجل، مسطرة أو اجتهاد…" style={{ flex: 1, minWidth: 0, border: 0, outline: 0, resize: 'none', background: 'transparent', fontSize: 16, lineHeight: 1.6, padding: '10px 8px', color: '#15201E', boxShadow: 'none' }} />
              </label>
              <button type="submit" className="mp-action" aria-label="إرسال" disabled={streaming || !input.trim()} aria-busy={streaming} style={{ flex: 'none', width: 44, height: 44, borderRadius: '50%', border: 0, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: streaming || !input.trim() ? 'default' : 'pointer' }}>
                {streaming ? <Indicateur taille={20} courant /> : <ArrowUp size={20} aria-hidden />}
              </button>
            </form>
          </div>
        </div>
      </section>
      <style>{`@keyframes as-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
