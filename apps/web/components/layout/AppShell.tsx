'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { RechercheGlobale } from '@/components/layout/RechercheGlobale'
import type { AbonnementCourant } from '@/lib/abonnement'
import { useApi } from '@/hooks/useApi'
import { ToastProvider } from '@/components/Toast'
import { Splash } from '@/components/ui/Chargement'
import { BarreProgression } from '@/components/layout/BarreProgression'
import { useRaccourcis, AideRaccourcis } from '@/components/layout/Raccourcis'
import { InviteInstallation } from '@/components/layout/InviteInstallation'
import {
  Home, FolderOpen, Clock, Bell, Calendar, Menu, X, Sparkles, FileText, Archive, SlidersHorizontal, LogOut, Search, Users, Inbox, Wallet, Activity, ShieldCheck, Contact, Receipt,
} from 'lucide-react'

interface AppShellProps { children: React.ReactNode }

type NavItem = { href: string; label: string; Icon: typeof Home; badge?: 'deadlines' | 'dossiers' | 'alertes' | 'demandes' }
const NAV: { section?: string; items: NavItem[] }[] = [
  { items: [
    { href: '/dashboard', label: 'الرئيسية', Icon: Home },
    { href: '/dossiers', label: 'الملفات', Icon: FolderOpen, badge: 'dossiers' },
    { href: '/echeances', label: 'الآجال', Icon: Clock, badge: 'deadlines' },
    { href: '/calendrier', label: 'الأجندة', Icon: Calendar },
  ] },
  { section: 'المكتب', items: [
    { href: '/clients', label: 'الموكلون', Icon: Contact },
    { href: '/facturation', label: 'الفوترة والأتعاب', Icon: Receipt },
  ] },
  { section: 'الذكاء الاصطناعي', items: [
    { href: '/assistant', label: 'المساعد القانوني', Icon: Sparkles },
    { href: '/documents', label: 'محرّر الوثائق', Icon: FileText },
    { href: '/documents/mes', label: 'وثائقي', Icon: Archive },
  ] },
  { section: 'المتابعة', items: [
    { href: '/alertes', label: 'التنبيهات', Icon: Bell, badge: 'alertes' },
    { href: '/parametres', label: 'الإعدادات', Icon: SlidersHorizontal },
  ] },
]
// Espace du commercial / administrateur : séparé de l'app avocat (pas de dossiers ni de délais)
const NAV_ADMIN: { section?: string; items: NavItem[] }[] = [
  { items: [
    { href: '/admin', label: 'طلبات التسجيل', Icon: Inbox, badge: 'demandes' },
    { href: '/admin/comptes', label: 'الحسابات والاشتراكات', Icon: Users },
    { href: '/admin/compta', label: 'المحاسبة', Icon: Wallet },
    { href: '/admin/sante', label: 'سلامة النظام', Icon: Activity },
  ] },
  { items: [{ href: '/admin/admins', label: 'المشرفون', Icon: ShieldCheck }] },
]
const BOTTOM_ADMIN = [
  { href: '/admin', label: 'الطلبات', Icon: Inbox },
  { href: '/admin/comptes', label: 'الحسابات', Icon: Users },
  { href: '/admin/compta', label: 'المحاسبة', Icon: Wallet },
  { href: '/admin/sante', label: 'النظام', Icon: Activity },
]
// Pages ouvertes au compte admin ; le reste (dossiers, délais, agenda, assistant…) le renvoie vers /admin
const PAGES_ADMIN = ['/admin'] // ni notifications, ni paramètres d'avocat, ni abonnement

// Barre du bas mobile : 4 destinations + « المزيد » qui ouvre le menu complet.
const BOTTOM = [
  { href: '/dashboard', label: 'الرئيسية', Icon: Home },
  { href: '/dossiers', label: 'الملفات', Icon: FolderOpen },
  { href: '/echeances', label: 'الآجال', Icon: Clock },
  { href: '/assistant', label: 'المساعد', Icon: Sparkles },
]

