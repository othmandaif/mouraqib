import type { Metadata } from 'next'

// Page de connexion : utile aux avocats, sans intérêt dans les résultats de recherche
export const metadata: Metadata = { title: 'الدخول', robots: { index: false, follow: true } }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
