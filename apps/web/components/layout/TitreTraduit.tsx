'use client'
// Titre de l'onglet en français : les metadata (serveur) sont en arabe, on traduit chaque partie « A · B » côté client.
import { useEffect } from 'react'
import { langueCourante, t } from '@/lib/langue'

export function TitreTraduit() {
  useEffect(() => {
    if (langueCourante() !== 'fr') return
    const traduire = () => {
      const fr = document.title.split(' · ').map((p) => t(p)).join(' · ')
      if (fr !== document.title) document.title = fr
    }
    traduire()
    const head = document.querySelector('head')
    if (!head) return
    const obs = new MutationObserver(traduire) // Next change le <title> à chaque navigation
    obs.observe(head, { subtree: true, childList: true, characterData: true })
    return () => obs.disconnect()
  }, [])
  return null
}
