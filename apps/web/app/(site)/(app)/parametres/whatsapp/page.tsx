'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { VerifWhatsApp } from '@/components/legal/VerifWhatsApp'
import { t as tr } from '@/lib/langue'

export default function WhatsAppVerificationPage() {
  const { user, loading, refresh } = useAuth()
  if (loading) return null
  return (
    <div style={{ maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Link href="/parametres#notif" style={{ alignSelf: 'flex-start', fontSize: 14, fontWeight: 600, minHeight: 44, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>{tr('→ الإعدادات')}</Link>
      <VerifWhatsApp
        numeroInitial={user?.whatsappNumero ?? user?.telephone ?? ''}
        dejaVerifie={!!user?.whatsappVerifie}
        onTermine={() => { refresh().catch(() => {}) }}
        apresTexte={<Link href="/parametres#notif" style={{ fontWeight: 600, minHeight: 44, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>{tr('ضبط التنبيهات')}</Link>}
      />
    </div>
  )
}
