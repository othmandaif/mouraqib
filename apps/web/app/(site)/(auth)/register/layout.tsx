import type { Metadata } from 'next'

// Formulaire de demande d'accès : page publique mais sans intérêt dans les résultats de recherche
// (contenu mince) → noindex, follow ; absente du sitemap, non bloquée dans robots.txt pour que le noindex soit lu.
export const metadata: Metadata = {
  title: 'طلب التسجيل',
  description: 'اطلبوا حسابكم على ملفاتي: نتصل بكم خلال يوم عمل لتقديم الخدمة وتفعيل متابعة ملفاتكم وآجالكم على محاكم.',
  alternates: { canonical: '/register' },
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
