'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { apiFetch } from '@/lib/api'

const C = {
  pageA: '#E7D9A6', pageB: '#EFE7D0', pageC: '#ECE2C2',
  card: '#FBF9F2', ink: '#2C2A24', muted: '#A39C8B',
  goldD: '#9A7820', border: '#EEE7D6', red: '#DB6A52', redBg: '#FCE8E2',
}

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', nom: '', prenom: '', telephone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(form) })
      router.push('/login?registered=1')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: `linear-gradient(155deg, ${C.pageA} 0%, ${C.pageB} 38%, ${C.pageC} 100%)`, fontFamily: "'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <Brand subtitle="أنشئوا حسابكم — مجاناً" />

        <form onSubmit={handleSubmit} style={{ background: C.card, borderRadius: 24, boxShadow: '0 30px 80px -30px rgba(120,95,30,.35)', padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ background: C.redBg, border: `1px solid ${C.red}33`, color: C.red, padding: '11px 14px', borderRadius: 11, fontSize: 13, textAlign: 'right' }}>{error}</div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="الاسم الشخصي">
              <input value={form.prenom} onChange={set('prenom')} required minLength={2} style={inputStyle} />
            </Field>
            <Field label="الاسم العائلي">
              <input value={form.nom} onChange={set('nom')} required minLength={2} style={inputStyle} />
            </Field>
          </div>

          <Field label="البريد الإلكتروني">
            <input type="email" value={form.email} onChange={set('email')} required dir="ltr" style={inputStyle} />
          </Field>

          <Field label="رقم الهاتف (واتساب)">
            <input type="tel" value={form.telephone} onChange={set('telephone')} required placeholder="+212 6XX XXX XXX" dir="ltr" style={inputStyle} />
          </Field>

          <Field label="كلمة المرور">
            <input type="password" value={form.password} onChange={set('password')} required minLength={8} dir="ltr" style={inputStyle} />
            <p style={{ fontSize: 11, color: C.muted, marginTop: 4, textAlign: 'right' }}>8 أحرف على الأقل</p>
          </Field>

          <button type="submit" disabled={loading} style={submitStyle(loading)}>
            {loading ? 'جارٍ الإنشاء...' : 'إنشاء حسابي المجاني'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: C.muted }}>
            لديكم حساب؟{' '}
            <Link href="/login" style={{ color: C.goldD, fontWeight: 600, textDecoration: 'none' }}>تسجيل الدخول</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

function Brand({ subtitle }: { subtitle: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <div style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src="/new_logo.png" alt="Mouraqib" width={56} height={56} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: C.ink, fontFamily: "'IBM Plex Sans',sans-serif" }}>مُراقِب</h1>
      <p style={{ color: C.muted, marginTop: 4, fontSize: 14 }}>{subtitle}</p>
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', border: `1px solid ${C.border}`, borderRadius: 11, padding: '12px 14px', fontSize: 14, background: '#fff', fontFamily: "'IBM Plex Sans',sans-serif", outline: 'none', boxSizing: 'border-box' }

function submitStyle(loading: boolean): React.CSSProperties {
  return { width: '100%', background: 'linear-gradient(140deg,#CBAE55,#9A7820)', color: '#fff', fontWeight: 700, fontSize: 14.5, padding: 13, borderRadius: 12, border: 'none', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: "'IBM Plex Sans Arabic',sans-serif", boxShadow: '0 8px 18px -8px rgba(150,115,20,.6)' }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5B5544', marginBottom: 6, textAlign: 'right' }}>{label}</label>
      {children}
    </div>
  )
}