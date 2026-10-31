'use client'

// Raccourcis clavier (ordinateur) : N nouveau dossier, G puis une lettre pour aller à une page, ? pour l'aide.
import { t } from '@/lib/langue'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

const ALLER: Record<string, { href: string; label: string }> = {
  d: { href: '/dashboard', label: 'الرئيسية' },
  m: { href: '/dossiers', label: 'الملفات' },
  a: { href: '/echeances', label: 'الآجال' },
  c: { href: '/calendrier', label: 'الأجندة' },
  s: { href: '/assistant', label: 'المساعد القانوني' },
  t: { href: '/alertes', label: 'التنبيهات' },
}

const enSaisie = (el: EventTarget | null) => !!(el as HTMLElement)?.closest?.('input, textarea, select, [contenteditable="true"]')

export function useRaccourcis(actif: boolean) {
  const router = useRouter()
  const [aide, setAide] = useState(false)
  const attenteG = useRef(0)
  useEffect(() => {
    if (!actif) return
    const touche = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || enSaisie(e.target) || document.querySelector('[role="dialog"]')) {
        if (e.key === 'Escape') setAide(false)
        return
      }
      const k = e.key.toLowerCase()
      if (Date.now() - attenteG.current < 1200 && ALLER[k]) { e.preventDefault(); attenteG.current = 0; router.push(ALLER[k].href); return }
      if (k === 'g') { attenteG.current = Date.now(); return }
      if (k === 'n') { e.preventDefault(); router.push('/dossiers?ajouter=1'); return }
      if (e.key === '?') { e.preventDefault(); setAide(true) }
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [actif, router])
  return { aide, fermerAide: () => setAide(false), ouvrirAide: () => setAide(true) }
}

const Touche = ({ children }: { children: React.ReactNode }) => (
  <kbd dir="ltr" style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, fontWeight: 600, minWidth: 26, height: 26, padding: '0 6px', borderRadius: 6, border: '1px solid #CFCAC0', borderBottomWidth: 2, background: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>{children}</kbd>
)

export function AideRaccourcis({ onFermer }: { onFermer: () => void }) {
  const lignes: [React.ReactNode, string][] = [
    [<><Touche>Ctrl</Touche> <Touche>K</Touche> {t('أو')} <Touche>/</Touche></>, t('بحث سريع')],
    [<Touche key="n">N</Touche>, t('إضافة ملف')],
    ...Object.entries(ALLER).map(([k, v]) => [<><Touche>G</Touche> {t('ثم')} <Touche>{k.toUpperCase()}</Touche></>, t(v.label)] as [React.ReactNode, string]),
    [<Touche key="q">?</Touche>, t('هذه المساعدة')],
  ]
  return (
    <div role="dialog" aria-modal="true" aria-label={t('اختصارات لوحة المفاتيح')} onKeyDown={(e) => { if (e.key === 'Escape') onFermer() }}
      style={{ position: 'fixed', inset: 0, zIndex: 85, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '12vh 16px 16px' }}>
      <div onClick={onFermer} style={{ position: 'absolute', inset: 0, background: 'rgba(21,32,30,.45)' }} />
      <div style={{ position: 'relative', width: 'min(460px, 100%)', background: '#FFFFFF', borderRadius: 16, padding: 22, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 30px 60px -20px rgba(8,59,52,.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>{t('اختصارات لوحة المفاتيح')}</h2>
          <button type="button" autoFocus onClick={onFermer} aria-label={t('إغلاق')} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #E4E0D6', background: '#FFFFFF', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} aria-hidden /></button>
        </div>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px 16px', alignItems: 'center', fontSize: 15 }}>
          {lignes.map(([t, l], i) => <div key={i} style={{ display: 'contents' }}><dt>{l}</dt><dd style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5E6B67' }}>{t}</dd></div>)}
        </dl>
      </div>
    </div>
  )
}
