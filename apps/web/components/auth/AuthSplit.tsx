'use client'

import { useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useLangue } from '@/lib/langue'

const CSS = `
.mp-auth{min-height:100vh;display:flex;flex-wrap:wrap;background:#F5F3EE;color:#15201E}
.mp-auth-brand{flex:1 1 520px;background:#083B34;color:#CFE5DD;padding:48px 56px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;gap:40px}
.mp-auth-main{flex:1 1 480px;display:flex;align-items:center;justify-content:center;padding:48px 24px;box-sizing:border-box}
.mp-auth label.mp-field{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600}
.mp-auth .mp-input:focus{border-color:#0E5A4E;box-shadow:0 0 0 4px #CDE5DD}
.mp-auth .mp-input{font-family:inherit;font-size:16px;color:#15201E;background:#FFFFFF;border:1px solid #CFCAC0;border-radius:10px;min-height:50px;padding:0 14px;box-sizing:border-box;width:100%;outline:none}
.mp-auth-logo-m{display:none}
@media (max-width: 760px){.mp-auth-brand{display:none}.mp-auth-main{padding:32px 16px}.mp-auth-logo-m{display:flex}}
`

/** Mise en page connexion / inscription : panneau de marque (masqué sur mobile) + formulaire. */
export function AuthSplit({ aside, children, pied = 'اتصال مشفّر · سرّ المهنة أولاً' }: { aside: React.ReactNode; children: React.ReactNode; pied?: string }) {
  const { t } = useLangue()
  return (
    <div className="mp-auth">
      <style>{CSS}</style>
      <section className="mp-auth-brand">
        <Logo dark />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 460 }}>{aside}</div>
        <span style={{ fontSize: 13, color: '#9FC9BE' }}>{t(pied)}</span>
      </section>
      <main className="mp-auth-main">
        <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <span className="mp-auth-logo-m"><Logo /></span>
          {children}
        </div>
      </main>
    </div>
  )
}

export function Logo({ dark }: { dark?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dark ? '/brand/logo-symbol-white.svg' : '/brand/malafipro-symbol.svg'} alt="" width={40} height={40} />
      <span dir="ltr" style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 22, fontWeight: 600, color: dark ? '#FFFFFF' : '#15201E' }}>
        Malafi<span style={{ fontWeight: 400 }}>Pro</span>
      </span>
    </span>
  )
}

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  const { t, langue } = useLangue()
  const rtl = langue === 'ar' // champ en dir="ltr" : le bouton œil suit le sens de la page
  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <input {...props} type={show ? 'text' : 'password'} dir="ltr" className="mp-input" style={rtl ? { paddingLeft: 52, textAlign: 'right' } : { paddingRight: 52 }} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={t(show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور')}
        style={{ position: 'absolute', [rtl ? 'left' : 'right']: 3, top: 3, width: 44, height: 44, border: 0, background: 'transparent', color: '#3B4A47', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        {show ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
      </button>
    </span>
  )
}

export function FormAlert({ children, tone = 'error' }: { children: React.ReactNode; tone?: 'error' | 'success' }) {
  const s = tone === 'error'
    ? { background: '#FBF1EF', border: '1px solid #F0C9C2', color: '#6E1D14' }
    : { background: '#E3F0EC', border: '1px solid #CDE5DD', color: '#0B4A40' }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} style={{ ...s, display: 'flex', gap: 10, alignItems: 'flex-start', borderRadius: 12, padding: '12px 14px', fontSize: 14, lineHeight: 1.6 }}>
      <AlertCircle size={18} aria-hidden style={{ flex: 'none', marginTop: 3 }} />
      <span>{children}</span>
    </div>
  )
}

/** Bouton principal des écrans d'accès : à utiliser avec className="mp-action" (survol, appui). */
export const submitStyle = (loading: boolean): React.CSSProperties => ({
  fontFamily: 'inherit', fontSize: 16, fontWeight: 600, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0,
  borderRadius: 999, minHeight: 52, cursor: loading ? 'progress' : 'pointer', width: '100%',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
})
