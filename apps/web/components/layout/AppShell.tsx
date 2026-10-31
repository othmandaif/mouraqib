'use client'

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth, aDroit } from '@/hooks/useAuth'
import { useLangue } from '@/lib/langue'
import { RechercheGlobale } from '@/components/layout/RechercheGlobale'
import type { AbonnementCourant } from '@/lib/abonnement'
import { useApi } from '@/hooks/useApi'
import { ToastProvider } from '@/components/Toast'
import { Splash } from '@/components/ui/Chargement'
import { BarreProgression } from '@/components/layout/BarreProgression'
import { useRaccourcis, AideRaccourcis } from '@/components/layout/Raccourcis'
import { InviteInstallation } from '@/components/layout/InviteInstallation'
import {
  Home, FolderOpen, Clock, Bell, Calendar, Menu, X, Sparkles, FileText, Archive, SlidersHorizontal, LogOut, Search, Users, Inbox, Wallet, Activity, ShieldCheck,
  Contact, Receipt, Plus, ChevronRight, ChevronLeft,
} from 'lucide-react'

interface AppShellProps { children: React.ReactNode }

type NavItem = { href: string; label: string; Icon: typeof Home; badge?: 'deadlines' | 'dossiers' | 'alertes' | 'demandes'; droit?: string }
const NAV: { section?: string; items: NavItem[] }[] = [
  { items: [
    { href: '/dashboard', label: 'الرئيسية', Icon: Home },
    { href: '/dossiers', label: 'الملفات', Icon: FolderOpen, badge: 'dossiers' },
    { href: '/echeances', label: 'الآجال', Icon: Clock, badge: 'deadlines' },
    { href: '/calendrier', label: 'الأجندة', Icon: Calendar },
  ] },
  { section: 'الذكاء الاصطناعي', items: [
    { href: '/assistant', label: 'المساعد القانوني', Icon: Sparkles, droit: 'IA' },
    { href: '/documents', label: 'محرّر الوثائق', Icon: FileText, droit: 'IA' },
    { href: '/documents/mes', label: 'وثائقي', Icon: Archive, droit: 'IA' },
  ] },
  // CRM et facturation : visibles seulement avec le droit correspondant (Paramètres › الفريق)
  { section: 'المكتب', items: [
    { href: '/clients', label: 'الموكلون', Icon: Contact, droit: 'CRM' },
    { href: '/facturation', label: 'الفوترة', Icon: Receipt, droit: 'FACTURATION' },
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
  { href: '/assistant', label: 'المساعد', Icon: Sparkles, droit: 'IA' },
]

const CSS = `
.mp-shell{min-height:100vh;display:flex;background:#F5F3EE;color:#15201E}
/* Barre latérale : vert profond avec une lueur douce en haut ; repliable (icônes seules) */
.mp-side{flex:0 0 244px;width:244px;background:radial-gradient(130% 55% at 50% -12%,rgba(46,139,110,.38),transparent 62%),linear-gradient(180deg,#083B34 0%,#062E29 100%);color:#CFE5DD;padding:16px 12px 14px;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;position:sticky;top:0;height:100vh;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;transition:flex-basis .28s cubic-bezier(.2,.8,.2,1),width .28s cubic-bezier(.2,.8,.2,1)}
.mp-side::-webkit-scrollbar{display:none}
.mp-side.replie{flex-basis:76px;width:76px}
.mp-tete{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:44px}
.mp-replier{flex:none;width:32px;height:32px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#CFE5DD;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s,color .15s,transform .15s}
.mp-replier:hover{background:rgba(255,255,255,.12);color:#FFFFFF}
.mp-replier:active{transform:scale(.92)}
.mp-side.replie .mp-tete{flex-direction:column;gap:10px}
.mp-side.replie .mp-marque-txt,.mp-side.replie .mp-lib,.mp-side.replie .mp-sec,.mp-side.replie .mp-devise,.mp-side.replie .mp-qui,.mp-side.replie .mp-sortie{display:none}
.mp-nav{position:relative}
.mp-nav a{position:relative;z-index:1;display:flex;align-items:center;gap:11px;padding:0 12px;min-height:44px;border-radius:12px;color:#CFE5DD;text-decoration:none;font-size:14.5px;transition:background .18s,color .18s,transform .12s}
.mp-nav a svg{flex:none;transition:transform .22s cubic-bezier(.2,.8,.2,1)}
.mp-nav a:hover{background:rgba(255,255,255,.07);color:#FFFFFF}
.mp-nav a:hover svg{transform:scale(1.12)}
.mp-nav a:active{transform:scale(.98)}
.mp-nav a:focus-visible,.mp-replier:focus-visible,.mp-ajout:focus-visible{outline:2px solid #F2A93B;outline-offset:2px}
.mp-nav a[aria-current="page"]{background:var(--mp-action);color:var(--mp-action-texte);font-weight:600;box-shadow:0 10px 20px -12px rgba(156,82,10,.8)}
.mp-nav a[aria-current="page"] .mp-pastille{background:rgba(255,255,255,.28);color:#FFFFFF}
/* Indicateur orange qui glisse d'une rubrique à l'autre (barre fixe) ; le lien actif devient transparent dessus */
.mp-indic{position:absolute;z-index:0;top:0;inset-inline:0;border-radius:12px;background:var(--mp-action);box-shadow:0 10px 22px -12px rgba(156,82,10,.85);transition:transform .38s cubic-bezier(.2,.8,.2,1),height .2s ease;pointer-events:none}
.mp-nav.glisse a[aria-current="page"]{background:transparent;box-shadow:none}
.mp-nav.glisse a[aria-current="page"]:hover{background:transparent}
.mp-side.replie .mp-nav a{justify-content:center;padding:0}
.mp-sec{display:block;padding:12px 12px 4px;font-size:11.5px;font-weight:600;letter-spacing:.03em;color:#7FAFA3}
.mp-sep{height:1px;background:rgba(255,255,255,.12);margin:8px 12px}
.mp-sep.repli{display:none}
.mp-side.replie .mp-sep.repli{display:block}
.mp-devise{display:none;padding:0 12px;font-size:13.5px;line-height:1.7;color:#9FC9BE}
@media (min-height: 860px){.mp-devise{display:block}}
.mp-pastille{min-width:22px;height:22px;padding:0 6px;box-sizing:border-box;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:rgba(255,255,255,.1);color:#CFE5DD;transition:transform .2s}
.mp-pastille.on{background:#2E8B6E;color:#FFFFFF}
.mp-pastille.rouge{background:#C0392B;color:#FFFFFF}
.mp-pastille.ambre{background:#F2A93B;color:#15201E}
/* Barre repliée : la pastille devient un point sur l'icône */
.mp-side.replie .mp-pastille{position:absolute;top:6px;inset-inline-end:12px;min-width:10px;width:10px;height:10px;padding:0;font-size:0;border:2px solid #083B34}
/* Délai critique : trois ondes discrètes pour attirer l'œil, puis plus rien */
.mp-onde{animation:mp-onde 1.8s ease-out 3}
@keyframes mp-onde{0%{box-shadow:0 0 0 0 rgba(192,57,43,.65)}100%{box-shadow:0 0 0 9px rgba(192,57,43,0)}}
/* Entrée : les rubriques apparaissent l'une après l'autre (une fois, à l'ouverture de l'app) */
.mp-entree{animation:mp-entree .42s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i,0) * 35ms)}
@keyframes mp-entree{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.mp-ajout{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border-radius:12px;border:1.5px dashed #6E9C90;background:rgba(255,255,255,.04);color:#FFFFFF;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;transition:background .18s,border-color .18s,transform .12s}
.mp-ajout:hover{background:rgba(255,255,255,.1);border-color:#9FC9BE}
.mp-ajout:active{transform:scale(.98)}
.mp-ajout svg{transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.mp-ajout:hover svg{transform:rotate(90deg)}
.mp-moi{display:flex;align-items:center;gap:10px;padding:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;transition:background .18s}
.mp-moi:hover{background:rgba(255,255,255,.09)}
.mp-side.replie .mp-moi{flex-direction:column;padding:6px;background:transparent;border-color:transparent}
.mp-avatar{position:relative;flex:none;text-decoration:none}
.mp-avatar::after{content:'';position:absolute;bottom:0;inset-inline-end:0;width:9px;height:9px;border-radius:50%;background:#2E8B6E;border:2px solid #083B34}
/* Tiroir mobile : glisse depuis le bord, fond qui s'assombrit */
.mp-tiroir{--depart:100%;animation:mp-tiroir .28s cubic-bezier(.2,.8,.2,1)}
html[dir=ltr] .mp-tiroir{--depart:-100%}
@keyframes mp-tiroir{from{transform:translateX(var(--depart))}to{transform:none}}
.mp-voile{animation:mp-voile .25s ease both}
@keyframes mp-voile{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion: reduce){.mp-side,.mp-indic,.mp-nav a,.mp-nav a svg,.mp-ajout svg{transition:none}.mp-entree,.mp-onde,.mp-tiroir,.mp-voile{animation:none}}
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
  const { t, tx } = useLangue()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [recherche, setRecherche] = useState(false)
  const [enteteCache, setEnteteCache] = useState(false)
  const [defile, setDefile] = useState(false)
  const { aide, fermerAide } = useRaccourcis(!!user && user.role !== 'ADMIN')
  const { data: abo } = useApi<AbonnementCourant>(user && user.role !== 'ADMIN' ? '/abonnements/current' : null)
  const [aboMasque, setAboMasque] = useState(false)
  // Barre latérale repliée (icônes seules) : préférence gardée sur cet appareil
  const [replie, setReplie] = useState(() => { try { return localStorage.getItem('malafipro_menu_replie') === '1' } catch { return false } })
  const basculerReplie = () => setReplie((r) => { try { localStorage.setItem('malafipro_menu_replie', r ? '0' : '1') } catch {} return !r })
  // Indicateur orange qui glisse vers la rubrique active
  const navRef = useRef<HTMLElement>(null)
  const [indic, setIndic] = useState<{ y: number; h: number } | null>(null)
  // Pastilles : délais critiques à agir, nombre de dossiers, alertes non lues.
  const { data: compteurs, refetch: recompter } = useApi<{ dossiers: number; critiques: number; nonLues: number; demandes?: number }>(user ? '/dashboard/compteurs' : null, [pathname])
  // Alerte lue sur la page des alertes : la pastille du menu suit sans attendre un changement de page
  useEffect(() => {
    const maj = () => { recompter() }
    window.addEventListener('mp:alertes-lues', maj)
    return () => window.removeEventListener('mp:alertes-lues', maj)
  }, [recompter])

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => { setMenuOpen(false); setRecherche(false) }, [pathname])
  useEffect(() => {
    if (!menuOpen) return
    const fermer = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', fermer)
    return () => window.removeEventListener('keydown', fermer)
  }, [menuOpen])
  useLayoutEffect(() => {
    const mesurer = () => {
      const a = navRef.current?.querySelector<HTMLElement>('a[aria-current="page"]')
      setIndic(a ? { y: a.offsetTop, h: a.offsetHeight } : null)
    }
    mesurer()
    window.addEventListener('resize', mesurer)
    return () => window.removeEventListener('resize', mesurer)
  }, [pathname, replie, compteurs, loading, user])
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

  // Rubriques dont le responsable du cabinet a retiré le droit : masquées (l'API refuse de toute façon)
  const navLinks = (onClick?: () => void, compact = false) => {
    let n = 0 // rang de la rubrique : délai d'apparition en cascade
    return (estAdmin ? NAV_ADMIN : NAV).map((g) => ({ ...g, items: g.items.filter((i) => !i.droit || aDroit(user, i.droit)) })).filter((g) => g.items.length).map((grp, gi) => (
      <div key={gi} role="group" aria-label={grp.section && t(grp.section)} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {grp.section ? <span className="mp-sec mp-entree" style={{ '--i': n } as React.CSSProperties} aria-hidden>{t(grp.section)}</span> : gi > 0 && <span className="mp-sep" aria-hidden />}
        {gi > 0 && grp.section && <span className="mp-sep repli" aria-hidden />}
        {grp.items.map(({ href, label, Icon, badge }) => {
          const nom = t(label)
          const actif = isActive(href)
          return (
            <Link key={href} href={href} onClick={onClick} aria-current={actif ? 'page' : undefined} className="mp-entree" style={{ '--i': n++ } as React.CSSProperties}
              {...(compact ? { 'aria-label': nom, title: nom } : {})}>
              <Icon size={19} strokeWidth={actif ? 2.2 : 1.8} aria-hidden />
              <span className="mp-lib" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nom}</span>
              {badge === 'deadlines' && nbCritiques > 0 && (
                <span className="num mp-pastille rouge mp-onde" aria-label={t('{n} آجال حرجة', { n: nbCritiques })}>{nbCritiques}</span>
              )}
              {badge === 'dossiers' && compteurs && !compact && <span className="num mp-pastille">{compteurs.dossiers}</span>}
              {badge === 'demandes' && !!compteurs?.demandes && <span className="num mp-pastille ambre" aria-label={t('{n} طلبات جديدة', { n: compteurs.demandes })}>{compteurs.demandes}</span>}
              {badge === 'alertes' && nbNonLues > 0 && <span className="num mp-pastille on" aria-label={t('{n} غير مقروءة', { n: nbNonLues })}>{nbNonLues}</span>}
            </Link>
          )
        })}
      </div>
    ))
  }

  // Raccourci « ملف جديد » : ouvre l'ajout sur la page des dossiers (même si on y est déjà)
  const ajouterDossier = (onClick?: () => void) => (
    <Link href="/dossiers?ajouter=1" className="mp-ajout" onClick={() => { onClick?.(); window.dispatchEvent(new Event('mp:ajout-dossier')) }}
      {...(replie && !onClick ? { 'aria-label': t('ملف جديد'), title: t('ملف جديد') } : {})}>
      <Plus size={18} strokeWidth={2.2} aria-hidden /><span className="mp-lib">{t('ملف جديد')}</span>
    </Link>
  )

  const userBlock = (
    <div className="mp-moi">
      <Link href={estAdmin ? '/admin' : '/parametres'} className="mp-avatar" aria-label={t('الإعدادات')} title={`${user.prenom} ${user.nom}`}>
      {user.avatar
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={user.avatar} alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flex: 'none' }} />
        : <span aria-hidden style={{ width: 36, height: 36, borderRadius: '50%', background: '#E3F0EC', color: '#083B34', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flex: 'none' }}>{initials}</span>}
      </Link>
      <div className="mp-qui" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0, flex: 1 }}>
        <span style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{estAdmin ? '' : t('ذ. ')}{user.prenom} {user.nom}</span>
        <span style={{ fontSize: 12, color: '#9FC9BE', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.barreau || user.cabinet?.nom || user.email}</span>
      </div>
      <button onClick={logout} className="mp-sortie" aria-label={t('خروج')} title={t('خروج')} style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #6E9C90', background: 'transparent', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}>
        <LogOut size={18} aria-hidden />
      </button>
    </div>
  )

  const brand = (dark: boolean) => (
    <Link href={user.role === 'ADMIN' ? '/admin' : '/dashboard'} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px', textDecoration: 'none' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dark ? '/brand/logo-symbol-white.svg' : '/brand/malafipro-symbol.svg'} alt="" width={34} height={34} />
      <span className="mp-marque-txt" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span dir="ltr" style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 18, fontWeight: 600, color: dark ? '#FFFFFF' : '#15201E' }}>Malafi<span style={{ fontWeight: 400 }}>Pro</span></span>
      </span>
    </Link>
  )

  return (
    <ToastProvider>
      <style>{CSS}</style>
      <div className="mp-shell">
        <aside className={`mp-side${replie ? ' replie' : ''}`}>
          <div className="mp-tete">
            {brand(true)}
            <button type="button" className="mp-replier" onClick={basculerReplie} aria-expanded={!replie}
              aria-label={replie ? t('توسيع القائمة') : t('طي القائمة')} title={replie ? t('توسيع القائمة') : t('طي القائمة')}>
              {replie ? <ChevronLeft size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
            </button>
          </div>
          {!estAdmin && ajouterDossier()}
          <nav ref={navRef} className={`mp-nav${indic ? ' glisse' : ''}`} aria-label={t('القائمة الرئيسية')} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {indic && <span className="mp-indic" aria-hidden style={{ transform: `translateY(${indic.y}px)`, height: indic.h }} />}
            {navLinks(undefined, replie)}
          </nav>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="mp-devise" style={{ margin: 0 }}>{t('تنظيم أفضل..')}<br />{t('لخدمة أكثر فعالية')}</p>
            {userBlock}
          </div>
        </aside>

        <header className={`mp-top${enteteCache ? ' cache' : ''}${defile ? ' ombre' : ''}`}>
          {brand(false)}
          <div style={{ display: 'flex', gap: 8 }}>
            {!estAdmin && <button type="button" onClick={() => setRecherche(true)} className="mp-icon-btn" aria-label={t('بحث')}><Search size={20} strokeWidth={1.8} aria-hidden /></button>}
            {!estAdmin && <Link href="/alertes" className="mp-icon-btn" aria-label={nbNonLues ? t('التنبيهات، {n} غير مقروءة', { n: nbNonLues }) : t('التنبيهات')} style={{ position: 'relative' }}>
              <Bell size={20} strokeWidth={1.8} aria-hidden />
              {nbNonLues > 0 && <span className="num" aria-hidden style={{ position: 'absolute', top: -2, insetInlineEnd: -2, minWidth: 18, height: 18, borderRadius: 999, background: '#C0392B', color: '#FFFFFF', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid #F5F3EE' }}>{nbNonLues}</span>}
            </Link>}
          </div>
        </header>

        <main className="mp-main">
          <div className="mp-dtop">
            {estAdmin ? <span style={{ fontSize: 14, fontWeight: 600, color: '#0E5A4E', background: '#E3F0EC', borderRadius: 999, padding: '6px 14px' }}>{t('فضاء الإدارة')}</span> : (
              <button type="button" className="mp-dsearch" onClick={() => setRecherche(true)} aria-label={t('بحث سريع (Ctrl K)')}>
                <Search size={18} strokeWidth={1.8} aria-hidden />{t('ابحث عن ملف، طرف، محكمة…')}<kbd aria-hidden>Ctrl K</kbd>
              </button>
            )}
            {!estAdmin && <Link href="/alertes" className="mp-icon-btn" aria-label={nbNonLues ? t('التنبيهات، {n} غير مقروءة', { n: nbNonLues }) : t('التنبيهات')} style={{ position: 'relative', marginInlineStart: 'auto' }}>
              <Bell size={20} strokeWidth={1.8} aria-hidden />
              {nbNonLues > 0 && <span className="num" aria-hidden style={{ position: 'absolute', top: -2, insetInlineEnd: -2, minWidth: 18, height: 18, borderRadius: 999, background: '#C0392B', color: '#FFFFFF', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid #F5F3EE' }}>{nbNonLues}</span>}
            </Link>}
          </div>
          {abo?.abonnement && ['A_RENOUVELER', 'GRACE', 'EXPIRE'].includes(abo.abonnement.etat) && !aboMasque && pathname !== '/abonnement' && (
            <div role="status" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, background: '#FFFFFF', border: '1px solid #E4E0D6', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
              <span style={{ flex: '1 1 220px', color: '#3B4A47' }}>
                {abo.abonnement.etat === 'A_RENOUVELER'
                  ? tx('تنتهي فترة اشتراككم بعد {n} أيام.', { n: <span className="num">{abo.abonnement.joursRestants}</span> })
                  : t('انتهت فترة اشتراككم. التنبيهات مستمرة، تواصلوا معنا للتجديد.')}
              </span>
              <Link href="/abonnement" style={{ fontWeight: 600, color: '#0E5A4E', minHeight: 40, display: 'inline-flex', alignItems: 'center' }}>{t('التجديد')}</Link>
              <button type="button" onClick={() => setAboMasque(true)} aria-label={t('إخفاء')} className="mp-icon-btn" style={{ width: 40, height: 40 }}><X size={16} aria-hidden /></button>
            </div>
          )}
          {children}
        </main>
        <RechercheGlobale ouvert={recherche} onFermer={() => setRecherche(false)} />
        {aide && <AideRaccourcis onFermer={fermerAide} />}
        {!estAdmin && <InviteInstallation />}
        <Suspense fallback={null}><BarreProgression /></Suspense>

        <nav className="mp-bnav" aria-label={t('التنقل السفلي')}>
          {(estAdmin ? BOTTOM_ADMIN : BOTTOM.filter((i) => !i.droit || aDroit(user, i.droit))).map(({ href, label, Icon }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon size={22} strokeWidth={1.8} aria-hidden />
                {href === '/echeances' && nbCritiques > 0 && (
                  <span aria-hidden style={{ position: 'absolute', top: -2, insetInlineEnd: -4, width: 10, height: 10, borderRadius: '50%', background: '#C0392B', border: '2px solid #FFFFFF' }} />
                )}
              </span>
              {t(label)}
            </Link>
          ))}
          <button onClick={() => setMenuOpen(true)}><Menu size={22} strokeWidth={1.8} aria-hidden />{t('المزيد')}</button>
        </nav>
      </div>

      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} role="dialog" aria-modal="true" aria-label={t('القائمة')}>
          <div className="mp-voile" onClick={() => setMenuOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(21,32,30,.45)' }} />
          <div className="mp-side mp-tiroir" style={{ position: 'absolute', top: 0, insetInlineStart: 0, height: '100%', width: 280, maxWidth: '85vw', display: 'flex' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {brand(true)}
              <button onClick={() => setMenuOpen(false)} aria-label={t('إغلاق')} style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #6E9C90', background: 'transparent', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={18} aria-hidden />
              </button>
            </div>
            {!estAdmin && ajouterDossier(() => setMenuOpen(false))}
            <nav className="mp-nav" aria-label={t('القائمة الرئيسية')} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {navLinks(() => setMenuOpen(false))}
            </nav>
            <div style={{ marginTop: 'auto' }}>{userBlock}</div>
          </div>
        </div>
      )}
    </ToastProvider>
  )
}