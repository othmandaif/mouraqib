'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { erreurAr } from '@/lib/erreurs'
import { useAuth } from '@/hooks/useAuth'
import { normaliserMaroc } from '@/components/legal/VerifWhatsApp'
import { AuthSplit, PasswordInput, FormAlert, submitStyle } from '@/components/auth/AuthSplit'
import { EnCours } from '@/components/ui/Chargement'
import { useLangue } from '@/lib/langue'

const ETAPES = ['املؤوا طلب التسجيل', 'نتصل بكم لتقديم الخدمة واختيار العرض', 'نفعّل حسابكم وتبدأ المتابعة']

// Indicateur simple : longueur + variété de caractères (0 → 4).
function force(p: string) {
  return [p.length >= 8, p.length >= 12, /[A-Z]/.test(p) && /[a-z]/.test(p), /[\d\W]/.test(p)].filter(Boolean).length
}
const FORCE_AR = ['', 'ضعيفة', 'مقبولة', 'جيدة', 'قوية']
const CONTACT_TEL = process.env.NEXT_PUBLIC_CONTACT_TEL || '+212607167594'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', nom: '', prenom: '', telephone: '', barreau: '', ville: '', structure: '', nbDossiers: '', message: '' })
  const [envoye, setEnvoye] = useState(false)
  const [error, setError] = useState('')
  // Erreur rattachée au champ concerné (affichée dessous, focus dessus) plutôt qu'en bas du formulaire
  const [erreurEmail, setErreurEmail] = useState('')
  const champEmail = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [invitation, setInvitation] = useState('')
  const [accepte, setAccepte] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const { t, tx, langue } = useLangue()

  useEffect(() => { setInvitation(new URLSearchParams(window.location.search).get('invitation') ?? '') }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setErreurEmail('')
    // Contrôles en arabe (les bulles du navigateur s'affichent dans sa langue)
    const manque = form.prenom.trim().length < 2 || form.nom.trim().length < 2 ? t('اكتبوا الاسم الشخصي والعائلي.')
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? t('اكتبوا بريداً إلكترونياً صحيحاً.')
      : !/^\+?\d{9,15}$/.test(form.telephone.replace(/[\s.\-()]/g, '')) ? t('اكتبوا رقم هاتف صحيحاً، مثلاً 06 61 23 45 67.')
      : form.password.length < 8 ? t('كلمة المرور يجب أن تتضمن 8 أحرف على الأقل.')
      : !accepte ? t('وافقوا على شروط الاستعمال وسياسة الخصوصية للمتابعة.') : ''
    if (manque) { setError(manque); return }
    setLoading(true)
    try {
      // Champs vides non envoyés (l'API attend des valeurs précises pour la structure et le nombre de dossiers)
      const extras = Object.fromEntries(Object.entries({ barreau: form.barreau, ville: form.ville, structure: form.structure, nbDossiers: form.nbDossiers, message: form.message }).filter(([, v]) => v.trim()))
      const body = { email: form.email, password: form.password, nom: form.nom, prenom: form.prenom, telephone: normaliserMaroc(form.telephone), ...extras, ...(invitation ? { invitation } : {}) }
      const r = await apiFetch<{ enAttente?: boolean }>('/auth/register', { method: 'POST', body: JSON.stringify(body) })
      if (r.enAttente) { setEnvoye(true); window.scrollTo({ top: 0 }); return }
      // Membre invité par un cabinet : compte actif, connexion directe puis parcours de bienvenue
      const s = await login(form.email, form.password, true).catch(() => null)
      router.push(s && !('ticket' in s) ? '/onboarding' : '/login?registered=1')
    } catch (err: any) {
      const msg = erreurAr(err?.message)
      if (/Email|e-mail/i.test(err?.message ?? '')) { setErreurEmail(msg); champEmail.current?.focus() } else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const f = force(form.password)

  return (
    <AuthSplit aside={<>
      <p style={{ margin: 0, fontSize: 38, fontWeight: 600, lineHeight: 1.35, color: '#FFFFFF' }}>{t(invitation ? 'دقيقتان، ثم يعمل ملفاتي من أجلكم.' : 'اطلبوا حسابكم، ونتكفل بالباقي.')}</p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 16 }}>
        {ETAPES.map((e, i) => (
          <li key={e} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="num" style={{ flex: 'none', width: 32, height: 32, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, ...(i === 0 ? { background: '#F5F3EE', color: '#083B34' } : { border: '1.5px solid #6E9C90' }) }}>{i + 1}</span>{t(e)}
          </li>
        ))}
      </ol>
    </>}>
      {envoye ? (
        <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
          <span aria-hidden style={{ width: 56, height: 56, borderRadius: '50%', background: '#0E5A4E', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={30} /></span>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600 }}>{t('شكراً ذ. {prenom}، وصلنا طلبكم.', { prenom: form.prenom })}</h1>
          <p style={{ margin: 0, fontSize: 16, color: '#3B4A47', lineHeight: 1.8 }}>
            {tx('سنتصل بكم على الرقم {tel} خلال يوم عمل لتقديم الخدمة وتفعيل حسابكم.', { tel: <span className="num" dir="ltr">{normaliserMaroc(form.telephone)}</span> })}{' '}
            {t('بعد التفعيل، تدخلون بالبريد وكلمة المرور اللذين اخترتموهما.')}
          </p>
          <a href={`https://wa.me/${CONTACT_TEL.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer" className="mp-action" style={{ ...submitStyle(false), width: 'auto', padding: '0 22px', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <MessageCircle size={18} aria-hidden />{t('مستعجلون؟ راسلونا على واتساب')}
          </a>
          <Link href="/" style={{ fontSize: 15, fontWeight: 600, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>{t('العودة إلى الصفحة الرئيسية')}</Link>
        </div>
      ) : (
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600 }}>{t(invitation ? 'إنشاء حساب' : 'طلب التسجيل')}</h1>
          <p style={{ margin: 0, fontSize: 16, color: '#3B4A47', lineHeight: 1.7 }}>{t(invitation ? 'للمحامين وأعضاء المكاتب.' : 'املؤوا الاستمارة: نتصل بكم خلال يوم عمل لتقديم الخدمة وتفعيل حسابكم.')}</p>
        </div>
        {invitation && <FormAlert tone="success">{t('تمت دعوتكم للانضمام إلى مكتب على ملفاتي. أنشئوا حسابكم بالبريد الذي وصلته الدعوة.')}</FormAlert>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <label className="mp-field">{t('الاسم الشخصي')}<input className="mp-input" autoComplete="given-name" value={form.prenom} onChange={set('prenom')} required minLength={2} maxLength={80} /></label>
          <label className="mp-field">{t('الاسم العائلي')}<input className="mp-input" autoComplete="family-name" value={form.nom} onChange={set('nom')} required minLength={2} maxLength={80} /></label>
        </div>
        <label className="mp-field">{t('البريد الإلكتروني')}
          <input ref={champEmail} className="mp-input" type="email" autoComplete="email" value={form.email} onChange={(e) => { setErreurEmail(''); set('email')(e) }} required dir="ltr"
            aria-invalid={!!erreurEmail} aria-describedby={erreurEmail ? 'err-email' : undefined} style={{ textAlign: langue === 'ar' ? 'right' : 'left', ...(erreurEmail ? { borderColor: '#C0392B' } : {}) }} />
          {erreurEmail && <span id="err-email" role="alert" style={{ fontSize: 13, fontWeight: 600, color: '#9B2C20' }}>{erreurEmail}</span>}
          {!erreurEmail && <span style={{ fontSize: 13, fontWeight: 400, color: '#5E6B67' }}>{t('بريد من مزوّد معروف: Gmail، Outlook، Hotmail، Yahoo، iCloud…')}</span>}
        </label>
        <label className="mp-field">{t('رقم الهاتف (واتساب)')}
          <span dir="ltr" style={{ display: 'flex', gap: 8 }}>
            <span className="num" style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', padding: '0 14px', border: '1px solid #CFCAC0', borderRadius: 10, background: '#F5F3EE', fontSize: 15, fontWeight: 400 }}>+212</span>
            <input className="mp-input num" type="tel" inputMode="tel" autoComplete="tel-national" value={form.telephone} onChange={set('telephone')} required pattern="[\d\s+]{9,16}" placeholder="6 61 23 45 67" />
          </span>
          <span style={{ fontSize: 13, fontWeight: 400, color: '#5E6B67' }}>{t('سنرسل رمز تحقق على واتساب قبل أي تنبيه.')}</span>
        </label>
        <label className="mp-field">{t('كلمة المرور')}
          <PasswordInput autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} aria-describedby="pw-hint" />
          <span aria-hidden style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4 }}>
            {[0, 1, 2, 3].map((i) => <span key={i} style={{ height: 4, borderRadius: 2, background: i < f ? (f <= 1 ? '#C0392B' : '#0E5A4E') : '#E4E0D6' }} />)}
          </span>
          <span id="pw-hint" style={{ fontSize: 13, fontWeight: 400, color: f >= 3 ? '#0B4A40' : '#3B4A47' }}>{form.password ? <>{t(FORCE_AR[f] || 'ضعيفة')} · </> : null}{tx('{a} أحرف على الأقل، و{b} مستحسنة', { a: <span className="num">8</span>, b: <span className="num">12</span> })}</span>
        </label>
        {!invitation && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
              <label className="mp-field">{t('هيئة المحامين')}<input className="mp-input" value={form.barreau} onChange={set('barreau')} maxLength={120} placeholder={t('هيئة الدار البيضاء')} /></label>
              <label className="mp-field">{t('المدينة')}<input className="mp-input" value={form.ville} onChange={set('ville')} maxLength={80} autoComplete="address-level2" /></label>
              <label className="mp-field">{t('الهيكلة')}
                <select className="mp-input" value={form.structure} onChange={set('structure')}>
                  <option value="">{t('اختاروا…')}</option><option value="SEUL">{t('محامٍ بمفرده')}</option><option value="CABINET">{t('مكتب (عدة محامين)')}</option>
                </select>
              </label>
              <label className="mp-field">{t('عدد الملفات تقريباً')}
                <select className="mp-input" value={form.nbDossiers} onChange={set('nbDossiers')}>
                  <option value="">{t('اختاروا…')}</option><option value="MOINS_50">{t('أقل من 50')}</option><option value="50_200">{t('من 50 إلى 200')}</option><option value="200_500">{t('من 200 إلى 500')}</option><option value="PLUS_500">{t('أكثر من 500')}</option>
                </select>
              </label>
            </div>
            <label className="mp-field"><span>{t('رسالة')} <span style={{ fontWeight: 400, color: '#5E6B67' }}>{t('(اختياري)')}</span></span>
              <textarea className="mp-input" rows={3} maxLength={1000} value={form.message} onChange={set('message')} placeholder={t('مثال: أفضّل الاتصال بعد الساعة 17:00')} style={{ padding: 12, minHeight: 84, resize: 'vertical' }} />
            </label>
          </>
        )}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, lineHeight: 1.7, color: '#3B4A47' }}>
          <input type="checkbox" required checked={accepte} onChange={(e) => setAccepte(e.target.checked)} style={{ flex: 'none', width: 22, height: 22, marginTop: 3, accentColor: '#0E5A4E' }} />
          <span>{tx('أوافق على شروط الاستعمال وسياسة الخصوصية، بما فيها معالجة المعطيات وفق القانون {loi}.', { loi: <span className="num">09.08</span> })}</span>
        </label>
        {error && <FormAlert>{error}</FormAlert>}
        <button type="submit" disabled={loading} aria-busy={loading} className="mp-action" style={submitStyle(loading)}>{loading ? <EnCours texte="جارٍ الإرسال…" /> : t(invitation ? 'إنشاء الحساب' : 'إرسال الطلب')}</button>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 15, color: '#3B4A47' }}>
          {t('لديكم حساب؟')} <Link href="/login" style={{ fontWeight: 600, padding: '8px 4px', display: 'inline-block', textDecoration: 'none' }}>{t('الدخول')}</Link>
        </p>
      </form>
      )}
    </AuthSplit>
  )
}