const CSS = `
.mp-shell{min-height:100vh;display:flex;background:#F5F3EE;color:#15201E}
.mp-side{flex:0 0 232px;background:#083B34;color:#CFE5DD;padding:18px 12px 14px;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;position:sticky;top:0;height:100vh;overflow-y:auto;scrollbar-width:none}
.mp-side::-webkit-scrollbar{display:none}
.mp-nav a{display:flex;align-items:center;gap:11px;padding:0 12px;min-height:44px;border-radius:12px;color:#CFE5DD;text-decoration:none;font-size:14.5px;transition:background .15s,color .15s}
.mp-nav a:hover{background:#0B4A40;color:#FFFFFF}
.mp-nav a[aria-current="page"]{background:var(--mp-action);color:var(--mp-action-texte);font-weight:600}
.mp-nav a[aria-current="page"] .mp-pastille{background:rgba(255,255,255,.28);color:#FFFFFF}
.mp-sep{height:1px;background:rgba(255,255,255,.12);margin:8px 12px}
.mp-devise{display:none;padding:0 12px;font-size:14px;line-height:1.7;color:#9FC9BE}
@media (min-height: 820px){.mp-devise{display:block}}
.mp-pastille{min-width:22px;height:22px;padding:0 6px;box-sizing:border-box;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:rgba(255,255,255,.1);color:#CFE5DD}
.mp-pastille.on{background:#2E8B6E;color:#FFFFFF}
.mp-nav a[aria-current="page"]{box-shadow:0 10px 20px -12px rgba(156,82,10,.8)}
.mp-main{flex:1 1 0;min-width:0;padding:16px 32px 48px;box-sizing:border-box}
.mp-dtop{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #E4E0D6}
.mp-dsearch{flex:1;max-width:520px;display:flex;align-items:center;gap:10px;min-height:44px;padding:0 16px;border-radius:999px;background:#FFFFFF;border:1px solid #E4E0D6;color:#5E6B67;font-family:inherit;font-size:14px;cursor:pointer;text-align:start}
.mp-dsearch:hover{border-color:#CFCAC0}
.mp-dsearch kbd{margin-inline-start:auto;font-family:'IBM Plex Sans',sans-serif;font-size:12px;color:#5E6B67;background:#F5F3EE;border:1px solid #E4E0D6;border-radius:6px;padding:1px 6px}
.mp-top,.mp-bnav{display:none}
@media (max-width: 900px){
  .mp-side,.mp-dtop{display:none}
  .mp-main{padding:12px 16px 96px}
  .mp-top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px;background:#F5F3EE;position:sticky;top:0;z-index:30;transition:transform .2s ease,box-shadow .2s ease}
  .mp-top.cache{transform:translateY(-100%)}
  .mp-top.ombre{box-shadow:0 1px 0 #E4E0D6}
  .mp-bnav{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:40;background:#FFFFFF;border-top:1px solid #E4E0D6;justify-content:space-around;padding:6px 4px calc(8px + env(safe-area-inset-bottom))}
  .mp-shell{flex-direction:column}
}
.mp-bnav a,.mp-bnav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:60px;min-height:48px;font-size:12px;color:#3B4A47;text-decoration:none;background:none;border:0;cursor:pointer;font-family:inherit}
.mp-bnav [aria-current="page"]{color:#0E5A4E;font-weight:600}
.mp-icon-btn{width:44px;height:44px;border-radius:50%;background:#FFFFFF;border:1px solid #E4E0D6;color:#15201E;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
`

