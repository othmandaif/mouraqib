'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  FolderOpen,
  Bell,
  Calendar,
  Settings,
  LogOut,
  AlertTriangle,
  Scale,
} from 'lucide-react'

interface User {
  id: string
  email: string
  nom: string
  prenom: string
  whatsappVerifie: boolean
  role: string
}

interface SidebarProps {
  user: User
  onLogout: () => void
}

const NAV = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dossiers', label: 'Mes dossiers', icon: FolderOpen },
  { href: '/echeances', label: 'Échéances', icon: Calendar },
  { href: '/alertes', label: 'Alertes', icon: Bell },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
]

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-surface-alt border-r border-border flex flex-col shrink-0">
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-primary leading-none">
            Mouraqib
          </h1>
        </Link>
        <p className="font-arabic text-xs text-text-muted mt-1">مراقب</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium font-sans
                  transition-colors duration-150 relative
                  ${active
                    ? 'bg-white text-primary shadow-sm border-l-2 border-accent'
                    : 'text-text-secondary hover:bg-white/60 hover:text-text-primary'
                  }
                `}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <div className="px-3 py-2">
          <div className="text-sm font-medium font-sans text-text-primary leading-tight">
            Maître {user.nom}
          </div>
          <div className="text-xs text-text-muted font-sans mt-0.5">{user.email}</div>
        </div>

        {!user.whatsappVerifie && (
          <Link
            href="/parametres/whatsapp"
            className="flex items-center gap-2 px-3 py-2 text-xs font-sans text-warning bg-warning-bg rounded-sm hover:bg-warning-bg/80 transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Vérifier WhatsApp
          </Link>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-sans text-text-muted hover:text-text-primary rounded-sm hover:bg-white/60 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
