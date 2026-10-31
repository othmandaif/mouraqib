'use client'

// Première connexion avec un mot de passe provisoire (donné par l'admin) : l'utilisateur choisit le sien.
// L'API refuse toute autre action tant que ce n'est pas fait (middleware requireAuth).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { erreurAr } from '@/lib/erreurs'
import { AuthSplit, PasswordInput, FormAlert, submitStyle } from '@/components/auth/AuthSplit'
import { EnCours } from '@/components/ui/Chargement'
import { useLangue } from '@/lib/langue'

export default function MotDePasseProvisoirePage() {
  const { user, loading, refresh, logout } = useAuth()
  const router = useRouter()
  const { t, tx } = useLangue()
  const [f, setF] = useState({ actuel: '', nouveau: '', confirmation: '' })
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const min = user?.role === 'ADMIN' ? 12 : 8

  useEffect(() => { if (!loading && !user) router.replace('/login') }, [loading, user, router])
  // Mot de passe déjà changé (ex. page rechargée pour appliquer la langue du compte) : on entre dans l'app
  // au lieu de rester bloqué sur ce formulaire
  useEffect(() => {
    if (loading || !user || user.doitChangerMdp || enCours) return
    if (user.role === 'ADMIN') { router.replace('/admin'); return }
    apiFetch<{ dossiers: number }>('/dashboard/compteurs').catch(() => null).then((c) => router.replace(c?.dossiers === 0 ? '/onboarding' : '/dashboard'))
  }, [loading, user, enCours, router])

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault()
    setErreur('')
    if (f.nouveau !== f.confirmation) { setErreur(t('كلمتا المرور غير متطابقتين.')); return }
    setEnCours(true)
    try {
      await apiFetch('/auth/mot-de-passe', { method: 'POST', body: JSON.stringify({ actuel: f.actuel, nouveau: f.nouveau }) })
      await refresh().catch(() => null)
      if (user?.role === 'ADMIN') { router.replace('/admin'); return }
      const c = await apiFetch<{ dossiers: number }>('/dashboard/compteurs').catch(() => null)
      router.replace(c?.dossiers === 0 ? '/onboarding' : '/dashboard')
    } catch (err: any) {
      setErreur(erreurAr(err?.message))
    } finally { setEnCours(false) }
  }

  return (
    <AuthSplit aside={<h2 style={{ margin: 0, fontSize: 38, fontWeight: 600, lineHeight: 1.35, color: '#FFFFFF' }}>{t('خطوة أخيرة:')}<br />{t('اختاروا كلمة مروركم.')}</h2>}>
      <form onSubmit={soumettre} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600 }}>{t('كلمة مرور جديدة')}</h1>
          <p style={{ margin: 0, fontSize: 16, color: '#3B4A47', lineHeight: 1.7 }}>
            {user ? <>{t('مرحباً')} {user.role === 'ADMIN' ? '' : t('ذ. ')}{user.prenom}. </> : null}{t('دخلتم بكلمة مرور مؤقتة. لحماية حسابكم، اختاروا كلمة مرور خاصة بكم لا يعرفها أحد غيركم.')}
          </p>
        </div>
        <label className="mp-field">{t('كلمة المرور المؤقتة')}
          <PasswordInput autoComplete="current-password" value={f.actuel} onChange={(e) => setF({ ...f, actuel: e.target.value })} required />
        </label>
        <label className="mp-field">{t('كلمة المرور الجديدة')}
          <PasswordInput autoComplete="new-password" value={f.nouveau} onChange={(e) => setF({ ...f, nouveau: e.target.value })} required minLength={min} />
          <span style={{ fontSize: 13, fontWeight: 400, color: '#3B4A47' }}>{tx('{n} أحرف على الأقل.', { n: <span className="num">{min}</span> })}</span>
        </label>
        <label className="mp-field">{t('تأكيد كلمة المرور الجديدة')}
          <PasswordInput autoComplete="new-password" value={f.confirmation} onChange={(e) => setF({ ...f, confirmation: e.target.value })} required minLength={min} />
        </label>
        {erreur && <FormAlert>{erreur}</FormAlert>}
        <button type="submit" disabled={enCours} aria-busy={enCours} className="mp-action" style={submitStyle(enCours)}>{enCours ? <EnCours texte="جارٍ الحفظ…" /> : t('حفظ والمتابعة')}</button>
        <button type="button" onClick={logout} style={{ alignSelf: 'center', background: 'none', border: 0, color: '#5E6B67', fontFamily: 'inherit', fontSize: 15, minHeight: 44, cursor: 'pointer' }}>{t('خروج')}</button>
      </form>
    </AuthSplit>
  )
}
