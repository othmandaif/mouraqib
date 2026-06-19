'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

const C = {
  pageA: '#E7D9A6', pageB: '#EFE7D0', pageC: '#ECE2C2',
  card: '#FBF9F2', ink: '#2C2A24', muted: '#A39C8B',
  goldD: '#9A7820', goldM: '#CBAE55', border: '#EEE7D6', red: '#DB6A52', redBg: '#FCE8E2',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: `linear-gradient(155deg, ${C.pageA} 0%, ${C.pageB} 38%, ${C.pageC} 100%)`, fontFamily: "'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Brand subtitle="الدخول إلى فضائكم" />

        <form onSubmit={handleSubmit} style={{ background: C.card, borderRadius: 24, boxShadow: '0 30px 80px -30px rgba(120,95,30,.35)', padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div style={{ background: C.redBg, border: `1px solid ${C.red}33`, color: C.red, padding: '11px 14px', borderRadius: 11, fontSize: 13, textAlign: 'right' }}>{error}</div>
          )}

          <Field label="البريد الإلكتروني">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.ma"
              dir="ltr" style={inputStyle} />
          </Field>

          <Field label="كلمة المرور">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              dir="ltr" style={inputStyle} />
          </Field>

          <button type="submit" disabled={loading} style={submitStyle(loading)}>
            {loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: C.muted }}>
            ليس لديكم حساب؟{' '}
            <Link href="/register" style={{ color: C.goldD, fontWeight: 600, textDecoration: 'none' }}>أنشئوا حساباً مجانياً</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export function Brand({ subtitle }: { subtitle: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(145deg,#CBAE55,#9A7820)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px -5px rgba(150,115,20,.6)', marginBottom: 12 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" /><path d="M7 7h10" /><path d="M5 7 2.5 13a3.5 3.5 0 0 0 5 0L5 7Z" /><path d="M19 7l-2.5 6a3.5 3.5 0 0 0 5 0L19 7Z" /><path d="M8 21h8" /></svg>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: C.ink, fontFamily: "'IBM Plex Sans',sans-serif" }}>مُراقِب</h1>
      <p style={{ color: C.muted, marginTop: 4, fontSize: 14 }}>{subtitle}</p>
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', border: `1px solid ${C.border}`, borderRadius: 11, padding: '12px 14px', fontSize: 14, background: '#fff', fontFamily: "'IBM Plex Sans',sans-serif", outline: 'none' }

function submitStyle(loading: boolean): React.CSSProperties {
  return { width: '100%', background: 'linear-gradient(140deg,#CBAE55,#9A7820)', color: '#fff', fontWeight: 700, fontSize: 14.5, padding: 13, borderRadius: 12, border: 'none', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: "'IBM Plex Sans Arabic',sans-serif", boxShadow: '0 8px 18px -8px rgba(150,115,20,.6)' }
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5B5544', marginBottom: 6, textAlign: 'right' }}>{label}</label>
      {children}
    </div>
  )
}