import type { Metadata } from 'next'
import { AppShell } from '@/components/layout/AppShell'

// Espace connecté : jamais indexé (données des avocats)
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
