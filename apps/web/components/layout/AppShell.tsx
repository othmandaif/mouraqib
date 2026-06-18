'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/Toast'
import { Sidebar } from './Sidebar'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageTransition } from './PageTransition'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="w-80 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <ToastProvider>
      <div className="min-h-screen flex bg-page">
        <Sidebar user={user} onLogout={logout} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-8">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
