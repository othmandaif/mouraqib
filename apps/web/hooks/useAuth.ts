'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch, apiGet, lireCache, setToken, clearToken, getToken } from '@/lib/api'
import { changerLangue, langueCourante, type Langue } from '@/lib/langue'

export interface User {
  id: string
  email: string
  nom: string
  prenom: string
  telephone?: string | null
  whatsappNumero?: string | null
  whatsappVerifie: boolean
  role: string
  deuxFacteurs?: boolean
  motDePasseChangeAt?: string | null
  doitChangerMdp?: boolean // mot de passe provisoire : page de changement obligatoire
  suppressionDemandeeAt?: string | null
  createdAt?: string
  cabinet?: { id: string; nom: string } | null
  barreau?: string | null
  /** Droits accordés par le responsable du cabinet (SUPPRESSION_DOSSIERS, CRM, FACTURATION, IA). */
  droits?: string[]
  /** Photo de profil (data URL 192 px) */
  avatar?: string | null
  /** Langue de l'interface (Paramètres) */
  langue?: Langue
}

/** Applique la langue du compte sur cet appareil. recharger : la page déjà affichée est dans l'autre langue. */
function suivreLangue(u: User | null | undefined, recharger: boolean) {
  if (!u?.langue || u.langue === langueCourante()) return
  changerLangue(u.langue)
  if (recharger) window.location.reload()
}

/** Le compte a-t-il ce droit ? (absent = ancienne réponse de l'API : tout est permis, l'API contrôle de toute façon) */
export const aDroit = (user: User | null | undefined, droit: string) => !user?.droits || user.droits.includes(droit)

type LoginResult = { token: string; user: User } | { deuxFacteurs: true; ticket: string }

export function useAuth() {
  // Plusieurs composants appellent useAuth : /auth/me est partagé (une requête) et mis en cache
  const [user, setUser] = useState<User | null>(() => lireCache<User>('/auth/me') ?? null)
  const [loading, setLoading] = useState(() => lireCache('/auth/me') === undefined)

  const refresh = useCallback(() => apiGet<User>('/auth/me').then((u) => { suivreLangue(u, true); setUser(u) }), [])

  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }
    // Coupure réseau ou serveur indisponible : on ne déconnecte jamais (un jeton invalide = 401, géré par
    // apiFetch). On réessaie au retour du réseau ou toutes les 10 s ; l'utilisateur en cache reste affiché.
    let fini = false
    let minuterie: ReturnType<typeof setTimeout> | undefined
    const essayer = () => {
      clearTimeout(minuterie)
      refresh()
        .then(() => { fini = true; setLoading(false) })
        .catch(() => { if (!fini) minuterie = setTimeout(essayer, 10_000) })
    }
    essayer()
    const relancer = () => { if (!fini) essayer() } // « إعادة المحاولة » ou retour du réseau
    window.addEventListener('online', relancer)
    window.addEventListener('mp:reessayer', relancer)
    return () => { fini = true; clearTimeout(minuterie); window.removeEventListener('online', relancer); window.removeEventListener('mp:reessayer', relancer) }
  }, [refresh])

  /** Renvoie `{ deuxFacteurs, ticket }` quand un code WhatsApp est requis (voir `verifier2fa`). */
  const login = async (email: string, password: string, seSouvenir?: boolean) => {
    const data = await apiFetch<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, seSouvenir }),
    })
    if ('deuxFacteurs' in data) return data
    setToken(data.token)
    suivreLangue(data.user, false) // la page suivante s'affiche déjà dans la langue du compte
    setUser(data.user)
    return data.user
  }

  const verifier2fa = async (ticket: string, code: string) => {
    const data = await apiFetch<{ token: string; user: User }>('/auth/login/2fa', {
      method: 'POST',
      body: JSON.stringify({ ticket, code }),
    })
    setToken(data.token)
    suivreLangue(data.user, false)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {})
    clearToken()
    setUser(null)
    window.location.href = '/login'
  }

  return { user, loading, login, verifier2fa, logout, refresh }
}
