'use client'

import { useEffect, useState } from 'react'
import { IconeRonde } from '@/components/ui/Visuels'
import { UserRound, Bell, RefreshCw, Users, ShieldCheck, Database, Languages } from 'lucide-react'
import { useLangue, type Langue, t as tr } from '@/lib/langue'
import Link from 'next/link'
import { Lock, X } from 'lucide-react'
import { useAuth, aDroit } from '@/hooks/useAuth'
import { MemoireAssistant } from '@/components/legal/MemoireAssistant'
import { useApi } from '@/hooks/useApi'
import { apiFetch } from '@/lib/api'
import { erreurAr } from '@/lib/erreurs'
import { useToast } from '@/components/Toast'
import { useEnvoi, Attente } from '@/components/ui/Chargement'
import type { Preferences } from '@/components/legal/preferences'

const BARREAUX = ['هيئة الدار البيضاء', 'هيئة الرباط', 'هيئة مراكش', 'هيئة فاس', 'هيئة طنجة', 'هيئة أكادير', 'هيئة مكناس', 'هيئة وجدة', 'هيئة تطوان', 'هيئة القنيطرة', 'هيئة الجديدة', 'هيئة سطات', 'هيئة بني ملال', 'هيئة آسفي', 'هيئة خريبكة', 'هيئة تازة', 'هيئة الناظور', 'هيئة الحسيمة', 'هيئة العيون', 'هيئة ورزازات', 'هيئة الرشيدية', 'هيئة كلميم']
const LIGNES: { k: keyof Preferences['matrice']; label: React.ReactNode; verrou?: boolean }[] = [
  { k: 'delai48h', label: <>{tr('أجل عليكم خلال')}{' '}<span className="num">48</span>{' '}{tr('ساعة')}</>, verrou: true },
  { k: 'nouveauDelai', label: tr('بداية أجل جديد') },
  { k: 'jugement', label: tr('صدور حكم أو قرار') },
  { k: 'audience', label: tr('جلسة جديدة أو تأجيل') },
  { k: 'surveiller', label: tr('آجال الخصم (مراقبة)') },
]
const RAPPELS: [number, React.ReactNode][] = [[7, <><span className="num">7</span>{' '}{tr('أيام')}</>], [3, <><span className="num">3</span>{' '}{tr('أيام')}</>], [1, tr('يوم واحد')], [0, tr('صباح اليوم الأخير')], [14, <><span className="num">14</span>{' '}{tr('يوماً')}</>]]
const CALME: [string, string][] = [['20:00', '07:00'], ['21:00', '07:00'], ['22:00', '07:00'], ['22:00', '06:00'], ['23:00', '07:00'], ['00:00', '00:00']]
const HEURES = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)
// Droits que le responsable accorde ou retire à chaque membre (même liste que l'API)
const DROITS: [string, string][] = [['SUPPRESSION_DOSSIERS', tr('أرشفة وحذف الملفات')], ['CRM', tr('الموكلون')], ['FACTURATION', tr('الفوترة')], ['IA', tr('المساعد الذكي والوثائق')]]
const ROLE_AR: Record<string, string> = { ASSOCIE_GERANT: tr('مسؤول المكتب'), AVOCAT: tr('محامٍ'), SECRETAIRE: tr('كاتب'), ADMIN: tr('مسؤول') }

const CSS = `
.pr-admin #notif,.pr-admin #mah,.pr-admin #team,.pr-admin #data{display:none}
.pr-sub a{display:flex;align-items:center;min-height:44px;padding:0 14px;border-radius:12px;color:#3B4A47;font-size:15px;text-decoration:none}
.pr-sub a:hover{background:#EEEAE1;color:#15201E}
.pr-sub a[aria-current]{background:#FFFFFF;color:#0B4A40;font-weight:600;box-shadow:inset -3px 0 0 #0E5A4E}
html[dir=ltr] .pr-sub a[aria-current]{box-shadow:inset 3px 0 0 #0E5A4E}
.pr-card{background:#FFFFFF;border:1px solid #E4E0D6;border-radius:16px;padding:22px 24px;display:flex;flex-direction:column;gap:16px;scroll-margin-top:24px}
.pr-card h2{margin:0;font-size:19px;font-weight:600}
.pr-g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.pr-card label.pr-l{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600}
.pr-in{font-family:inherit;font-size:15px;color:#15201E;background:#FFFFFF;border:1px solid #CFCAC0;border-radius:10px;min-height:48px;padding:0 12px;box-sizing:border-box;width:100%;min-width:0}
.pr-in[readonly]{background:#F5F3EE;color:#3B4A47}
.pr-btn{display:inline-flex;align-items:center;gap:6px;font-family:inherit;font-size:14px;font-weight:600;background:#FFFFFF;color:#15201E;border:1px solid #CFCAC0;border-radius:999px;padding:0 16px;min-height:44px;cursor:pointer;text-decoration:none}
.pr-btn.p{background:var(--mp-action);color:var(--mp-action-texte);border-color:var(--mp-action)}
.pr-btn.danger{color:#9B2C20;border-color:#E3B1A9}
.pr-ok{font-size:13px;font-weight:600;color:#0B4A40;background:#E3F0EC;border-radius:999px;padding:3px 10px;white-space:nowrap}
.pr-warn{font-size:13px;font-weight:600;color:#7A4E06;background:#FDF1DC;border-radius:999px;padding:3px 10px;white-space:nowrap}
.pr-mx{width:100%;border-collapse:collapse;font-size:14px}
.pr-mx th,.pr-mx td{padding:6px 8px;border-bottom:1px solid #EEEAE1}
.pr-mx thead th{font-size:13px;color:#3B4A47;font-weight:600}
.pr-mx tbody th{text-align:start;font-weight:500}
.pr-mx td,.pr-mx thead th:not(:first-child){text-align:center}
.pr-sw{display:inline-block;width:46px;height:28px;box-sizing:content-box;border-radius:999px;background:#8C877C;position:relative;border:8px solid transparent;background-clip:padding-box;cursor:pointer;vertical-align:middle;padding:0}
.pr-sw::after{content:'';position:absolute;top:3px;inset-inline-start:3px;width:22px;height:22px;border-radius:50%;background:#FFFFFF;box-shadow:0 1px 2px rgba(0,0,0,.25)}
.pr-sw[aria-checked="true"]{background-color:var(--mp-action)}
.pr-sw[aria-checked="true"]::after{inset-inline-start:auto;inset-inline-end:3px}
.pr-sw:disabled{opacity:.55;cursor:not-allowed}
.pr-chip{font-family:inherit;font-size:14px;font-weight:600;background:#FFFFFF;color:#3B4A47;border:1px solid #CFCAC0;border-radius:999px;padding:0 14px;min-height:44px;cursor:pointer}
.pr-chip[aria-pressed="true"]{background:var(--mp-choix-fond);color:var(--mp-choix-texte);border-color:var(--mp-choix-bord);box-shadow:inset 0 0 0 1px var(--mp-choix-bord)}
.pr-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #EEEAE1}
.pr-row:last-child{border-bottom:0}
.pr-row>div{flex:1 1 260px;display:flex;flex-direction:column;gap:3px;min-width:0}
.pr-row strong{font-size:15px;font-weight:600}
.pr-row>div span{font-size:13px;color:#5E6B67}
.pr-av{flex:none;width:40px;height:40px;border-radius:50%;background:#E3F0EC;color:#083B34;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px}
@media (max-width: 760px){.pr-sub{display:none !important}.pr-card{padding:18px 14px !important}.pr-mx th,.pr-mx td{padding:4px 2px !important}.pr-sw{border-width:8px 2px !important}}
`

