'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/Toast'

const NAV = [
  { href: '/dashboard', label: 'Tableau de bord', icon: '📊' },
  { href: '/dossiers', label: 'Mes dossiers', icon: '📁' },
  { href: '/echeances', label: 'Échéances', icon: '⏰' },
  { href: '/alertes', label: 'Alertes', icon: '🔔' },
  { href: '/parametres', label: 'Paramètres', icon: '⚙️' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Chargement...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <ToastProvider>
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">⚖️ Mouraqib</h1>
          <p className="text-xs text-slate-500 mt-1">مراقب</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="text-sm text-slate-700 font-medium mb-1">
            Maître {user.nom}
          </div>
          <div className="text-xs text-slate-400 mb-3">{user.email}</div>
          {!user.whatsappVerifie && (
            <Link href="/parametres/whatsapp"
              className="block text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg mb-2 hover:bg-orange-100">
              ⚠️ Vérifier WhatsApp
            </Link>
          )}
          <button onClick={logout}
            className="w-full text-left text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
    </ToastProvider>
  )
}
