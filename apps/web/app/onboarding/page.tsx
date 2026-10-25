'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { Logo } from '@/components/auth/AuthSplit'
import { AjoutDossier } from '@/components/legal/AjoutDossier'
import { VerifWhatsApp } from '@/components/legal/VerifWhatsApp'
import type { Preferences } from '@/components/legal/preferences'
import { Attente } from '@/components/ui/Chargement'

const ETAPES = ['أول ملف', 'تفعيل واتساب', 'وقت الملخص الصباحي']
const HEURES = ['06:00', '07:00', '08:00', '09:00', '10:00']
const CARTE: React.CSSProperties = { flex: '999 1 520px', minWidth: 0, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 20, padding: 32, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 22 }
const PRIMARY: React.CSSProperties = { fontFamily: 'inherit', fontSize: 16, fontWeight: 600, background: 'var(--mp-action)', color: 'var(--mp-action-texte)', border: 0, borderRadius: 999, minHeight: 52, padding: '0 28px', cursor: 'pointer' }  // + className="mp-action" (survol, appui)
const LIEN: React.CSSProperties = { fontFamily: 'inherit', fontSize: 15, fontWeight: 600, background: 'transparent', color: '#3B4A47', border: 0, minHeight: 44, cursor: 'pointer', padding: '0 4px' }
const CSS = `@keyframes sk{0%{opacity:.55}50%{opacity:1}100%{opacity:.55}}
@media (prefers-reduced-motion: no-preference){.ob-sk{animation:sk 1.4s ease-in-out infinite}}
@media (max-width: 760px){.ob-carte{padding:20px 16px !important}.ob-wrap{padding:0 16px 48px !important}}`

