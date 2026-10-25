'use client'

import { useEffect, useRef, useState } from 'react'
import { WifiOff, ServerCrash, Wifi } from 'lucide-react'

type Etat = 'hors-ligne' | 'serveur' | 'retour' | null

/**
 * Bandeau de connexion, sur toutes les pages :
 * - « لا اتصال بالإنترنت » quand l'appareil perd le réseau ;
 * - « الخادم لا يستجيب » quand l'API ne répond pas (réseau présent) ;
 * - « عاد الاتصال » 3 s, puis toutes les lectures de la page se relancent (événement mp:reessayer).
 * Les données déjà chargées restent affichées pendant la coupure.
 */
export function EtatConnexion() {
  const [etat, setEtat] = useState<Etat>(null)
  const etatRef = useRef<Etat>(null)
  const retour = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [bloque, setBloque] = useState(false)

  useEffect(() => {
    const changer = (e: Etat) => { etatRef.current = e; setEtat(e) }
    const reessayer = () => window.dispatchEvent(new Event('mp:reessayer'))
    const revenu = () => {
      if (etatRef.current !== 'hors-ligne' && etatRef.current !== 'serveur') return
      changer('retour')
      clearTimeout(retour.current)
      retour.current = setTimeout(() => changer(null), 3000)
    }
    const horsLigne = () => { clearTimeout(retour.current); changer('hors-ligne') }
    const enLigne = () => { revenu(); reessayer() }
    const erreur = () => { if (etatRef.current !== 'hors-ligne') { clearTimeout(retour.current); changer(navigator.onLine ? 'serveur' : 'hors-ligne') } }

    // Hors ligne, un clic sur un lien interne mènerait à la page d'erreur du navigateur (l'app serait perdue) :
    // on reste sur la page et on le signale. Phase de capture sur window = avant Next (Link) et BarreProgression.
    let tBloque: ReturnType<typeof setTimeout> | undefined
    const clic = (ev: MouseEvent) => {
      if (navigator.onLine || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey) return
      const a = (ev.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.origin !== window.location.origin || a.hasAttribute('download')) return
      if (a.pathname === window.location.pathname && a.search === window.location.search) return
      ev.preventDefault(); ev.stopPropagation()
      changer('hors-ligne'); setBloque(true)
      clearTimeout(tBloque); tBloque = setTimeout(() => setBloque(false), 3000)
    }
    window.addEventListener('click', clic, true)

    if (!navigator.onLine) changer('hors-ligne')
    window.addEventListener('offline', horsLigne)
    window.addEventListener('online', enLigne)
    window.addEventListener('mp:api-erreur', erreur)
    window.addEventListener('mp:api-ok', revenu)
    return () => {
      clearTimeout(retour.current); clearTimeout(tBloque)
      window.removeEventListener('click', clic, true)
      window.removeEventListener('offline', horsLigne)
      window.removeEventListener('online', enLigne)
      window.removeEventListener('mp:api-erreur', erreur)
      window.removeEventListener('mp:api-ok', revenu)
    }
  }, [])

  // Serveur injoignable : nouvel essai automatique toutes les 15 s (et au retour sur l'onglet)
  useEffect(() => {
    if (etat !== 'serveur') return
    const reessayer = () => window.dispatchEvent(new Event('mp:reessayer'))
    const t = setInterval(reessayer, 15_000)
    const visible = () => { if (document.visibilityState === 'visible') reessayer() }
    document.addEventListener('visibilitychange', visible)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', visible) }
  }, [etat])

  if (!etat) return null
  const ok = etat === 'retour'
  const Icon = ok ? Wifi : etat === 'hors-ligne' ? WifiOff : ServerCrash
  return (
    <div role={ok ? 'status' : 'alert'} dir="rtl" className="mp-fade" key={bloque ? 'b' : 'n'}
      style={{ position: 'fixed', zIndex: 90, top: 'calc(10px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', width: 'max-content', maxWidth: 'calc(100% - 32px)', display: 'flex', alignItems: 'center', gap: 10, padding: etat === 'serveur' ? '6px 14px 6px 6px' : '8px 16px', borderRadius: 999, fontSize: 14, fontWeight: 500, boxShadow: '0 12px 28px -12px rgba(8,59,52,.55)', background: ok ? '#0E5A4E' : '#15201E', color: '#FFFFFF' }}>
      <Icon size={18} aria-hidden style={{ flex: 'none', color: ok ? '#CDE5DD' : '#F2A93B' }} />
      <span>{ok ? 'عاد الاتصال' : etat === 'hors-ligne' ? (bloque ? 'تُفتح هذه الصفحة عند عودة الاتصال' : 'لا اتصال بالإنترنت · تُعرض آخر بيانات محمّلة') : 'الخادم لا يستجيب'}</span>
      {etat === 'serveur' && (
        <button type="button" onClick={() => window.dispatchEvent(new Event('mp:reessayer'))}
          style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, background: '#FFFFFF', color: '#15201E', border: 0, borderRadius: 999, padding: '0 14px', minHeight: 32, whiteSpace: 'nowrap', cursor: 'pointer' }}>
          إعادة المحاولة
        </button>
      )}
    </div>
  )
}
