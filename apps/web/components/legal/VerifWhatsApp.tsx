'use client'

import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { erreurAr } from '@/lib/erreurs'
import { FormAlert } from '@/components/auth/AuthSplit'
import { Attente } from '@/components/ui/Chargement'
import { useLangue } from '@/lib/langue'

const INPUT: React.CSSProperties = { fontFamily: 'inherit', fontSize: 16, color: '#15201E', background: '#FFFFFF', border: '1px solid #CFCAC0', borderRadius: 10, minHeight: 50, padding: '0 14px', boxSizing: 'border-box', width: '100%', minWidth: 0 }
const PRIMARY: React.CSSProperties = { fontFamily: 'inherit', fontSize: 16, fontWeight: 600, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, borderRadius: 999, minHeight: 52, width: '100%', cursor: 'pointer' }  // + className="mp-action" (survol, appui)
const OFF: React.CSSProperties = { background: 'var(--mp-choix-fond)', color: '#7A4E06', cursor: 'not-allowed' }
const CSS = `.wa-otp{width:100%;min-width:0;height:56px;box-sizing:border-box;text-align:center;font-size:24px;font-weight:600;color:#15201E;background:#FFFFFF;border:1.5px solid #CFCAC0;border-radius:12px;padding:0}
.wa-otp:focus{outline:none;border-color:#0E5A4E;box-shadow:0 0 0 4px #CDE5DD}`

