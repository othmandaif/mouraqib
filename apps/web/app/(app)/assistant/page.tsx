'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, Send, Loader2, Plus, MessageSquare, Trash2, Menu } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface Msg { role: 'user' | 'assistant'; contenu: string }
interface Conv { id: string; titre: string; dossierId: string | null; updatedAt: string }

const C = {
  card: '#fff', ink: '#2C2A24', ink2: '#3A3322', muted: '#A39C8B', faint: '#BDB6A4',
  goldD: '#9A7820', goldM: '#CBAE55', goldChip: '#F4EFDF', goldSubtle: '#FBF6E7',
  userBg: 'linear-gradient(140deg,#CBAE55,#9A7820)', border: '#EEE7D6', panel: '#FBF9F2',
}

function token(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('mouraqib_token') || ''
}
const authHeaders = () => ({ Authorization: `Bearer ${token()}` })

export default function AssistantPage() {
  const isMobile = useMediaQuery('(max-width: 900px)')
  const [convs, setConvs] = useState<Conv[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const chargerConvs = useCallback(async () => {
    try {
      const r = await fetch('/api/assistant/conversations', { headers: authHeaders() })
      if (r.ok) setConvs(await r.json())
    } catch {}
  }, [])

  useEffect(() => { chargerConvs() }, [chargerConvs])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  const ouvrirConv = async (id: string) => {
    setActiveId(id)
    setListOpen(false)
    setMessages([])
    try {
      const r = await fetch(`/api/assistant/conversations/${id}/messages`, { headers: authHeaders() })
      if (r.ok) {
        const data: any[] = await r.json()
        setMessages(data.map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', contenu: m.contenu })))
      }
    } catch {}
  }

  const nouvelleConv = () => {
    setActiveId(null)
    setMessages([])
    setInput('')
    setListOpen(false)
  }

  const supprimerConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/assistant/conversations/${id}`, { method: 'DELETE', headers: authHeaders() })
    } catch {}
    setConvs((c) => c.filter((x) => x.id !== id))
    if (activeId === id) nouvelleConv()
  }

  const envoyer = async () => {
    const texte = input.trim()
    if (!texte || streaming) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', contenu: texte }, { role: 'assistant', contenu: '' }])
    setStreaming(true)

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: texte, conversationId: activeId }),
      })
      if (!res.ok || !res.body) throw new Error('no stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let convCreated = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          try {
            const p = JSON.parse(t.slice(5).trim())
            if (p.conversationId && !activeId) { setActiveId(p.conversationId); convCreated = true }
            if (p.delta) {
              setMessages((m) => {
                const copy = [...m]
                copy[copy.length - 1] = { role: 'assistant', contenu: copy[copy.length - 1].contenu + p.delta }
                return copy
              })
            }
            if (p.done) { chargerConvs() } // rafraîchir la liste (titre auto)
          } catch {}
        }
      }
      if (convCreated) chargerConvs()
    } catch {
      setMessages((m) => {
        const copy = [...m]
        copy[copy.length - 1] = { role: 'assistant', contenu: 'تعذّر الاتصال بالمساعد. حاول مجدداً.' }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  const ListePanneau = (
    <div style={{ width: isMobile ? '100%' : 260, flex: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={nouvelleConv} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.userBg, color: '#fff', border: 'none', borderRadius: 13, padding: '12px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        <Plus size={17} /> محادثة جديدة
      </button>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {convs.length === 0 ? (
          <p style={{ fontSize: 12, color: C.faint, textAlign: 'center', padding: '20px 0' }}>لا توجد محادثات بعد</p>
        ) : convs.map((c) => {
          const active = c.id === activeId
          return (
            <div key={c.id} onClick={() => ouvrirConv(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 11, cursor: 'pointer', background: active ? C.goldChip : 'transparent', border: `1px solid ${active ? C.goldM + '55' : 'transparent'}`, flexDirection: 'row-reverse' }}>
              <MessageSquare size={15} stroke={active ? C.goldD : C.faint} style={{ flex: 'none' }} />
              <span style={{ flex: 1, fontSize: 13, color: active ? C.ink2 : '#7A7461', fontWeight: active ? 600 : 400, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.titre}</span>
              <button onClick={(e) => supprimerConv(c.id, e)} style={{ flex: 'none', border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex' }}>
                <Trash2 size={14} stroke={C.faint} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div dir="rtl" style={{ display: 'flex', gap: 18, height: 'calc(100vh - 190px)', minHeight: 480 }}>
      {/* Panneau conversations — latéral sur desktop, drawer sur mobile */}
      {!isMobile && ListePanneau}
      {isMobile && listOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
          <div onClick={() => setListOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(44,42,36,.45)' }} />
          <div dir="rtl" style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: 280, maxWidth: '85vw', background: C.panel, padding: 16, boxShadow: '-20px 0 60px -20px rgba(0,0,0,.4)' }}>
            {ListePanneau}
          </div>
        </div>
      )}

      {/* Colonne chat */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          {isMobile ? (
            <button onClick={() => setListOpen(true)} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}>
              <Menu size={18} stroke={C.ink} />
            </button>
          ) : <span />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <h1 style={{ fontSize: 21, fontWeight: 700, color: C.ink }}>المساعد القانوني</h1>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: C.goldChip, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={17} stroke={C.goldD} />
            </div>
          </div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: C.card, borderRadius: 22, padding: 22, boxShadow: '0 14px 34px -22px rgba(110,90,30,.4)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 440 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: C.goldChip, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Sparkles size={26} stroke={C.goldD} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: C.ink2, marginBottom: 8 }}>كيف يمكنني مساعدتك اليوم؟</p>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>اسألني عن ملفاتك، آجالك، أو آخر المستجدات. أعرف محفظتك كاملةً وأجيب وفق القانون المغربي.</p>
            </div>
          ) : messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-start' : 'flex-end' }}>
              <div style={{
                maxWidth: '80%', padding: '12px 16px', borderRadius: 16, fontSize: 14, lineHeight: 1.85,
                whiteSpace: 'pre-wrap', textAlign: 'right',
                ...(m.role === 'user'
                  ? { background: C.userBg, color: '#fff', borderTopRightRadius: 4 }
                  : { background: C.goldSubtle, color: C.ink2, border: `1px solid ${C.border}`, borderTopLeftRadius: 4 }),
              }}>
                {m.contenu || (streaming && i === messages.length - 1 ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : '')}
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 10.5, color: C.faint, textAlign: 'center', margin: '10px 0 8px' }}>
          تحليل إرشادي بالذكاء الاصطناعي، لا يغني عن مراجعتك المهنية للوثائق.
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <button onClick={envoyer} disabled={streaming || !input.trim()} style={{
            flex: 'none', width: 46, height: 46, borderRadius: 13, border: 'none', cursor: streaming || !input.trim() ? 'default' : 'pointer',
            background: streaming || !input.trim() ? '#E5DFCD' : C.userBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {streaming ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
            placeholder="اكتب سؤالك هنا..."
            rows={1}
            dir="rtl"
            style={{
              flex: 1, resize: 'none', maxHeight: 120, padding: '13px 16px', borderRadius: 13,
              border: `1px solid ${C.border}`, background: C.card, fontSize: 14, color: C.ink,
              fontFamily: "'IBM Plex Sans Arabic',sans-serif", outline: 'none', textAlign: 'right',
            }}
          />
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}