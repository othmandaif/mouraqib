'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  LayoutDashboard,
  FolderOpen,
  Bell,
  Calendar,
  CalendarDays,
  Settings,
  LogOut,
  AlertTriangle,
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
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/dossiers', label: 'ملفاتي', icon: FolderOpen },
  { href: '/calendrier', label: 'الأجندة', icon: CalendarDays },
  { href: '/echeances', label: 'الآجال', icon: Calendar },
  { href: '/alertes', label: 'التنبيهات', icon: Bell },
  { href: '/parametres', label: 'الإعدادات', icon: Settings },
]

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname()

  return (
    // En RTL, la sidebar est à droite : la bordure passe à gauche (border-l)
    <aside className="w-60 bg-surface-alt border-l border-border flex flex-col shrink-0">
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Mouraqib" width={50} height={50} />
          <div>
            <h1 className="text-2xl font-bold text-primary leading-none">مراقب</h1>
            <p className="text-xs text-text-muted leading-none mt-0.5">Mouraqib</p>
          </div>
        </Link>
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
                  flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                  transition-colors duration-150 relative
                  ${active
                    ? 'bg-white text-primary shadow-sm border-r-2 border-accent'
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
          <div className="text-sm font-medium text-text-primary leading-tight">
            الأستاذ(ة) {user.nom}
          </div>
          <div className="text-xs text-text-muted mt-0.5" dir="ltr">{user.email}</div>
        </div>

        {!user.whatsappVerifie && (
          <Link
            href="/parametres/whatsapp"
            className="flex items-center gap-2 px-3 py-2 text-xs text-warning bg-warning-bg rounded-md hover:bg-warning-bg/80 transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            تأكيد رقم واتساب
          </Link>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-text-muted hover:text-text-primary rounded-md hover:bg-white/60 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}