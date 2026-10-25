'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { TRIBUNAL_AR } from '@/lib/labels'

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
    // Codes absents du référentiel (TPI_CASA_CIVIL…) : nom de la liste locale plutôt que le code brut
    (code?: string | null) => (code && (map[code]?.nomAr ?? TRIBUNAL_AR[code])) || code || '—',
    [map],
  )

  return { tribunalAr, map, loading }
}
