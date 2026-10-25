import type { Metadata } from 'next'

// Formulaire de demande d'accès : page publique indexée
export const metadata: Metadata = {
  title: 'طلب التسجيل',
  description: 'اطلبوا حسابكم على ملفاتي: نتصل بكم خلال يوم عمل لتقديم الخدمة وتفعيل متابعة ملفاتكم وآجالكم على محاكم.',
  alternates: { canonical: '/register' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