/** Normalise « 06 61 23 45 67 » / « 6612… » / « +2126… » en +2126…  */
export function normaliserMaroc(v: string) {
  const d = v.replace(/[^\d+]/g, '')
  if (d.startsWith('+')) return d
  if (d.startsWith('00')) return `+${d.slice(2)}`
  if (d.startsWith('212')) return `+${d}`
  return `+212${d.replace(/^0/, '')}`
}
const lisible = (n: string) => n.replace(/^\+212(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '+212 $1 $2 $3 $4 $5')

/** Saisie du numéro puis du code à 6 chiffres (Paramètres › واتساب et Onboarding, étape 2). */
export function VerifWhatsApp({ numeroInitial = '', dejaVerifie = false, onTermine, apresTexte }: {
  numeroInitial?: string; dejaVerifie?: boolean; onTermine?: () => void; apresTexte?: React.ReactNode
}) {
  const [telephone, setTelephone] = useState(numeroInitial.replace(/^\+212/, ''))
  const [envoyeA, setEnvoyeA] = useState('')
  const [chiffres, setChiffres] = useState<string[]>(Array(6).fill(''))
  const [step, setStep] = useState<'phone' | 'code' | 'done'>(dejaVerifie ? 'done' : 'phone')
  const [attente, setAttente] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const { t, tx } = useLangue()

  useEffect(() => { if (dejaVerifie) setStep('done') }, [dejaVerifie])
  useEffect(() => {
    if (attente <= 0) return
    const minuterie = setTimeout(() => setAttente((s) => s - 1), 1000)
    return () => clearTimeout(minuterie)
  }, [attente])

  const envoyer = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(''); setLoading(true)
    const numero = normaliserMaroc(telephone)
    try {
      const r = await apiFetch<{ renvoiDans?: number }>('/auth/whatsapp/envoyer-code', { method: 'POST', body: JSON.stringify({ telephone: numero }) })
      setEnvoyeA(numero); setChiffres(Array(6).fill('')); setStep('code'); setAttente(r.renvoiDans ?? 60)
      setTimeout(() => refs.current[0]?.focus(), 50)
    } catch (err: any) { setError(erreurAr(err?.message)) } finally { setLoading(false) }
  }

  const code = chiffres.join('')
  const verifier = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (code.length !== 6) return
    setError(''); setLoading(true)
    try {
      await apiFetch('/auth/whatsapp/verifier-code', { method: 'POST', body: JSON.stringify({ code }) })
      setStep('done'); onTermine?.()
    } catch (err: any) { setError(erreurAr(err?.message)); setChiffres(Array(6).fill('')); refs.current[0]?.focus() } finally { setLoading(false) }
  }

  const saisir = (i: number, v: string) => {
    const d = v.replace(/\D/g, '')
    if (d.length > 1) { // collage du code entier
      const next = d.slice(0, 6).split('').concat(Array(6).fill('')).slice(0, 6)
      setChiffres(next); refs.current[Math.min(d.length, 5)]?.focus(); return
    }
    const next = [...chiffres]; next[i] = d; setChiffres(next)
    if (d && i < 5) refs.current[i + 1]?.focus()
  }
  const touche = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chiffres[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'Enter') verifier()
  }

  const titre = (texte: string, p: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, lineHeight: 1.35 }}>{texte}</h1>
      <p style={{ margin: 0, fontSize: 16, color: '#3B4A47', lineHeight: 1.7 }}>{p}</p>
    </div>
  )
  const exemple = (
    <section aria-label={t('مثال لتنبيه')} style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#3B4A47' }}>{t('هكذا سيصلكم التنبيه')}</span>
      <div style={{ background: '#EFEBE3', borderRadius: 12, padding: 12 }}>
        <div style={{ background: '#FFFFFF', borderRadius: '4px 12px 12px 12px', padding: '10px 12px', fontSize: 14, lineHeight: 1.7, boxShadow: '0 1px 1px rgba(0,0,0,.08)' }}>
          <strong style={{ fontWeight: 600, color: '#9B2C20' }}>{t('آخر أجل بعد يومين')}</strong><br />{tx('استئناف · ملف {n}', { n: <span className="num">…/1801/77</span> })}<br />{t('الأربعاء')} <span className="num">21/10</span>
        </div>
      </div>
    </section>
  )
  const note = <span style={{ fontSize: 13, color: '#5E6B67', textAlign: 'center', lineHeight: 1.6 }}>{t('لن نرسل أي رسالة قبل التأكيد. لا تتضمن الرسائل أسماء الأطراف.')}</span>
  const mm = `00:${String(attente).padStart(2, '0')}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <style>{CSS}</style>
      <span style={{ width: 64, height: 64, borderRadius: 20, background: '#E3F0EC', color: '#0E5A4E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {step === 'done' ? <Check size={30} aria-hidden /> : (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
        )}
      </span>

      {step === 'done' ? (
        <>
          {titre(t('تم تأكيد رقم واتساب'), t('ستصلكم التنبيهات والملخص اليومي على هذا الرقم.'))}
          {apresTexte}
        </>
      ) : step === 'phone' ? (
        <form onSubmit={envoyer} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {titre(t('تفعيل تنبيهات واتساب'), tx('سنرسل رمزاً من {n} أرقام إلى رقمكم للتأكد منه.', { n: <span className="num">6</span> }))}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 600 }}>{t('رقم واتساب')}
            <span dir="ltr" style={{ display: 'flex', gap: 8 }}>
              <span className="num" style={{ ...INPUT, width: 'auto', flex: 'none', display: 'inline-flex', alignItems: 'center', background: '#F5F3EE', color: '#3B4A47' }}>+212</span>
              <input className="num" type="tel" autoComplete="tel-national" inputMode="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} required placeholder="6 61 23 45 67" style={INPUT} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 400, color: '#5E6B67' }}>{t('تأكدوا أن هذا الرقم يستعمل واتساب.')}</span>
          </label>
          {exemple}
          {error && <FormAlert>{error}</FormAlert>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="mp-action" type="submit" disabled={loading || telephone.replace(/\D/g, '').length < 9} aria-busy={loading} style={{ ...PRIMARY, ...(!loading && telephone.replace(/\D/g, '').length < 9 ? OFF : {}) }}><Attente actif={loading} texte="جارٍ الإرسال…">{t('إرسال الرمز')}</Attente></button>
            {note}
          </div>
        </form>
      ) : (
        <form onSubmit={verifier} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {titre(t('تأكيد رقم واتساب'), tx('أرسلنا رمزاً من {n} أرقام إلى {tel}', { n: <span className="num">6</span>, tel: <strong className="num" dir="ltr" style={{ color: '#15201E' }}>{lisible(envoyeA)}</strong> }))}
          <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="sr-only-ar">{t('رمز التحقق')}</legend>
            <div dir="ltr" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {chiffres.map((c, i) => (
                <input key={i} ref={(el) => { refs.current[i] = el }} aria-label={t('الرقم {n}', { n: i + 1 })} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={i === 0 ? 12 : 1} value={c} onChange={(e) => saisir(i, e.target.value)} onKeyDown={(e) => touche(i, e)} onFocus={(e) => e.target.select()} className="wa-otp num" />
              ))}
            </div>
          </fieldset>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 14 }}>
            {attente > 0
              ? <span style={{ color: '#3B4A47' }} aria-live="off">{tx('إعادة الإرسال بعد {mm}', { mm: <span className="num" style={{ fontWeight: 600, color: '#15201E' }}>{mm}</span> })}</span>
              : <button type="button" onClick={() => envoyer()} disabled={loading} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: 'transparent', color: '#0E5A4E', border: 0, minHeight: 44, padding: 0, cursor: 'pointer' }}>{t('إعادة إرسال الرمز')}</button>}
            <button type="button" onClick={() => { setStep('phone'); setError('') }} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: 'transparent', color: '#0E5A4E', border: 0, minHeight: 44, padding: 0, cursor: 'pointer' }}>{t('تغيير الرقم')}</button>
          </div>
          {exemple}
          {error && <FormAlert>{error}</FormAlert>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="mp-action" type="submit" disabled={loading || code.length !== 6} aria-busy={loading} style={{ ...PRIMARY, ...(!loading && code.length !== 6 ? OFF : {}) }}><Attente actif={loading} texte="جارٍ التحقق…">{t('تأكيد')}</Attente></button>
            {note}
          </div>
        </form>
      )}
    </div>
  )
}
