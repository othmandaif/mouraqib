'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, setToken } from '@/lib/api'
import { erreurAr } from '@/lib/erreurs'
import { AuthSplit, PasswordInput, FormAlert, submitStyle } from '@/components/auth/AuthSplit'
import { EnCours } from '@/components/ui/Chargement'
import { useLangue } from '@/lib/langue'

/** Lien envoyé par le commercial : l'avocat choisit son mot de passe et entre directement. */
export default function ActiverPage() {
  const router = useRouter()
  const { t, tx } = useLangue()
  const [jeton, setJeton] = useState('')
  const [compte, setCompte] = useState<{ prenom: string; nom: string; email: string } | null>(null)
  const [mdp, setMdp] = useState('')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const j = new URLSearchParams(window.location.search).get('jeton') ?? ''
    setJeton(j)
    if (!j) { setErreur(erreurAr('Lien expiré')); return }
    apiFetch<{ prenom: string; nom: string; email: string }>(`/auth/activer/${j}`).then(setCompte).catch((e) => setErreur(erreurAr(e?.message)))
  }, [])

  const activer = async (e: React.FormEvent) => {
    e.preventDefault()
    setErreur(''); setLoading(true)
    try {
      const r = await apiFetch<{ token: string; user?: { role: string } }>('/auth/activer', { method: 'POST', body: JSON.stringify({ jeton, motDePasse: mdp }) })
      setToken(r.token)
      router.push(r.user?.role === 'ADMIN' ? '/admin' : '/onboarding') // nouvel administrateur : directement son espace
    } catch (err: any) { setErreur(erreurAr(err?.message)) } finally { setLoading(false) }
  }

  return (
    <AuthSplit aside={<h2 style={{ margin: 0, fontSize: 38, fontWeight: 600, lineHeight: 1.35, color: '#FFFFFF' }}>{t('مرحباً بكم في ملفاتي.')}<br />{t('خطوة واحدة وتبدأون.')}</h2>}>
      <form onSubmit={activer} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600 }}>{t('تفعيل الحساب')}</h1>
          <p style={{ margin: 0, fontSize: 16, color: '#3B4A47', lineHeight: 1.7 }}>
            {compte ? <>{t('ذ. ')}{compte.prenom} {compte.nom} · <span dir="ltr">{compte.email}</span><br />{t('اختاروا كلمة مرور لحسابكم.')}</> : t('جارٍ التحقق من الرابط…')}
          </p>
        </div>
        {compte && (
          <label className="mp-field">{t('كلمة المرور')}
            <PasswordInput autoComplete="new-password" value={mdp} onChange={(e) => setMdp(e.target.value)} required minLength={8} />
            <span style={{ fontSize: 13, fontWeight: 400, color: '#3B4A47' }}>{tx('{a} أحرف على الأقل، و{b} مستحسنة', { a: <span className="num">8</span>, b: <span className="num">12</span> })}</span>
          </label>
        )}
        {erreur && <FormAlert>{erreur}</FormAlert>}
        {compte && <button type="submit" disabled={loading} aria-busy={loading} className="mp-action" style={submitStyle(loading)}>{loading ? <EnCours texte="جارٍ التفعيل…" /> : t('تفعيل والدخول')}</button>}
      </form>
    </AuthSplit>
  )
}
