'use client'

import { useEffect, useRef } from 'react'

/**
 * Retour sur une liste (bouton « رجوع » ou lien) : on revient à la même position de défilement.
 * La position est gardée pour l'onglet du navigateur (sessionStorage), par adresse.
 * `pret` : le contenu est affiché (sinon la page est trop courte pour défiler).
 */
export function useRestaurerDefilement(cle: string, pret: boolean) {
  const fait = useRef(false)
  useEffect(() => {
    if (!pret || fait.current) return
    fait.current = true
    let y = 0
    try { y = Number(sessionStorage.getItem(`defilement:${cle}`)) || 0 } catch {}
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y))
  }, [cle, pret])
  useEffect(() => {
    const garder = () => { try { sessionStorage.setItem(`defilement:${cle}`, String(window.scrollY)) } catch {} }
    window.addEventListener('scroll', garder, { passive: true })
    return () => window.removeEventListener('scroll', garder)
  }, [cle])
}
