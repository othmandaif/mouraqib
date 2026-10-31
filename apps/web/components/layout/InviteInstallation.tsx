'use client'

// « ثبّتوا ملفاتي على هاتفكم » : proposé UNE seule fois, sur le tableau de bord (Android/Chrome, quand le navigateur le permet).
import { t } from '@/lib/langue'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Download, X } from 'lucide-react'

type Invite = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const CLE = 'malafipro:installation-proposee'
const ANCIENNE_CLE = 'malafipro:installation-refusee'
const dejaProposee = () => { try { return !!(localStorage.getItem(CLE) || localStorage.getItem(ANCIENNE_CLE)) } catch { return true } }
const noterProposee = () => { try { localStorage.setItem(CLE, '1') } catch {} }

export function InviteInstallation() {
  const pathname = usePathname()
  const [invite, setInvite] = useState<Invite | null>(null)
  const surDashboard = pathname === '/dashboard'
  useEffect(() => {
    // Le navigateur l'annonce une fois par chargement, sur n'importe quelle page : on le garde,
    // et l'invitation ne s'affiche qu'en arrivant sur le tableau de bord.
    if (dejaProposee() || window.matchMedia('(display-mode: standalone)').matches) return
    const h = (e: Event) => { e.preventDefault(); setInvite(e as Invite) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  // Affichée = proposée : elle ne reviendra pas, même si l'avocat l'ignore sans la fermer.
  useEffect(() => { if (invite && surDashboard) noterProposee() }, [invite, surDashboard])
  if (!invite || !surDashboard) return null
  const fermer = () => { noterProposee(); setInvite(null) }
  return (
    <div role="region" aria-label={t('تثبيت التطبيق')} style={{ position: 'fixed', insetInline: 16, bottom: 'calc(84px + env(safe-area-inset-bottom))', zIndex: 55, maxWidth: 440, marginInline: 'auto', background: '#083B34', color: '#E3F0EC', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 20px 40px -20px rgba(0,0,0,.6)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={40} height={40} style={{ borderRadius: 10, flex: 'none' }} />
      <span style={{ flex: 1, fontSize: 14, lineHeight: 1.6 }}><strong style={{ color: '#FFFFFF', fontWeight: 600 }}>{t('ثبّتوا ملفاتي')}</strong><br />{t('على الشاشة الرئيسية، ويفتح كتطبيق.')}</span>
      <button type="button" onClick={async () => { await invite.prompt(); await invite.userChoice.catch(() => null); setInvite(null) }}
        style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: '#FFFFFF', color: '#083B34', border: 0, borderRadius: 999, padding: '0 14px', minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <Download size={16} aria-hidden />{t('تثبيت')}
      </button>
      <button type="button" onClick={fermer} aria-label={t('ليس الآن')} style={{ width: 40, height: 40, borderRadius: '50%', border: 0, background: 'transparent', color: '#9FC9BE', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} aria-hidden /></button>
    </div>
  )
}
