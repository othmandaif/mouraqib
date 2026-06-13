'use client'

import { useState, useEffect } from 'react'
import { apiFetch } from '@/lib/api'

export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!path) { setLoading(false); return }
    setLoading(true)
    setError(null)
    apiFetch<T>(path)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])

  const refetch = () => {
    if (!path) return
    setLoading(true)
    apiFetch<T>(path).then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }

  return { data, loading, error, refetch }
}
