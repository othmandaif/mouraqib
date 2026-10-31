'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { apiGet, lireCache } from '@/lib/api'

/**
 * Lecture d'un endpoint GET.
 * - Les données déjà vues s'affichent tout de suite (cache), puis sont rafraîchies.
 * - Une réponse arrivée après un changement de page/filtre n'écrase pas la plus récente.
 */
export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(() => (path ? lireCache<T>(path) ?? null : null))
  const [loading, setLoading] = useState(() => !!path && lireCache(path) === undefined)
  const [error, setError] = useState<string | null>(null)
  const dernier = useRef(0)

  const charger = useCallback((p: string): Promise<void> => {
    const n = ++dernier.current
    const enCache = lireCache<T>(p)
    if (enCache !== undefined) setData(enCache)
    setLoading(enCache === undefined)
    setError(null)
    return apiGet<T>(p)
      .then((d) => { if (n === dernier.current) setData(d) })
      .catch((e) => { if (n === dernier.current) setError(e.message) })
      .finally(() => { if (n === dernier.current) setLoading(false) })
  }, [])

  useEffect(() => {
    if (!path) { dernier.current++; setLoading(false); return }
    charger(path)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])

  // Promesse résolue quand les données fraîches sont affichées (une action peut l'attendre avant de rendre la main)
  const refetch = useCallback((): Promise<void> => (path ? charger(path) : Promise.resolve()), [path, charger])

  // Bouton « إعادة المحاولة » du bandeau hors ligne : toutes les lectures de la page se relancent
  useEffect(() => {
    const relire = () => { refetch() }
    window.addEventListener('mp:reessayer', relire)
    return () => window.removeEventListener('mp:reessayer', relire)
  }, [refetch])

  return { data, loading, error, refetch }
}
