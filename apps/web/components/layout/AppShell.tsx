'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { ToastProvider } from '@/components/Toast'
import Image from 'next/image'
import {
  Home, FolderOpen, Clock, Bell, Settings, Calendar, Menu, X,
} from 'lucide-react'

interface AppShellProps { children: React.ReactNode }

const C = {
  pageA: '#E7D9A6', pageB: '#EFE7D0', pageC: '#ECE2C2',
  panel: '#FBF9F2',
  ink: '#2C2A24', ink2: '#3A3322', muted: '#A39C8B', faint: '#BDB6A4',
  goldD: '#9A7820', goldChip: '#F4EFDF', goldTab: '#F0E7CC', border: '#EEE7D6',
}

const TABS = [
  { href: '/dashboard', label: 'الرئيسية' },
  { href: '/dossiers', label: 'الملفات' },
  { href: '/echeances', label: 'الآجال' },
  { href: '/alertes', label: 'التنبيهات' },
  { href: '/calendrier', label: 'الأجندة' },
]

const NAV = [
  { section: 'عام', items: [
    { href: '/dashboard', label: 'الصفحة الرئيسية', Icon: Home },
    { href: '/dossiers', label: 'الملفات', Icon: FolderOpen },
    { href: '/echeances', label: 'الآجال', Icon: Clock },
    { href: '/calendrier', label: 'الأجندة', Icon: Calendar },
  ] },
  { section: 'المتابعة والتقارير', items: [
    { href: '/alertes', label: 'التنبيهات', Icon: Bell },
  ] },
  { section: 'الدعم', items: [
    { href: '/parametres', label: 'الإعدادات', Icon: Settings },
  ] },
]