export function AppShell({ children }: AppShellProps) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [recherche, setRecherche] = useState(false)
  const [enteteCache, setEnteteCache] = useState(false)
  const [defile, setDefile] = useState(false)
  const { aide, fermerAide } = useRaccourcis(!!user && user.role !== 'ADMIN')
  const { data: abo } = useApi<AbonnementCourant>(user && user.role !== 'ADMIN' ? '/abonnements/current' : null)
  const [aboMasque, setAboMasque] = useState(false)
  // Pastilles : délais critiques à agir, nombre de dossiers, alertes non lues.
  const { data: compteurs } = useApi<{ dossiers: number; critiques: number; nonLues: number; demandes?: number }>(user ? '/dashboard/compteurs' : null, [pathname])

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => { setMenuOpen(false); setRecherche(false) }, [pathname])
  useEffect(() => {
    let dernier = window.scrollY
    const defiler = () => {
      const y = window.scrollY
      setDefile(y > 4)
      if (Math.abs(y - dernier) > 8) { setEnteteCache(y > dernier && y > 80); dernier = y }
    }
    window.addEventListener('scroll', defiler, { passive: true })
    return () => window.removeEventListener('scroll', defiler)
  }, [])
  useEffect(() => { if (user?.doitChangerMdp) router.replace('/mot-de-passe-provisoire') }, [user, router])
  useEffect(() => {
    if (user?.role === 'ADMIN' && !PAGES_ADMIN.some((p) => pathname === p || pathname.startsWith(p + '/'))) router.replace('/admin')
  }, [user, pathname, router])


  // Ctrl/⌘ K ou « / » : recherche rapide depuis n'importe quelle page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const saisie = (e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable="true"]')
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !saisie)) { e.preventDefault(); setRecherche(true) }
    }
    const ouvrir = () => setRecherche(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('mp:recherche', ouvrir)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mp:recherche', ouvrir) }
  }, [])

  if (loading) {
    return <Splash />
  }
  if (!user) return null

  const initials = `${(user.prenom?.[0] ?? '')} ${(user.nom?.[0] ?? '')}`.trim() || 'م'
  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href + '/') && !(href === '/documents' && pathname.startsWith('/documents/mes')))
  const estAdmin = user.role === 'ADMIN'
  const nbCritiques = compteurs?.critiques ?? 0
  const nbNonLues = compteurs?.nonLues ?? 0

  const navLinks = (onClick?: () => void) => (estAdmin ? NAV_ADMIN : NAV).map((grp, gi) => (
    <div key={gi} role="group" aria-label={grp.section} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {gi > 0 && <span className="mp-sep" aria-hidden />}
      {grp.items.map(({ href, label, Icon, badge }) => (
        <Link key={href} href={href} onClick={onClick} aria-current={isActive(href) ? 'page' : undefined}>
          <Icon size={19} strokeWidth={1.8} aria-hidden />
          <span style={{ flex: 1 }}>{label}</span>
          {badge === 'deadlines' && nbCritiques > 0 && (
            <span className="num" aria-label={`${nbCritiques} آجال حرجة`} style={{ fontSize: 12, fontWeight: 700, background: '#C0392B', color: '#FFFFFF', borderRadius: 999, padding: '1px 8px' }}>{nbCritiques}</span>
          )}
          {badge === 'dossiers' && compteurs && <span className="num mp-pastille">{compteurs.dossiers}</span>}
          {badge === 'demandes' && !!compteurs?.demandes && <span className="num" aria-label={`${compteurs.demandes} طلبات جديدة`} style={{ fontSize: 12, fontWeight: 700, background: '#F2A93B', color: '#15201E', borderRadius: 999, padding: '1px 8px' }}>{compteurs.demandes}</span>}
          {badge === 'alertes' && nbNonLues > 0 && <span className="num mp-pastille on" aria-label={`${nbNonLues} غير مقروءة`}>{nbNonLues}</span>}
        </Link>
      ))}
    </div>
  ))

  const userBlock = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14 }}>
      <span aria-hidden style={{ width: 36, height: 36, borderRadius: '50%', background: '#E3F0EC', color: '#083B34', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flex: 'none' }}>{initials}</span>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0, flex: 1 }}>
        <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{estAdmin ? '' : 'ذ. '}{user.prenom} {user.nom}</span>
        <span style={{ fontSize: 12, color: '#9FC9BE', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.barreau || user.cabinet?.nom || user.email}</span>
      </div>
      <button onClick={logout} aria-label="خروج" title="خروج" style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #6E9C90', background: 'transparent', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}>
        <LogOut size={18} aria-hidden />
      </button>
    </div>
  )

  const brand = (dark: boolean) => (
    <Link href={user.role === 'ADMIN' ? '/admin' : '/dashboard'} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px', textDecoration: 'none' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dark ? '/brand/logo-symbol-white.svg' : '/brand/malafipro-symbol.svg'} alt="" width={34} height={34} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span dir="ltr" style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 18, fontWeight: 600, color: dark ? '#FFFFFF' : '#15201E' }}>Malafi<span style={{ fontWeight: 400 }}>Pro</span></span>
      </span>
    </Link>
  )

  return (
    <ToastProvider>
      <style>{CSS}</style>
      <div dir="rtl" className="mp-shell">
        <aside className="mp-side">
          {brand(true)}
          <nav className="mp-nav" aria-label="القائمة الرئيسية" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navLinks()}
          </nav>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="mp-devise" style={{ margin: 0 }}>تنظيم أفضل..<br />لخدمة أكثر فعالية</p>
            {userBlock}
          </div>
        </aside>

        <header className={`mp-top${enteteCache ? ' cache' : ''}${defile ? ' ombre' : ''}`}>
          {brand(false)}
          <div style={{ display: 'flex', gap: 8 }}>
            {!estAdmin && <button type="button" onClick={() => setRecherche(true)} className="mp-icon-btn" aria-label="بحث"><Search size={20} strokeWidth={1.8} aria-hidden /></button>}
            {!estAdmin && <Link href="/alertes" className="mp-icon-btn" aria-label={nbNonLues ? `التنبيهات، ${nbNonLues} غير مقروءة` : 'التنبيهات'} style={{ position: 'relative' }}>
              <Bell size={20} strokeWidth={1.8} aria-hidden />
              {nbNonLues > 0 && <span className="num" aria-hidden style={{ position: 'absolute', top: -2, left: -2, minWidth: 18, height: 18, borderRadius: 999, background: '#C0392B', color: '#FFFFFF', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid #F5F3EE' }}>{nbNonLues}</span>}
            </Link>}
          </div>
        </header>

        <main className="mp-main">
          <div className="mp-dtop">
            {estAdmin ? <span style={{ fontSize: 14, fontWeight: 600, color: '#0E5A4E', background: '#E3F0EC', borderRadius: 999, padding: '6px 14px' }}>فضاء الإدارة</span> : (
              <button type="button" className="mp-dsearch" onClick={() => setRecherche(true)} aria-label="بحث سريع (Ctrl K)">
                <Search size={18} strokeWidth={1.8} aria-hidden />ابحث عن ملف، طرف، محكمة…<kbd aria-hidden>Ctrl K</kbd>
              </button>
            )}
            {!estAdmin && <Link href="/alertes" className="mp-icon-btn" aria-label={nbNonLues ? `التنبيهات، ${nbNonLues} غير مقروءة` : 'التنبيهات'} style={{ position: 'relative', marginInlineStart: 'auto' }}>
              <Bell size={20} strokeWidth={1.8} aria-hidden />
              {nbNonLues > 0 && <span className="num" aria-hidden style={{ position: 'absolute', top: -2, left: -2, minWidth: 18, height: 18, borderRadius: 999, background: '#C0392B', color: '#FFFFFF', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid #F5F3EE' }}>{nbNonLues}</span>}
            </Link>}
          </div>
          {abo?.abonnement && ['A_RENOUVELER', 'GRACE', 'EXPIRE'].includes(abo.abonnement.etat) && !aboMasque && pathname !== '/abonnement' && (
            <div role="status" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
              <span style={{ flex: '1 1 220px', color: '#3B4A47' }}>
                {abo.abonnement.etat === 'A_RENOUVELER'
                  ? <>تنتهي فترة اشتراككم بعد <span className="num">{abo.abonnement.joursRestants}</span> أيام.</>
                  : 'انتهت فترة اشتراككم. التنبيهات مستمرة، تواصلوا معنا للتجديد.'}
              </span>
              <Link href="/abonnement" style={{ fontWeight: 600, color: '#0E5A4E', minHeight: 40, display: 'inline-flex', alignItems: 'center' }}>التجديد</Link>
              <button type="button" onClick={() => setAboMasque(true)} aria-label="إخفاء" className="mp-icon-btn" style={{ width: 40, height: 40 }}><X size={16} aria-hidden /></button>
            </div>
          )}
          {children}
        </main>
        <RechercheGlobale ouvert={recherche} onFermer={() => setRecherche(false)} />
        {aide && <AideRaccourcis onFermer={fermerAide} />}
        {!estAdmin && <InviteInstallation />}
        <Suspense fallback={null}><BarreProgression /></Suspense>

        <nav className="mp-bnav" aria-label="التنقل السفلي">
          {(estAdmin ? BOTTOM_ADMIN : BOTTOM).map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon size={22} strokeWidth={1.8} aria-hidden />
                {href === '/echeances' && nbCritiques > 0 && (
                  <span aria-hidden style={{ position: 'absolute', top: -2, left: -4, width: 10, height: 10, borderRadius: '50%', background: '#C0392B', border: '2px solid #FFFFFF' }} />
                )}
              </span>
              {label}
            </Link>
          ))}
          <button onClick={() => setMenuOpen(true)}><Menu size={22} strokeWidth={1.8} aria-hidden />المزيد</button>
        </nav>
      </div>

      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} role="dialog" aria-modal="true" aria-label="القائمة">
          <div onClick={() => setMenuOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(21,32,30,.45)' }} />
          <div dir="rtl" className="mp-side" style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: 280, maxWidth: '85vw', display: 'flex' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {brand(true)}
              <button onClick={() => setMenuOpen(false)} aria-label="إغلاق" style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #6E9C90', background: 'transparent', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={18} aria-hidden />
              </button>
            </div>
            <nav className="mp-nav" aria-label="القائمة الرئيسية" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {navLinks(() => setMenuOpen(false))}
            </nav>
            <div style={{ marginTop: 'auto' }}>{userBlock}</div>
          </div>
        </div>
      )}
    </ToastProvider>
  )
}
