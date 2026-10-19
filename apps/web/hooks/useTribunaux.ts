'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

interface TribunalInfo {
  nomAr: string
  ville: string
}

export function useTribunaux() {
  const [map, setMap] = useState<Record<string, TribunalInfo>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<Record<string, TribunalInfo>>('/tribunaux/map')
      .then(setMap)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const tribunalAr = useCallback(
    (code?: string | null) => (code && map[code]?.nomAr) || code || '—',
    [map],
  )

  return { tribunalAr, map, loading }
}