const Coche = () => (
  <span style={{ flex: 'none', width: 28, height: 28, borderRadius: '50%', background: '#E3F0EC', color: '#0E5A4E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
  </span>
)

export default function OnboardingPage() {
  const { user, loading, refresh } = useAuth()
  const router = useRouter()
  const [etape, setEtape] = useState(0)
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [heure, setHeure] = useState('07:00')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!loading && !user) router.replace('/login') }, [loading, user, router])
  useEffect(() => {
    const e = Number(new URLSearchParams(window.location.search).get('etape'))
    if (e >= 1 && e <= 3) setEtape(e - 1)
  }, [])
  useEffect(() => {
    if (etape !== 2 || prefs) return
    apiFetch<{ preferences: Preferences }>('/alertes/preferences').then((r) => { setPrefs(r.preferences); setHeure(r.preferences.digestHeure) }).catch(() => {})
  }, [etape, prefs])

  const terminer = async () => {
    setSaving(true)
    if (prefs) await apiFetch('/alertes/preferences', { method: 'PUT', body: JSON.stringify({ ...prefs, digestActif: true, digestHeure: heure }) }).catch(() => {})
    router.push('/dashboard')
  }

  if (loading || !user) return null

  return (
    <div dir="rtl" className="ob-wrap" style={{ background: '#F5F3EE', color: '#15201E', minHeight: '100vh', padding: '0 24px 64px', boxSizing: 'border-box' }}>
      <style>{CSS}</style>
      <header style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 0' }}>
        <Logo />
        <Link href="/dashboard" style={{ fontSize: 14, fontWeight: 600, color: '#3B4A47', padding: '10px 0', minHeight: 44, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>تخطّي الآن</Link>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <ol aria-label="خطوات البداية" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {ETAPES.map((t, i) => {
            const cur = i === etape, fait = i < etape
            return (
              <li key={t} aria-current={cur ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 999, padding: '6px 16px 6px 6px', fontSize: 14, ...(cur ? { background: '#15201E', color: '#FFFFFF', fontWeight: 600 } : { background: '#FFFFFF', border: '1px solid #E4E0D6', color: fait ? '#0B4A40' : '#3B4A47' }) }}>
                {fait ? <Coche /> : <span className="num" style={{ width: 28, height: 28, borderRadius: '50%', background: cur ? '#F5F3EE' : '#EEEAE1', color: '#15201E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>}
                {t}{fait && <span className="sr-only-ar"> (تم)</span>}
              </li>
            )
          })}
        </ol>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
          {etape === 0 && (
            <div className="ob-carte" style={CARTE}>
              <AjoutDossier titre="أضيفوا أول ملف" onAjoute={() => setEtape(1)} />
            </div>
          )}
          {etape === 1 && (
            <div className="ob-carte" style={CARTE}>
              <VerifWhatsApp
                numeroInitial={user.whatsappNumero ?? user.telephone ?? ''}
                dejaVerifie={user.whatsappVerifie}
                onTermine={() => { refresh().catch(() => {}) }}
                apresTexte={<button className="mp-action" type="button" onClick={() => setEtape(2)} style={{ ...PRIMARY, alignSelf: 'flex-start' }}>متابعة</button>}
              />
              {!user.whatsappVerifie && <button type="button" onClick={() => setEtape(2)} style={{ ...LIEN, alignSelf: 'center' }}>لاحقاً</button>}
            </div>
          )}
          {etape === 2 && (
            <div className="ob-carte" style={CARTE}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, lineHeight: 1.3 }}>متى يصلكم الملخص الصباحي؟</h1>
                <p style={{ margin: 0, fontSize: 16, color: '#3B4A47', lineHeight: 1.7 }}>كل يوم عمل: آجالكم القريبة وجلسات اليوم في رسالة واحدة. يمكن تغييره لاحقاً من الإعدادات.</p>
              </div>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                <legend className="sr-only-ar">ساعة الملخص</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {HEURES.map((h) => (
                    <button key={h} type="button" aria-pressed={heure === h} onClick={() => setHeure(h)} className="num mp-choix"
                      style={{ fontFamily: 'inherit', fontSize: 16, fontWeight: 600, minHeight: 48, minWidth: 84, borderRadius: 999, cursor: 'pointer', ...(heure === h ? { background: '#E3F0EC', color: '#0B4A40', border: '1.5px solid #0E5A4E' } : { background: '#FFFFFF', color: '#3B4A47', border: '1px solid #CFCAC0' }) }}>{h}</button>
                  ))}
                </div>
              </fieldset>
              <div style={{ background: '#EFEBE3', borderRadius: 12, padding: 12 }} aria-label="مثال للملخص">
                <div style={{ background: '#FFFFFF', borderRadius: '4px 12px 12px 12px', padding: '10px 12px', fontSize: 14, lineHeight: 1.75, boxShadow: '0 1px 1px rgba(0,0,0,.08)' }}>
                  <strong style={{ fontWeight: 600 }}>صباح الخير</strong> · <span className="num">{heure}</span><br />عليكم: <span className="num">2</span> أجل · الأقرب بعد يومين<br />جلسات اليوم: <span className="num">1</span>
                </div>
              </div>
              {!user.whatsappVerifie && <span style={{ fontSize: 13, color: '#7A4E06' }}>يصل الملخص على واتساب بعد تأكيد رقمكم، وهو متاح دائماً في التنبيهات داخل التطبيق.</span>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <button className="mp-action" type="button" onClick={terminer} disabled={saving} aria-busy={saving} style={PRIMARY}><Attente actif={saving} texte="جارٍ تجهيز حسابكم…">ابدأوا العمل</Attente></button>
                <button type="button" onClick={() => setEtape(1)} style={LIEN}>رجوع</button>
              </div>
            </div>
          )}

          <aside style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#3B4A47' }}>ما سترونه بعد دقائق</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ alignSelf: 'flex-start', background: '#F5F3EE', border: '1px solid #E4E0D6', borderBottom: 0, borderRadius: '12px 12px 0 0', padding: '6px 14px 4px', marginInlineStart: 16 }}><span className="num" style={{ fontSize: 13, fontWeight: 600, color: '#5E6B67' }}>…/…/…</span></div>
                <div style={{ border: '1px solid #E4E0D6', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }} aria-hidden="true">
                  <div className="ob-sk" style={{ height: 14, width: '70%', borderRadius: 7, background: '#EEEAE1' }} />
                  <div className="ob-sk" style={{ height: 12, width: '45%', borderRadius: 6, background: '#EEEAE1' }} />
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><div className="ob-sk" style={{ width: 44, height: 44, borderRadius: 12, background: '#EEEAE1' }} /><div className="ob-sk" style={{ flex: 1, height: 12, borderRadius: 6, background: '#EEEAE1' }} /></div>
                </div>
              </div>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['مسار الملف كاملاً، من الإدراج إلى آخر إجراء', 'الآجال المفتوحة، عليكم أو على الخصم', 'قراءة أولى بالذكاء الاصطناعي، مع مصادرها'].map((t) => (
                <li key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 15, lineHeight: 1.6 }}><Coche />{t}</li>
              ))}
            </ul>
            <div style={{ background: '#083B34', color: '#CFE5DD', borderRadius: 16, padding: '16px 18px', fontSize: 14, lineHeight: 1.7 }}>
              <strong style={{ color: '#FFFFFF', fontWeight: 600 }}>بعدها:</strong> {['تفعيل واتساب لتصلكم التنبيهات، ثم اختيار وقت الملخص الصباحي.', 'اختيار وقت الملخص الصباحي.', 'لوحة القيادة، مع آجالكم مرتّبة من الأقرب إلى الأبعد.'][etape]}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
