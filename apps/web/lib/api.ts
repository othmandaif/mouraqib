const API_BASE = '/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('mouraqib_token')
}

export function setToken(token: string) {
  localStorage.setItem('mouraqib_token', token)
}

export function clearToken() {
  localStorage.removeItem('mouraqib_token')
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Non authentifié')
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur API')
  return data as T
}
