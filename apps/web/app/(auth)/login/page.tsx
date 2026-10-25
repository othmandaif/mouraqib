'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { erreurAr } from '@/lib/erreurs'
import { AuthSplit, PasswordInput, FormAlert, submitStyle } from '@/components/auth/AuthSplit'
import { EnCours } from '@/components/ui/Chargement'

const LIEN: React.CSSProperties = { fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#0E5A4E', background: 'transparent', border: 0, padding: '0 4px', minHeight: 44, display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }
const CODE: React.CSSProperties = { fontSize: 28, fontWeight: 600, letterSpacing: '0.5em', textAlign: 'center', minHeight: 60 }

const Apercu = (
  <>
    <h2 style={{ margin: 0, fontSize: 40, fontWeight: 600, lineHeight: 1.3, color: '#FFFFFF' }}>صباح الخير.<br />ملفاتكم في انتظاركم.</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-hidden="true">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0B4A40', borderRadius: 14, padding: '12px 14px' }}>
        <span className="num" style={{ flex: 'none', width: 40, height: 40, borderRadius: 10, background: '#C0392B', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>2</span>
        <span style={{ fontSize: 14, color: '#FFFFFF' }}>عليكم · استئناف الأمر الاستعجالي</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1.5px dashed #6E9C90', borderRadius: 14, padding: '12px 14px' }}>
        <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 10, background: '#0B4A40', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CFE5DD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
        </span>
        <span style={{ fontSize: 14 }}>على الخصم · تحت المراقبة</span>
      </div>
    </div>
  </>
)

type Etape = 'login' | '2fa' | 'oubli' | 'reinit'
const CONTACT_TEL = process.env.NEXT_PUBLIC_CONTACT_TEL || '+212607167594'
const chiffresCode = (v: string) => v.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06F0)).replace(/\D/g, '').slice(0, 6)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [seSouvenir, setSeSouvenir] = useState(true)
  const [etape, setEtape] = useState<Etape>('login')
  const [ticket, setTicket] = useState('')
  const [code, setCode] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, verifier2fa } = useAuth()
  const router = useRouter()
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.has('registered')) setInfo('تم إنشاء حسابكم. سجّلوا الدخول للمتابعة.')
    if (q.has('desactive')) setError('هذا الحساب معطّل. تواصلوا معنا على واتساب لإعادة تفعيله.')
  }, [])
  useEffect(() => { if (etape === '2fa' || etape === 'reinit') codeRef.current?.focus() }, [etape])

  const aller = (e: Etape) => { setEtape(e); setError(''); setCode('') }
  // Premier passage sans dossier → parcours de bienvenue
  const entrer = async (u?: { doitChangerMdp?: boolean }) => {
    if (u?.doitChangerMdp) { router.push('/mot-de-passe-provisoire'); return } // 1re connexion avec un mot de passe provisoire
    const c = await apiFetch<{ dossiers: number; demandes?: number }>('/dashboard/compteurs').catch(() => null)
    // « demandes » n'est renvoyé qu'au compte admin : il va directement dans son espace
    router.push(c && c.demandes !== undefined ? '/admin' : c?.dossiers === 0 ? '/onboarding' : '/dashboard')
  }
  const tenter = async (fn: () => Promise<void>) => {
    setError(''); setLoading(true)
    try { await fn() } catch (err: any) { setError(erreurAr(err?.message)) } finally { setLoading(false) }
  }

  // Messages en arabe à la place des bulles du navigateur (affichées dans sa langue, souvent l'anglais)
  const emailValide = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
  const connecter = (e: React.FormEvent) => { e.preventDefault()
    if (!emailValide(email)) { setError('اكتبوا بريداً إلكترونياً صحيحاً.'); return }
    if (!password) { setError('اكتبوا كلمة المرور.'); return }
    tenter(async () => {
    const r = await login(email, password, seSouvenir)
    if ('ticket' in r) { setTicket(r.ticket); aller('2fa'); return }
    await entrer(r)
  }) }
  const verifier = (e: React.FormEvent) => { e.preventDefault()
    if (code.length !== 6) { setError('اكتبوا الرمز كاملاً: 6 أرقام.'); return }
    tenter(async () => { await entrer(await verifier2fa(ticket, code)) }) }
  const demanderCode = (e: React.FormEvent) => { e.preventDefault()
    if (!emailValide(email)) { setError('اكتبوا بريداً إلكترونياً صحيحاً.'); return }
    tenter(async () => {
    const r = await apiFetch<{ ticket: string }>('/auth/mot-de-passe/oublie', { method: 'POST', body: JSON.stringify({ email }) })
    setTicket(r.ticket); aller('reinit')
  }) }
  const reinitialiser = (e: React.FormEvent) => { e.preventDefault()
    if (code.length !== 6) { setError('اكتبوا الرمز كاملاً: 6 أرقام.'); return }
    if (nouveau.length < 8) { setError('كلمة المرور الجديدة يجب أن تتضمن 8 أحرف على الأقل.'); return }
    tenter(async () => {
    await apiFetch('/auth/mot-de-passe/reinitialiser', { method: 'POST', body: JSON.stringify({ ticket, code, nouveau }) })
    setPassword(''); setNouveau(''); aller('login'); setInfo('غُيّرت كلمة المرور. ادخلوا بالكلمة الجديدة.')
  }) }

  const entete = (t: string, p: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600 }}>{t}</h1>
      <p style={{ margin: 0, fontSize: 16, color: '#3B4A47', lineHeight: 1.7 }}>{p}</p>
    </div>
  )
  const champCode = (
    <label className="mp-field">رمز التحقق
      {/* Pas de maxLength : le code copié depuis l'e-mail ou WhatsApp est « 123 456 » (7 caractères) et était coupé à « 123 45 ».
          On garde les chiffres (y compris ٠-٩ d'un clavier arabe), puis les 6 premiers. */}
      <input ref={codeRef} className="mp-input num" inputMode="numeric" autoComplete="one-time-code" required value={code}
        onChange={(e) => setCode(chiffresCode(e.target.value))} placeholder="••••••" style={CODE} />
    </label>
  )
  const retour = <button type="button" onClick={() => aller('login')} style={{ ...LIEN, fontSize: 15, minHeight: 44, alignSelf: 'center' }}>الرجوع إلى الدخول</button>
  const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 22 }

  return (
    <AuthSplit aside={Apercu}>
      {etape === 'login' && (
        <form onSubmit={connecter} noValidate style={form}>
          {entete('الدخول', 'مرحباً بعودتكم إلى ملفاتي.')}
          {info && !error && <FormAlert tone="success">{info}</FormAlert>}
          <label className="mp-field">البريد الإلكتروني
            <input className="mp-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="nom@cabinet.ma" dir="ltr" style={{ textAlign: 'right' }} />
          </label>
          <div className="mp-field" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="mp-pw">كلمة المرور</label>
              <button type="button" onClick={() => aller('oubli')} style={LIEN}>نسيتم كلمة المرور؟</button>
            </span>
            <PasswordInput id="mp-pw" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, minHeight: 44, cursor: 'pointer' }}>
            <input type="checkbox" checked={seSouvenir} onChange={(e) => setSeSouvenir(e.target.checked)} style={{ width: 22, height: 22, margin: 0, accentColor: '#0E5A4E' }} />
            تذكّروني على هذا الجهاز
          </label>
          {error && <FormAlert>{error}</FormAlert>}
          <button type="submit" disabled={loading} aria-busy={loading} className="mp-action" style={submitStyle(loading)}>{loading ? <EnCours texte="جارٍ الدخول…" /> : 'الدخول'}</button>
          <p style={{ margin: 0, textAlign: 'center', fontSize: 15, color: '#3B4A47' }}>
            ليس لديكم حساب؟ <Link href="/register" style={{ fontWeight: 600, padding: '8px 4px', display: 'inline-block', textDecoration: 'none' }}>أنشئوا حسابكم</Link>
          </p>
        </form>
      )}

      {etape === '2fa' && (
        <form onSubmit={verifier} noValidate style={form}>
          {entete('التحقق بخطوتين', <>أرسلنا رمزاً من <span className="num">6</span> أرقام إلى رقم واتساب المسجّل في حسابكم.</>)}
          {champCode}
          {error && <FormAlert>{error}</FormAlert>}
          <button type="submit" disabled={loading} aria-busy={loading} className="mp-action" style={submitStyle(loading)}>{loading ? <EnCours texte="جارٍ التحقق…" /> : 'تأكيد'}</button>
          {retour}
        </form>
      )}

      {etape === 'oubli' && (
        <form onSubmit={demanderCode} noValidate style={form}>
          {entete('نسيتم كلمة المرور؟', 'اكتبوا بريدكم الإلكتروني: نرسل إليه رمزاً من 6 أرقام لتعيين كلمة مرور جديدة (وعلى واتساب أيضاً إن كان رقمكم مؤكَّداً).')}
          <label className="mp-field">البريد الإلكتروني
            <input className="mp-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="nom@gmail.com" dir="ltr" style={{ textAlign: 'right' }} />
          </label>
          {error && <FormAlert>{error}</FormAlert>}
          <button type="submit" disabled={loading} aria-busy={loading} className="mp-action" style={submitStyle(loading)}>{loading ? <EnCours texte="جارٍ الإرسال…" /> : 'إرسال الرمز'}</button>
          <p style={{ margin: 0, fontSize: 14, color: '#5E6B67', lineHeight: 1.7, borderTop: '1px solid #E4E0D6', paddingTop: 16 }}>لم يعد لديكم وصول إلى هذا البريد؟ تواصلوا مع الإدارة: نتحقق من هويتكم ونرسل لكم كلمة مرور مؤقتة.</p>
          <a href={`https://wa.me/${CONTACT_TEL.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`السلام عليكم، نسيت كلمة المرور لحسابي على ملفاتي${email ? ` (${email})` : ''}.`)}`} target="_blank" rel="noopener noreferrer"
            style={{ ...submitStyle(false), background: '#FFFFFF', color: '#0E5A4E', border: '1.5px solid #0E5A4E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>
            <MessageCircle size={18} aria-hidden />راسلوا الإدارة على واتساب
          </a>
          {retour}
        </form>
      )}

      {etape === 'reinit' && (
        <form onSubmit={reinitialiser} noValidate style={form}>
          {entete('كلمة مرور جديدة', 'إن كان الحساب موجوداً، فقد وصلكم رمز على بريدكم الإلكتروني صالح لمدة 10 دقائق. لم يصلكم؟ تحققوا من الرسائل غير المرغوب فيها (Spam).')}
          {champCode}
          <label className="mp-field">كلمة المرور الجديدة
            <PasswordInput autoComplete="new-password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} required minLength={8} />
            <span style={{ fontSize: 13, fontWeight: 400, color: '#3B4A47' }}><span className="num">8</span> أحرف على الأقل. ستُغلق كل الجلسات المفتوحة.</span>
          </label>
          {error && <FormAlert>{error}</FormAlert>}
          <button type="submit" disabled={loading} aria-busy={loading} className="mp-action" style={submitStyle(loading)}>{loading ? <EnCours texte="جارٍ الحفظ…" /> : 'تعيين كلمة المرور'}</button>
          {retour}
        </form>
      )}
    </AuthSplit>
  )
}