export default function ParametresPage() {
  const { user, logout, refresh } = useAuth()
  const { toast } = useToast()
  const { t, langue, changerLangue } = useLangue()
  const { data: prefsData } = useApi<{ whatsappNumero: string | null; whatsappVerifie: boolean; preferences: Preferences }>('/alertes/preferences')
  const { data: sync, refetch: refetchSync } = useApi<{ actifs: number; derniereVerif: string | null; prochaineVerif: string | null }>('/dossiers/sync-statut')
  const { data: equipe, refetch: refetchEquipe } = useApi<{ membres: { id: string; nom: string; prenom: string; email: string; role: string; droitsRetires?: string[]; doitChangerMdp?: boolean }[]; invitations: { id: string; email: string; role: string; token: string }[]; places?: { max: number; utilisees: number } | null; peutInviter?: boolean }>('/auth/equipe')
  const { data: sessions, refetch: refetchSessions } = useApi<{ id: string; userAgent: string | null; createdAt: string; actuelle: boolean }[]>('/auth/sessions')
  const [section, setSection] = useState('notif')
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [prefsOrigine, setPrefsOrigine] = useState('')
  const [profil, setProfil] = useState({ nom: '', prenom: '', barreau: '' })
  const [invite, setInvite] = useState({ prenom: '', nom: '', email: '', role: 'AVOCAT', droitsRetires: [] as string[] })
  // Accès d'un membre créé ou réinitialisé : affiché une fois, à transmettre au membre
  const [acces, setAcces] = useState<{ nom: string; email: string; mdp: string } | null>(null)
  const [mdp, setMdp] = useState({ actuel: '', nouveau: '' })
  const [apercu, setApercu] = useState(false)
  const [formInvite, setFormInvite] = useState(false)
  const [formMdp, setFormMdp] = useState(false)

  useEffect(() => { if (prefsData) { setPrefs(prefsData.preferences); setPrefsOrigine(JSON.stringify(prefsData.preferences)) } }, [prefsData])
  useEffect(() => { if (user) setProfil({ nom: user.nom, prenom: user.prenom, barreau: user.barreau ?? '' }) }, [user])
  useEffect(() => {
    const h = window.location.hash.slice(1)
    if (h) { setSection(h); document.getElementById(h)?.scrollIntoView() }
  }, [])

  const modifie = !!prefs && JSON.stringify(prefs) !== prefsOrigine
  const profilModifie = !!user && (profil.nom !== user.nom || profil.prenom !== user.prenom || profil.barreau !== (user.barreau ?? ''))
  // Une action à la fois ; `k` désigne le bouton qui affiche l'attente (useEnvoi)
  const { cle, occupe, lancer } = useEnvoi()
  const run = async (fn: () => Promise<unknown>, ok: string, k = 'action') => (await lancer(k, async () => {
    try { await fn(); toast(ok, 'success'); return true } catch (e: any) { toast(erreurAr(e?.message), 'error'); return false }
  })) ?? false
  const att = (k: string, label: React.ReactNode, texte = tr('جارٍ الحفظ…'), sombre = true) => <Attente actif={cle === k} texte={texte} sombre={sombre}>{label}</Attente>

  const enregistrerPrefs = () => run(async () => { const r = await apiFetch<{ preferences: Preferences }>('/alertes/preferences', { method: 'PUT', body: JSON.stringify(prefs) }); setPrefs(r.preferences); setPrefsOrigine(JSON.stringify(r.preferences)) }, tr('حُفظت إعدادات التنبيهات.'), 'prefs')
  // Photo réduite à 192 px (JPEG) dans le navigateur : quelques dizaines de Ko, stockée sur le compte
  const changerAvatar = (fichier: File) => run(async () => {
    if (!fichier.type.startsWith('image/')) throw new Error('Choisissez une image')
    const img = await createImageBitmap(fichier)
    const cote = Math.min(img.width, img.height), T = 192
    const c = document.createElement('canvas'); c.width = T; c.height = T
    c.getContext('2d')!.drawImage(img, (img.width - cote) / 2, (img.height - cote) / 2, cote, cote, 0, 0, T, T) // recadrage carré centré
    await apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify({ avatar: c.toDataURL('image/jpeg', 0.85) }) })
    await refresh()
  }, tr('حُفظت الصورة.'), 'avatar')
  // Réglage du compte : enregistré sur le serveur (tous les appareils), puis rechargement dans la nouvelle langue
  const choisirLangue = (l: Langue) => { if (l !== langue) run(async () => { await apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify({ langue: l }) }); changerLangue(l); window.location.reload() }, l === 'fr' ? 'Langue enregistrée.' : tr('حُفظت اللغة.'), 'langue') }
  const enregistrerProfil = () => run(async () => { await apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify(profil) }); await refresh() }, tr('حُفظ الملف الشخصي.'), 'profil')
  const setCanal = (k: keyof Preferences['matrice'], c: 'whatsapp' | 'app') => prefs && setPrefs({ ...prefs, matrice: { ...prefs.matrice, [k]: { ...prefs.matrice[k], [c]: !prefs.matrice[k][c] } } })
  const basculerRappel = (n: number) => prefs && setPrefs({ ...prefs, rappels: prefs.rappels.includes(n) ? prefs.rappels.filter((x) => x !== n) : [...prefs.rappels, n].sort((a, b) => b - a) })

  const inviter = async (e: React.FormEvent) => {
    e.preventDefault()
    let mdp = ''
    if (await run(async () => { mdp = (await apiFetch<{ motDePasseProvisoire: string }>('/auth/equipe/membres', { method: 'POST', body: JSON.stringify(invite) })).motDePasseProvisoire }, tr('أُنشئ حساب العضو.'), 'invite')) {
      setAcces({ nom: `${invite.prenom} ${invite.nom}`, email: invite.email, mdp })
      setInvite({ prenom: '', nom: '', email: '', role: 'AVOCAT', droitsRetires: [] }); setFormInvite(false); refetchEquipe()
    }
  }
  const basculerDroit = (m: { id: string; droitsRetires?: string[] }, d: string) => {
    const retires = m.droitsRetires ?? []
    const nouv = retires.includes(d) ? retires.filter((x) => x !== d) : [...retires, d]
    run(async () => { await apiFetch(`/auth/equipe/membres/${m.id}`, { method: 'PATCH', body: JSON.stringify({ droitsRetires: nouv }) }); await refetchEquipe() }, tr('حُفظت الصلاحيات.'), `droit:${m.id}:${d}`)
  }
  const reinitialiserMembre = (m: { id: string; prenom: string; nom: string; email: string }) => {
    if (!window.confirm(tr('إنشاء كلمة مرور مؤقتة جديدة لـ {prenom} {nom}؟ ستُغلق جلساته الحالية.', { prenom: m.prenom, nom: m.nom }))) return
    let mdp = ''
    run(async () => { mdp = (await apiFetch<{ motDePasseProvisoire: string }>(`/auth/equipe/membres/${m.id}/reinitialiser-mdp`, { method: 'POST' })).motDePasseProvisoire }, tr('أُنشئت كلمة مرور مؤقتة.'), `mdp:${m.id}`)
      .then((ok) => { if (ok) setAcces({ nom: `${m.prenom} ${m.nom}`, email: m.email, mdp }) })
  }
  const retirerMembre = (m: { id: string; prenom: string; nom: string }) => {
    if (!window.confirm(tr('حذف حساب {prenom} {nom}؟ تنتقل ملفاته ومواعيده إليكم، ويُغلق دخوله فوراً.', { prenom: m.prenom, nom: m.nom }))) return
    run(async () => { await apiFetch(`/auth/equipe/membres/${m.id}`, { method: 'DELETE' }); await refetchEquipe() }, tr('حُذف العضو، وانتقلت ملفاته إليكم.'), `del:${m.id}`)
  }

  const lienInvitation = (t: string) => `${window.location.origin}/register?invitation=${t}`
  const changerMdp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await run(() => apiFetch('/auth/mot-de-passe', { method: 'POST', body: JSON.stringify(mdp) }), tr('غُيّرت كلمة المرور، وأُغلقت الجلسات الأخرى.'), 'mdp')) { setMdp({ actuel: '', nouveau: '' }); setFormMdp(false); refetchSessions(); refresh() }
  }
  const exporter = () => lancer('export', async () => {
    try {
      const data = await apiFetch<unknown>('/auth/export')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      a.download = `malafipro-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click(); URL.revokeObjectURL(a.href)
    } catch { toast(tr('تعذّر تصدير البيانات.'), 'error') }
  })
  const supprimerCompte = async () => {
    if (!window.confirm(tr('سيُحذف حسابكم وكل بياناته نهائياً بعد 30 يوماً. يمكنكم الإلغاء بتسجيل الدخول قبل ذلك. متابعة؟'))) return
    // Déconnexion seulement si la demande est enregistrée (sinon l'avocat croirait son compte supprimé)
    if (await run(() => apiFetch('/auth/suppression', { method: 'POST' }), tr('سُجّل طلب حذف الحساب.'), 'suppression')) logout()
  }
  const ilYa = (d: string) => { const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000)); return m < 60 ? <>{tr('قبل')}{' '}<span className="num">{m}</span>{' '}{tr('دقيقة')}</> : <>{tr('قبل')}{' '}<span className="num">{Math.round(m / 60)}</span>{' '}{tr('ساعة')}</> }
  const dans = (d: string) => { const m = Math.max(0, Math.round((new Date(d).getTime() - Date.now()) / 60000)); return <>{tr('بعد')}{' '}<span className="num">{Math.floor(m / 60)}</span>{' '}{tr('ساعات و')}<span className="num">{m % 60}</span>{' '}{tr('دقيقة')}</> }
  const appareil = (ua: string | null) => !ua ? tr('جهاز غير معروف') : /iPhone|Android|Mobile/i.test(ua) ? tr('هاتف') : /iPad|Tablet/i.test(ua) ? tr('لوحي') : tr('حاسوب')
  const moisDepuis = user?.motDePasseChangeAt ?? user?.createdAt
  const mois = moisDepuis ? Math.floor((Date.now() - new Date(moisDepuis).getTime()) / (30 * 86_400_000)) : null
  const calme = CALME.some(([a, b]) => a === prefs?.calmeDebut && b === prefs?.calmeFin) ? CALME : prefs ? [...CALME, [prefs.calmeDebut, prefs.calmeFin] as [string, string]] : CALME
  const responsable = user?.role === 'ASSOCIE_GERANT'

  const admin = user?.role === 'ADMIN' // compte de gestion : seulement le compte et la sécurité
  const NAV: [string, string][] = ([['acc', tr('الحساب')], ['lang', tr('اللغة')], ['notif', tr('التنبيهات')], ['mem', tr('ذاكرة المساعد')], ['mah', tr('الربط بمحاكم')], ['team', tr('الفريق')], ['sec', tr('الأمان')], ['data', tr('البيانات والخصوصية')]] as [string, string][])
    .filter(([id]) => (!admin || id === 'acc' || id === 'lang' || id === 'sec') && (id !== 'mem' || aDroit(user, 'IA')))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600 }}>{tr('الإعدادات')}</h1>
        <p style={{ margin: 0, fontSize: 16, color: '#3B4A47' }}>{tr('الحساب، التنبيهات، الربط بمحاكم، الفريق والأمان.')}</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
        <nav className="pr-sub" aria-label={tr('أقسام الإعدادات')} style={{ flex: '0 0 220px', position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(([id, l]) => <a key={id} href={`#${id}`} aria-current={section === id ? 'true' : undefined} onClick={() => setSection(id)}>{t(l)}</a>)}
        </nav>

        <div className={admin ? 'pr-admin' : undefined} style={{ flex: '1 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860 }}>
          <section id="acc" className="pr-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={UserRound} taille={40} />{tr('الحساب')}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              {user?.avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.avatar} alt={tr('صورة الحساب')} width={64} height={64} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                : <span aria-hidden style={{ width: 64, height: 64, borderRadius: '50%', background: '#E3F0EC', color: '#083B34', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20 }}>{`${user?.prenom?.[0] ?? ''} ${user?.nom?.[0] ?? ''}`.trim()}</span>}
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <label className="pr-btn" style={{ cursor: 'pointer' }}>{att('avatar', user?.avatar ? tr('تغيير الصورة') : tr('إضافة صورة'), tr('جارٍ الحفظ…'))}
                  <input type="file" accept="image/*" hidden disabled={occupe} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) changerAvatar(f) }} />
                </label>
                {user?.avatar && <button type="button" className="pr-btn" disabled={occupe} onClick={() => run(async () => { await apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify({ avatar: null }) }); await refresh() }, tr('حُذفت الصورة.'), 'avatar')}>{tr('حذف')}</button>}
              </span>
              <span style={{ fontSize: 14, color: '#3B4A47' }}>{user?.cabinet?.nom ?? tr('حساب فردي')}</span>
            </div>
            <div className="pr-g2">
              <label className="pr-l">{tr('الاسم الشخصي')}<input className="pr-in" value={profil.prenom} onChange={(e) => setProfil({ ...profil, prenom: e.target.value })} /></label>
              <label className="pr-l">{tr('الاسم العائلي')}<input className="pr-in" value={profil.nom} onChange={(e) => setProfil({ ...profil, nom: e.target.value })} /></label>
              <label className="pr-l">{tr('هيئة المحامين')}<select className="pr-in" value={profil.barreau} onChange={(e) => setProfil({ ...profil, barreau: e.target.value })}><option value="">{tr('اختاروا الهيئة')}</option>{BARREAUX.map((b) => <option key={b} value={b}>{tr(b)}</option>)}</select></label>
              <label className="pr-l">{tr('البريد الإلكتروني')}<input className="pr-in" readOnly dir="ltr" value={user?.email ?? ''} style={{ textAlign: 'start' }} /></label>
              <label className="pr-l" style={{ gridColumn: '1 / -1' }}>{tr('الهاتف (واتساب)')}
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="pr-in num" readOnly value={prefsData?.whatsappNumero ?? user?.telephone ?? ''} style={{ textAlign: 'start' }} />
                  {prefsData?.whatsappVerifie ? <span className="pr-ok">{tr('تم التحقق')}</span> : <Link href="/parametres/whatsapp" className="pr-warn" style={{ textDecoration: 'none' }}>{tr('تأكيد الرقم')}</Link>}
                </span>
              </label>
            </div>
            {profilModifie && <div><button type="button" className="pr-btn p mp-action" onClick={enregistrerProfil} disabled={occupe} aria-busy={cle === 'profil'}>{att('profil', tr('حفظ الملف الشخصي'), undefined, false)}</button></div>}
            <div className="pr-row" style={{ borderTop: '1px solid #EEEAE1', borderBottom: 0, paddingBottom: 0 }}>
              <div><strong>{tr('الاشتراك')}</strong><span>{tr('العرض، مدة الصلاحية والتواصل مع مستشارنا.')}</span></div>
              <Link href="/abonnement" className="pr-btn">{tr('اشتراكي')}</Link>
            </div>
          </section>

          <section id="lang" className="pr-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={Languages} taille={40} />{t('اللغة')}</h2>
            <p style={{ margin: 0, fontSize: 14, color: '#3B4A47', lineHeight: 1.6 }}>{t('لغة الواجهة والوثائق وأجوبة المساعد. تُحفظ في حسابكم وتُطبَّق على كل أجهزتكم. نصوص محاكم (الإجراءات، المحاكم، الأطراف) تبقى بالعربية.')}</p>
            <div role="radiogroup" aria-label={t('لغة الواجهة')} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {([['ar', 'العربية'], ['fr', 'Français']] as [Langue, string][]).map(([l, nom]) => (
                <button key={l} type="button" role="radio" aria-checked={langue === l} aria-pressed={langue === l} lang={l} className="pr-chip" disabled={occupe} onClick={() => choisirLangue(l)}>
                  {cle === 'langue' && langue !== l ? att('langue', nom, tr('جارٍ الحفظ…'), false) : nom}
                </button>
              ))}
            </div>
          </section>

          <section id="notif" className="pr-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={Bell} taille={40} />{tr('التنبيهات')}</h2>
            <p style={{ margin: 0, fontSize: 14, color: '#3B4A47', lineHeight: 1.6 }}>{tr('اختاروا ما يصلكم وأين. الآجال القريبة تصل دائماً على واتساب.')}</p>
            {prefs && <>
              <table className="pr-mx">
                <thead><tr><th scope="col" style={{ textAlign: 'start' }}>{tr('الحدث')}</th><th scope="col">{tr('واتساب')}</th><th scope="col">{tr('داخل التطبيق')}</th></tr></thead>
                <tbody>
                  {LIGNES.map((l) => (
                    <tr key={l.k}>
                      <th scope="row">{l.label}</th>
                      {(['whatsapp', 'app'] as const).map((c) => (
                        <td key={c}><button type="button" className="pr-sw" role="switch" aria-checked={prefs.matrice[l.k][c]} disabled={l.verrou} aria-label={`${c === 'whatsapp' ? tr('واتساب') : tr('داخل التطبيق')}${l.verrou ? tr('، دائماً مفعّل') : ''}`} onClick={() => setCanal(l.k, c)} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!prefsData?.whatsappVerifie && <span style={{ fontSize: 13, color: '#7A4E06' }}>{tr('رسائل واتساب لا تُرسل قبل')}{' '}<Link href="/parametres/whatsapp">{tr('تأكيد رقمكم')}</Link>.</span>}
              <div className="pr-g2">
                <label className="pr-l">{tr('الملخص اليومي')}
                  <select className="pr-in" value={prefs.digestActif ? prefs.digestHeure : ''} onChange={(e) => setPrefs({ ...prefs, digestActif: !!e.target.value, digestHeure: e.target.value || prefs.digestHeure })}>
                    <option value="">{tr('متوقف')}</option>
                    {HEURES.slice(5, 12).map((h) => <option key={h} value={h}>{tr('كل يوم عمل على')}{' '}{h}</option>)}
                  </select>
                </label>
                <label className="pr-l">{tr('ساعات الهدوء')}
                  <select className="pr-in" value={`${prefs.calmeDebut}-${prefs.calmeFin}`} onChange={(e) => { const [calmeDebut, calmeFin] = e.target.value.split('-'); setPrefs({ ...prefs, calmeDebut, calmeFin }) }}>
                    {calme.map(([a, b]) => <option key={`${a}-${b}`} value={`${a}-${b}`}>{a === b ? tr('بدون ساعات هدوء') : tr('من {a} إلى {b}', { a, b })}</option>)}
                  </select>
                </label>
              </div>
              <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{tr('التذكير قبل آخر أجل')}</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {RAPPELS.map(([n, l]) => <button key={n} type="button" className="pr-chip" aria-pressed={prefs.rappels.includes(n)} onClick={() => basculerRappel(n)}>{l}</button>)}
                </div>
              </fieldset>
              <button type="button" onClick={() => setApercu(true)} style={{ alignSelf: 'flex-start', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: 'transparent', color: '#0E5A4E', border: 0, minHeight: 44, cursor: 'pointer', padding: 0 }}>{tr('معاينة رسائل واتساب')}</button>
            </>}
          </section>

          <section id="mah" className="pr-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={RefreshCw} taille={40} />{tr('الربط بمحاكم')}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', background: '#E3F0EC', borderRadius: 12, padding: '14px 16px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: sync?.derniereVerif ? '#2E8B6E' : '#8C877C' }} />
              <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <strong style={{ fontSize: 15, fontWeight: 600, color: '#0B4A40' }}>{sync?.derniereVerif ? tr('متصل') : tr('في انتظار أول مزامنة')} · <span className="num">{sync?.actifs ?? 0}</span>{' '}{tr('ملفاً تحت المتابعة')}</strong>
                {sync?.derniereVerif && <span style={{ fontSize: 13, color: '#23443C' }}>{tr('آخر مزامنة')}{' '}{ilYa(sync.derniereVerif)}{sync.prochaineVerif && new Date(sync.prochaineVerif).getTime() > Date.now() ? <>{' '}{tr('· التالية')}{' '}{dans(sync.prochaineVerif)}</> : null}</span>}
              </div>
              <button type="button" className="pr-btn" disabled={occupe} aria-busy={cle === 'sync'} onClick={() => run(async () => { await apiFetch('/dossiers/scraper-lot', { method: 'POST', body: JSON.stringify({}) }); await refetchSync() }, tr('بدأت المزامنة لكل الملفات.'), 'sync')}>{att('sync', tr('مزامنة الآن'), tr('جارٍ الطلب…'))}</button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: '#3B4A47', lineHeight: 1.7 }}>
              <Lock size={18} color="#0E5A4E" style={{ flex: 'none', marginTop: 3 }} aria-hidden />
              <span>{tr('نقرأ المعطيات العمومية لملفاتكم على بوابة محاكم برقم الملف فقط، دون حسابكم على البوابة.')}</span>
            </div>
          </section>

          <section id="team" className="pr-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={Users} taille={40} />{tr('الفريق')}</h2>
              {equipe?.peutInviter && <button type="button" className="pr-btn p mp-action" aria-expanded={formInvite} onClick={() => setFormInvite((v) => !v)}>{tr('إضافة عضو')}</button>}
            </div>
            {equipe && !equipe.places && <p style={{ margin: 0, fontSize: 14, color: '#3B4A47' }}>{tr('دعوة أعضاء الفريق (محامون وكتّاب يتابعون نفس الملفات) متاحة في عرض «مكتب». تواصلوا معنا لتغيير العرض.')}</p>}
            {equipe?.places && equipe.places.max > 0 && <p style={{ margin: 0, fontSize: 14, color: '#5E6B67' }}>{tr('المستخدمون:')}{' '}<span className="num">{equipe.places.utilisees}</span>{' '}{tr('من')}{' '}<span className="num">{equipe.places.max}</span>{' '}{tr('(مع الدعوات المعلّقة) · يتشارك الفريق نفس الملفات والآجال والمفكرة.')}</p>}
            {acces && (
              // Fenêtre au premier plan : avant, l'encadré s'affichait en haut de la section, hors de l'écran après le formulaire
              <div role="dialog" aria-modal="true" aria-labelledby="acces-titre" style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(21,32,30,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#FFFFFF', borderRadius: 18, padding: 22, width: 'min(480px, 100%)', boxShadow: '0 30px 60px -20px rgba(8,59,52,.45)' }}>
                <strong id="acces-titre" style={{ fontSize: 17 }}>{tr('دخول')}{' '}{acces.nom}</strong>
                <span style={{ fontSize: 14, color: '#3B4A47', lineHeight: 1.7 }}>{tr('أرسلوا له هذه المعلومات. سيُطلب منه اختيار كلمة مرور جديدة عند أول دخول. لن تظهر كلمة المرور هذه مرة أخرى.')}</span>
                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', background: '#F1F8F5', border: '1px solid #CDE5DD', borderRadius: 12, padding: 14, fontSize: 14 }}>
                  <dt style={{ color: '#5E6B67' }}>{tr('الرابط')}</dt><dd dir="ltr" style={{ margin: 0, textAlign: 'start' }}>{window.location.origin}/login</dd>
                  <dt style={{ color: '#5E6B67' }}>{tr('البريد الإلكتروني')}</dt><dd dir="ltr" style={{ margin: 0, textAlign: 'start' }}>{acces.email}</dd>
                  <dt style={{ color: '#5E6B67' }}>{tr('كلمة المرور المؤقتة')}</dt><dd dir="ltr" className="num" style={{ margin: 0, textAlign: 'start', fontSize: 20, fontWeight: 700, letterSpacing: '.08em', color: '#0B4A40' }}>{acces.mdp}</dd>
                </dl>
                <span style={{ fontSize: 13, color: '#7A4E06' }}>{tr('لن تظهر كلمة المرور مرة أخرى. إن ضاعت: زر «كلمة مرور مؤقتة» أمام اسم العضو يُنشئ واحدة جديدة.')}</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="pr-btn" onClick={async () => { await navigator.clipboard?.writeText(`${window.location.origin}/login\n${acces.email}\n${acces.mdp}`).catch(() => {}); toast(tr('نُسخت معلومات الدخول.'), 'success') }}>{tr('نسخ معلومات الدخول')}</button>
                  <a className="pr-btn" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(tr('مرحباً، هذه معلومات دخولك إلى ملفاتي:\nالرابط: {url}\nالبريد: {email}\nكلمة المرور المؤقتة: {mdp}\nسيُطلب منك اختيار كلمة مرور جديدة عند أول دخول.', { url: `${window.location.origin}/login`, email: acces.email, mdp: acces.mdp }))}`}>{tr('إرسال عبر واتساب')}</a>
                  <button type="button" className="pr-btn p mp-action" onClick={() => setAcces(null)}>{tr('تم')}</button>
                </div>
              </div>
              </div>
            )}
            {(equipe?.membres ?? []).map((m) => {
              const gerable = responsable && m.id !== user?.id && m.role !== 'ASSOCIE_GERANT'
              return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0', borderBottom: '1px solid #EEEAE1' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                  <span className="pr-av">{`${m.prenom[0] ?? ''} ${m.nom[0] ?? ''}`}</span>
                  <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <strong style={{ fontSize: 15, fontWeight: 600 }}>{m.prenom} {m.nom}</strong>
                    <span dir="ltr" style={{ fontSize: 13, color: '#5E6B67', textAlign: 'start' }}>{m.email}</span>
                    {gerable && m.doitChangerMdp && <span style={{ fontSize: 12, color: '#7A4E06' }}>{tr('لم يغيّر كلمة المرور المؤقتة بعد')}</span>}
                  </div>
                  {gerable ? (
                    <select aria-label={tr('دور {prenom} {nom}', { prenom: m.prenom, nom: m.nom })} aria-busy={cle === `role:${m.id}`} disabled={occupe} className="pr-in" style={{ width: 'auto', minHeight: 44 }} value={m.role} onChange={(e) => run(async () => { await apiFetch(`/auth/equipe/membres/${m.id}`, { method: 'PATCH', body: JSON.stringify({ role: e.target.value }) }); await refetchEquipe() }, tr('غُيّر الدور.'), `role:${m.id}`)}>
                      <option value="AVOCAT">{tr('محامٍ')}</option><option value="SECRETAIRE">{tr('كاتب')}</option>
                    </select>
                  ) : <span style={{ fontSize: 13, fontWeight: 600, color: '#3B4A47', background: '#F1EFEA', borderRadius: 999, padding: '4px 12px' }}>{ROLE_AR[m.role] ?? m.role}</span>}
                </div>
                {gerable && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingInlineStart: 52 }}>
                    <span style={{ fontSize: 13, color: '#5E6B67' }}>{tr('الصلاحيات:')}</span>
                    {DROITS.map(([d, l]) => (
                      <button key={d} type="button" className="pr-chip mp-choix" aria-pressed={!(m.droitsRetires ?? []).includes(d)} disabled={occupe} aria-busy={cle === `droit:${m.id}:${d}`} onClick={() => basculerDroit(m, d)}>{l}</button>
                    ))}
                    <span style={{ flex: 1 }} />
                    <button type="button" className="pr-btn" disabled={occupe} aria-busy={cle === `mdp:${m.id}`} onClick={() => reinitialiserMembre(m)}>{att(`mdp:${m.id}`, tr('كلمة مرور مؤقتة'), tr('جارٍ الإنشاء…'))}</button>
                    <button type="button" className="pr-btn danger" disabled={occupe} aria-busy={cle === `del:${m.id}`} onClick={() => retirerMembre(m)}>{att(`del:${m.id}`, tr('حذف'), tr('جارٍ الحذف…'))}</button>
                  </div>
                )}
              </div>
              )
            })}
            {(equipe?.invitations ?? []).map((i) => (
              <div key={i.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #EEEAE1' }}>
                <span className="pr-av" style={{ background: '#F1EFEA', color: '#3B4A47' }}>@</span>
                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}><strong dir="ltr" style={{ fontSize: 15, fontWeight: 600, textAlign: 'start' }}>{i.email}</strong><span style={{ fontSize: 13, color: '#5E6B67' }}>{ROLE_AR[i.role]}{' '}{tr('· دعوة قديمة تنتظر القبول')}</span></div>
                <button type="button" className="pr-btn" onClick={async () => { await navigator.clipboard?.writeText(lienInvitation(i.token)).catch(() => {}); toast(tr('نُسخ رابط الدعوة.'), 'success') }}>{tr('نسخ الرابط')}</button>
                <button type="button" className="pr-btn" aria-label={tr('إلغاء دعوة {email}', { email: i.email })} disabled={occupe} aria-busy={cle === `inv:${i.id}`} onClick={() => run(async () => { await apiFetch(`/auth/equipe/invitations/${i.id}`, { method: 'DELETE' }); await refetchEquipe() }, tr('أُلغيت الدعوة.'), `inv:${i.id}`)} style={{ padding: 0, width: 44, justifyContent: 'center' }}><Attente actif={cle === `inv:${i.id}`} sombre><X size={16} aria-hidden /></Attente></button>
              </div>
            ))}
            {formInvite && equipe?.peutInviter && <form onSubmit={inviter} style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#F5F3EE', borderRadius: 12, padding: 14 }}>
              <span style={{ fontSize: 14, color: '#3B4A47', lineHeight: 1.7 }}>{tr('يُنشأ الحساب فوراً بكلمة مرور مؤقتة تظهر لكم لترسلوها للعضو. يرى العضو ملفات المكتب حسب الصلاحيات التي تختارونها.')}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <label className="pr-l" style={{ flex: '1 1 160px' }}>{tr('الاسم الشخصي')}<input autoFocus required minLength={2} className="pr-in" value={invite.prenom} onChange={(e) => setInvite({ ...invite, prenom: e.target.value })} /></label>
                <label className="pr-l" style={{ flex: '1 1 160px' }}>{tr('الاسم العائلي')}<input required minLength={2} className="pr-in" value={invite.nom} onChange={(e) => setInvite({ ...invite, nom: e.target.value })} /></label>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <label className="pr-l" style={{ flex: '2 1 220px' }}>{tr('البريد الإلكتروني')}<input className="pr-in" type="email" required dir="ltr" placeholder="nom@gmail.com" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} style={{ textAlign: 'start' }} />
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#5E6B67' }}>{tr('هو معرّف الدخول. بريد Gmail أو Outlook أو ما شابه.')}</span></label>
                <label className="pr-l" style={{ flex: '1 1 140px' }}>{tr('الدور')}<select className="pr-in" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value, droitsRetires: e.target.value === 'SECRETAIRE' ? ['SUPPRESSION_DOSSIERS'] : [] })}><option value="AVOCAT">{tr('محامٍ')}</option><option value="SECRETAIRE">{tr('كاتب')}</option></select></label>
              </div>
              <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{tr('الصلاحيات')}{' '}<span style={{ fontWeight: 400, color: '#5E6B67' }}>{tr('(اضغطوا لمنح أو سحب صلاحية؛ يمكن تعديلها لاحقاً)')}</span></legend>
                {DROITS.map(([d, l]) => (
                  <button key={d} type="button" className="pr-chip mp-choix" aria-pressed={!invite.droitsRetires.includes(d)} onClick={() => setInvite({ ...invite, droitsRetires: invite.droitsRetires.includes(d) ? invite.droitsRetires.filter((x) => x !== d) : [...invite.droitsRetires, d] })}>{l}</button>
                ))}
              </fieldset>
              <div><button type="submit" className="pr-btn p mp-action" style={{ minHeight: 48 }} disabled={occupe} aria-busy={cle === 'invite'}>{att('invite', tr('إنشاء الحساب'), tr('جارٍ الإنشاء…'), false)}</button></div>
            </form>}
          </section>

          {!admin && aDroit(user, 'IA') && <MemoireAssistant />}

          <section id="sec" className="pr-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={ShieldCheck} taille={40} />{tr('الأمان')}</h2>
            <div className="pr-row">
              <div><strong>{tr('التحقق بخطوتين')}</strong><span>{tr('رمز على واتساب عند كل دخول.')}{!prefsData?.whatsappVerifie ? tr(' يتطلب تأكيد رقم واتساب.') : ''}</span></div>
              <button type="button" className="pr-sw" role="switch" aria-checked={!!user?.deuxFacteurs} aria-label={tr('التحقق بخطوتين')} disabled={!prefsData?.whatsappVerifie || occupe} aria-busy={cle === '2fa'}
                onClick={() => run(async () => { await apiFetch('/auth/deux-facteurs', { method: 'PATCH', body: JSON.stringify({ actif: !user?.deuxFacteurs }) }); await refresh() }, user?.deuxFacteurs ? tr('أُوقف التحقق بخطوتين.') : tr('فُعّل التحقق بخطوتين.'), '2fa')} />
            </div>
            <div className="pr-row">
              <div><strong>{tr('كلمة المرور')}</strong><span>{mois === null ? '' : mois < 1 ? tr('غُيّرت هذا الشهر.') : <>{tr('غُيّرت قبل')}{' '}<span className="num">{mois}</span> {mois === 1 ? tr('شهر') : mois === 2 ? tr('شهرين') : tr('أشهر')}.</>}</span></div>
              <button type="button" className="pr-btn" aria-expanded={formMdp} onClick={() => setFormMdp((v) => !v)}>{tr('تغيير')}</button>
              {formMdp && (
                <form onSubmit={changerMdp} style={{ flex: '1 1 100%', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', background: '#F5F3EE', borderRadius: 12, padding: 14 }}>
                  <label className="pr-l" style={{ flex: '1 1 180px' }}>{tr('كلمة المرور الحالية')}<input className="pr-in" type="password" autoComplete="current-password" autoFocus value={mdp.actuel} onChange={(e) => setMdp({ ...mdp, actuel: e.target.value })} /></label>
                  <label className="pr-l" style={{ flex: '1 1 180px' }}>{tr('الجديدة (')}<span className="num">8</span>{' '}{tr('أحرف على الأقل)')}<input className="pr-in" type="password" autoComplete="new-password" minLength={8} value={mdp.nouveau} onChange={(e) => setMdp({ ...mdp, nouveau: e.target.value })} /></label>
                  <button type="submit" className="pr-btn p mp-action" style={{ minHeight: 48 }} disabled={!mdp.actuel || mdp.nouveau.length < 8 || occupe} aria-busy={cle === 'mdp'}>{att('mdp', tr('حفظ'), undefined, false)}</button>
                </form>
              )}
            </div>
            <div className="pr-row">
              <div><strong>{tr('الأجهزة المتصلة')}</strong><span>{[...new Set((sessions ?? []).map((s) => s.actuelle ? tr('هذا ال{v0}', { v0: appareil(s.userAgent).replace(/^جهاز غير معروف$/, 'جهاز') }) : appareil(s.userAgent)))].join(' · ') || '—'} · <span className="num">{sessions?.length ?? 0}</span>{' '}{tr('جلسات نشطة')}</span></div>
              <button type="button" className="pr-btn" disabled={(sessions?.length ?? 0) < 2 || occupe} aria-busy={cle === 'sessions'} onClick={() => run(async () => { await apiFetch('/auth/sessions/autres', { method: 'DELETE' }); await refetchSessions() }, tr('أُنهيت الجلسات الأخرى.'), 'sessions')}>{att('sessions', tr('إنهاء الجلسات الأخرى'), tr('جارٍ الإنهاء…'))}</button>
            </div>
          </section>

          <section id="data" className="pr-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><IconeRonde Icon={Database} taille={40} />{tr('البيانات والخصوصية')}</h2>
            <div className="pr-row"><div><strong>{tr('تصدير بياناتي')}</strong><span>{tr('كل الملفات والآجال والوثائق في ملف واحد.')}</span></div><button type="button" className="pr-btn" onClick={exporter} disabled={occupe} aria-busy={cle === 'export'}>{att('export', tr('تصدير'), tr('جارٍ التحضير…'))}</button></div>
            <div className="pr-row"><div><strong>{tr('حماية المعطيات الشخصية')}</strong><span>{tr('معالجة المعطيات وفق القانون')}{' '}<span className="num">09.08</span>{tr('. لا نشارك بياناتكم مع أي طرف.')}</span></div></div>
            <div className="pr-row"><div><strong style={{ color: '#9B2C20' }}>{tr('حذف الحساب')}</strong><span>{tr('يُحذف كل شيء نهائياً بعد')}{' '}<span className="num">30</span>{' '}{tr('يوماً.')}</span></div><button type="button" className="pr-btn danger" onClick={supprimerCompte} disabled={occupe} aria-busy={cle === 'suppression'}>{att('suppression', tr('حذف الحساب'), tr('جارٍ الإرسال…'))}</button></div>
          </section>

          {modifie && (
            <div role="status" style={{ position: 'sticky', bottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, background: '#15201E', color: '#FFFFFF', borderRadius: 14, padding: '10px 10px 10px 18px', boxShadow: '0 20px 40px -20px rgba(0,0,0,.6)', zIndex: 5 }}>
              <span style={{ flex: '1 1 200px', fontSize: 14, paddingInlineStart: 8 }}>{tr('لديكم تغييرات غير محفوظة في التنبيهات.')}</span>
              <button type="button" onClick={() => setPrefs(JSON.parse(prefsOrigine))} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: 'transparent', color: '#FFFFFF', border: '1px solid #5E6B67', borderRadius: 999, padding: '0 16px', minHeight: 44, cursor: 'pointer' }}>{tr('إلغاء')}</button>
              <button type="button" onClick={enregistrerPrefs} disabled={occupe} aria-busy={cle === 'prefs'} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: '#FFFFFF', color: '#15201E', border: 0, borderRadius: 999, padding: '0 18px', minHeight: 44, cursor: 'pointer' }}>{att('prefs', tr('حفظ'))}</button>
            </div>
          )}
        </div>
      </div>

      {apercu && (
        <div role="dialog" aria-modal="true" aria-label={tr('معاينة رسائل واتساب')} style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={() => setApercu(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(21,32,30,.45)' }} />
          <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: 20, padding: 22, width: 'min(520px, 100%)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{tr('هكذا تصلكم الرسائل')}</h2><button type="button" onClick={() => setApercu(false)} aria-label={tr('إغلاق')} style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid #E4E0D6', background: '#FFFFFF', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} aria-hidden /></button></div>
            <span style={{ fontSize: 14, color: '#3B4A47' }}>{tr('ثلاثة أسطر كحد أقصى، دون أسماء الأطراف، مع آخر أرقام الملف فقط.')}</span>
            {[
              <><b style={{ color: '#9B2C20' }}>{tr('آخر أجل بعد يومين')}</b><br />{tr('أجل الاستئناف · ملف')}{' '}<span className="num">…/1801/77</span><br />{tr('آخر يوم: الأربعاء')}{' '}<span className="num">21/10</span></>,
              <><b>{tr('صدر حكم في ملفكم')}</b><br />{tr('ملف')}{' '}<span className="num">…/1101/611</span>{' '}{tr('· ابتدائية الرباط')}<br />{tr('حدّدوا طبيعة الحكم لنحسب الآجال.')}</>,
              <><b>{tr('صباح الخير، اليوم الإثنين')}{' '}<span className="num">19/10</span></b><br />{tr('عليكم:')}{' '}<span className="num">2</span>{' '}{tr('أجل · الأقرب بعد يومين')}<br />{tr('جلسات اليوم:')}{' '}<span className="num">1</span></>,
            ].map((b, i) => (
              <div key={i} style={{ background: '#EFEBE3', borderRadius: 14, padding: 14 }}>
                <div style={{ background: '#FFFFFF', borderRadius: '4px 14px 14px 14px', padding: '10px 12px', fontSize: 15, lineHeight: 1.75, boxShadow: '0 1px 1px rgba(0,0,0,.08)', maxWidth: '92%' }}>{b}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