export function AppShell({ children }: AppShellProps) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1100px)')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  // Ferme le menu quand on change de page
  useEffect(() => { setMenuOpen(false) }, [pathname])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(155deg, ${C.pageA} 0%, ${C.pageB} 38%, ${C.pageC} 100%)` }}>
        <div style={{ color: C.goldD, fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>جارٍ التحميل...</div>
      </div>
    )
  }
  if (!user) return null

  const initials = `${(user.prenom?.[0] ?? '')}${(user.nom?.[0] ?? '')}`.trim() || 'أع'
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const pad = isMobile ? 14 : 34
  const innerPad = isMobile ? '16px 14px 20px' : '26px 30px 30px'

  return (
    <ToastProvider>
      <div
        dir="rtl"
        style={{
          minHeight: '100vh', width: '100%',
          background: `linear-gradient(155deg, ${C.pageA} 0%, ${C.pageB} 38%, ${C.pageC} 100%)`,
          padding: pad, display: 'flex', justifyContent: 'center',
          fontFamily: "'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif",
        }}
      >
        <div style={{ width: 1580, maxWidth: '100%', background: C.panel, borderRadius: isMobile ? 22 : 34, padding: innerPad, boxShadow: '0 30px 80px -30px rgba(120,95,30,.35), 0 2px 0 rgba(255,255,255,.6) inset' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBottom: isMobile ? 14 : 22 }}>
            {/* brand */}
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <Image src="/new_logo.png" alt="Mouraqib" width={isMobile ? 48 : 60} height={isMobile ? 48 : 60} style={{ borderRadius: 14 }} />
            </Link>

            {/* onglets horizontaux — masqués sur tablette/mobile */}
            {!isTablet && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {TABS.map((t) => (
                  <Link key={t.label} href={t.href} style={{ textDecoration: 'none' }}>
                    <div style={isActive(t.href)
                      ? { padding: '9px 18px', fontSize: 13.5, fontWeight: 600, color: C.ink2, background: C.goldTab, borderRadius: 12 }
                      : { padding: '9px 16px', fontSize: 13.5, color: C.muted, cursor: 'pointer' }}>
                      {t.label}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* user + burger */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14 }}>
              {!isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(140deg,#C7A94F,#9C7A22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 15, boxShadow: '0 4px 10px -3px rgba(150,115,20,.55)' }}>{initials}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{user.prenom} {user.nom}</div>
                    <div style={{ fontSize: 11.5, color: C.muted }}>{user.email}</div>
                  </div>
                </div>
              )}
              {!isMobile && <div style={{ width: 1, height: 30, background: '#ECE5D4' }} />}
              {!isMobile && (
                <button onClick={logout} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 11, padding: '9px 14px', fontSize: 13, fontWeight: 600, color: C.ink, cursor: 'pointer' }}>خروج</button>
              )}
              {/* burger sur tablette/mobile */}
              {isTablet && (
                <button onClick={() => setMenuOpen(true)} aria-label="القائمة" style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 11, padding: 9, cursor: 'pointer', display: 'flex' }}>
                  <Menu size={20} stroke={C.ink} />
                </button>
              )}
            </div>
          </div>

          {/* BODY */}
          <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
            {/* Sidebar fixe seulement sur desktop large */}
            {!isTablet && <SideNav pathname={pathname} />}
          </div>
        </div>
      </div>

      {/* Drawer mobile/tablette */}
      {isTablet && menuOpen && (
        <Drawer
          user={user}
          initials={initials}
          pathname={pathname}
          onClose={() => setMenuOpen(false)}
          onLogout={logout}
        />
      )}
    </ToastProvider>
  )
}

function SideNav({ pathname }: { pathname: string }) {
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  return (
    <div style={{ width: 208, flex: 'none', paddingTop: 4 }}>
      {NAV.map((grp) => (
        <div key={grp.section}>
          <div style={{ fontSize: 11, color: C.faint, margin: '18px 0 12px', paddingRight: 6 }}>{grp.section}</div>
          {grp.items.map(({ href, label, Icon }) => {
            const active = isActive(href)
            return (
              <Link key={label} href={href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '11px 14px', marginBottom: active ? 6 : 2, borderRadius: active ? 13 : 0, background: active ? C.goldChip : 'transparent', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? C.ink2 : '#7A7461' }}>{label}</span>
                  <Icon size={17} stroke={active ? C.goldD : C.faint} strokeWidth={2} />
                </div>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Drawer({ user, initials, pathname, onClose, onLogout }: { user: any; initials: string; pathname: string; onClose: () => void; onLogout: () => void }) {
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      {/* overlay */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(44,42,36,.45)' }} />
      {/* panneau à droite (RTL) */}
      <div dir="rtl" style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: 276, maxWidth: '85vw', background: C.panel, boxShadow: '-20px 0 60px -20px rgba(0,0,0,.4)', padding: 20, display: 'flex', flexDirection: 'column', fontFamily: "'IBM Plex Sans Arabic',sans-serif", overflowY: 'auto' }}>
        {/* header drawer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <button onClick={onClose} aria-label="إغلاق" style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 10, padding: 7, cursor: 'pointer', display: 'flex' }}>
            <X size={18} stroke={C.ink} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{user.prenom} {user.nom}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{user.email}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(140deg,#C7A94F,#9C7A22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 14 }}>{initials}</div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {NAV.map((grp) => (
            <div key={grp.section}>
              <div style={{ fontSize: 11, color: C.faint, margin: '16px 0 10px', paddingRight: 6 }}>{grp.section}</div>
              {grp.items.map(({ href, label, Icon }) => {
                const active = isActive(href)
                return (
                  <Link key={label} href={href} onClick={onClose} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '12px 14px', marginBottom: 2, borderRadius: active ? 13 : 0, background: active ? C.goldChip : 'transparent' }}>
                      <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? C.ink2 : '#7A7461' }}>{label}</span>
                      <Icon size={18} stroke={active ? C.goldD : C.faint} strokeWidth={2} />
                    </div>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        <button onClick={onLogout} style={{ marginTop: 16, border: `1px solid ${C.border}`, background: '#fff', borderRadius: 11, padding: 12, fontSize: 13.5, fontWeight: 600, color: C.ink, cursor: 'pointer', width: '100%' }}>خروج</button>
      </div>
    </div>
  )
}