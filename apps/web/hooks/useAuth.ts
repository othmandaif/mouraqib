'use client'

import { useState, useEffect } from 'react'
import { apiFetch, setToken, clearToken } from '@/lib/api'

interface User {
  id: string
  email: string
  nom: string
  prenom: string
  whatsappVerifie: boolean
  role: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('mouraqib_token')
    if (!token) { setLoading(false); return }
    apiFetch<User>('/auth/me')
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {})
    clearToken()
    setUser(null)
    window.location.href = '/login'
  }

  return { user, loading, login, logout }
}
