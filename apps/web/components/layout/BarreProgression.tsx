'use client'

// Fine barre verte en haut pendant un changement de page ou un envoi (créer, modifier, supprimer…) :
// l'action a bien été prise en compte. Rien pour une attente de moins de 250 ms (pas de clignotement).
import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { nbEcrituresEnCours } from '@/lib/api'

export function BarreProgression() {
  const pathname = usePathname()
  const params = useSearchParams()
  const [etat, setEtat] = useState<'repos' | 'charge' | 'fin'>('repos')
  const minuterie = useRef<ReturnType<typeof setTimeout>>()

  // Départ : clic sur un lien interne qui change de page (sans Ctrl/⌘, pas un nouvel onglet)
  useEffect(() => {
    const clic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return
      setEtat('charge')
      clearTimeout(minuterie.current)
      minuterie.current = setTimeout(() => setEtat('repos'), 10_000) // filet : jamais de barre bloquée
    }
    document.addEventListener('click', clic, true)
    return () => document.removeEventListener('click', clic, true)
  }, [])

  // Envois en cours (lib/api.ts) : barre après 250 ms, curseur « en cours », fin quand tout est revenu
  useEffect(() => {
    let attente: ReturnType<typeof setTimeout> | undefined
    const maj = () => {
      const n = nbEcrituresEnCours()
      document.documentElement.toggleAttribute('data-envoi', n > 0)
      clearTimeout(attente)
      if (n > 0) attente = setTimeout(() => setEtat((e) => (e === 'repos' || e === 'fin' ? 'charge' : e)), 250)
      else setEtat((e) => (e === 'charge' ? 'fin' : e))
    }
    window.addEventListener('mp:ecritures', maj)
    return () => { window.removeEventListener('mp:ecritures', maj); clearTimeout(attente) }
  }, [])
  useEffect(() => {
    if (etat !== 'fin') return
    const t = setTimeout(() => setEtat((e) => (e === 'fin' ? 'repos' : e)), 300)
    return () => clearTimeout(t)
  }, [etat])

  // Arrivée : la nouvelle adresse est affichée
  useEffect(() => {
    setEtat((e) => (e === 'charge' && nbEcrituresEnCours() === 0 ? 'fin' : e))
  }, [pathname, params])

  if (etat === 'repos') return null
  return (
    <div aria-hidden style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 90, pointerEvents: 'none' }}>
      <div className={etat === 'charge' ? 'mp-barre-nav' : undefined}
        style={{ height: '100%', marginLeft: 'auto', background: '#2E8B6E', boxShadow: '0 0 8px rgba(46,139,110,.6)', width: etat === 'fin' ? '100%' : '30%', transition: 'width .25s ease-out', borderRadius: '0 0 0 3px' }} />
    </div>
  )
}
