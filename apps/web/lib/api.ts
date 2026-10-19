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

  // Parsing JSON robuste : si un proxy/timeout renvoie du HTML (502/504),
  // res.json() jetterait une SyntaxError trompeuse. On lit d'abord en texte.
  const raw = await res.text()
  let data: any = null
  if (raw) {
    try {
      data = JSON.parse(raw)
    } catch {
      // Réponse non-JSON (page d'erreur proxy, timeout gateway, etc.)
      if (!res.ok) {
        throw new Error(
          res.status === 502 || res.status === 504
            ? 'Le serveur a mis trop de temps à répondre. Réessayez.'
            : `Erreur serveur (${res.status})`,
        )
      }
      throw new Error('Réponse inattendue du serveur')
    }
  }

  if (!res.ok) {
    // data.error peut être une string OU un objet (Zod/Prisma).
    // On garantit une string pour ne jamais rendre un objet dans l'UI.
    const e = data?.error
    const msg =
      typeof e === 'string'
        ? e
        : e
          ? JSON.stringify(e)
          : `Erreur API (${res.status})`
    throw new Error(msg)
  }
  return data as T
}

/* ------------------------------------------------------------------ */
/* Recherche live asynchrone (job + polling)                          */
/* ------------------------------------------------------------------ */

export interface SearchResultPayload {
  trouve: boolean
  titreAffaire: string | null
  evenements: any[]
  infosCarte: Record<string, string> | null
  parties: any[]
  expertises: string[]
  recours: any[]
  dossiersLies: any[]
  erreur?: boolean
}

interface PollOptions {
  intervalMs?: number       // intervalle entre deux vérifications (défaut 2s)
  timeoutMs?: number        // abandon après ce délai total (défaut 90s)
  signal?: AbortSignal      // pour annuler le polling (ex: l'utilisateur ferme le form)
}

/**
 * Lance une recherche live puis interroge l'API jusqu'à obtenir le résultat.
 * Ne dépend d'AUCUN timeout de requête unique : chaque appel est court,
 * on répète simplement jusqu'à ce que le job soit prêt.
 */
export async function rechercherDossier(
  body: {
    anneeDossier: string
    codeRole: string
    numeroDossier: string
    courAppel: string
    tribunalPrimaire?: string
  },
  options: PollOptions = {},
): Promise<SearchResultPayload> {
  const { intervalMs = 2000, timeoutMs = 90000, signal } = options

  // 1) Démarrer le job → on reçoit un jobId immédiatement (202)
  const { jobId } = await apiFetch<{ jobId: string; statut: string }>('/dossiers/rechercher', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  // 2) Polling
  const start = Date.now()
  // petite pause initiale pour laisser le worker démarrer
  await sleep(Math.min(intervalMs, 1000))

  while (true) {
    if (signal?.aborted) throw new Error('Recherche annulée')
    if (Date.now() - start > timeoutMs) {
      throw new Error("La recherche a expiré. mahakim.ma est peut-être lent ou indisponible.")
    }

    const status = await apiFetch<{ statut: string; resultat?: SearchResultPayload; error?: string }>(
      `/dossiers/rechercher/${jobId}`,
    )

    if (status.statut === 'pret' && status.resultat) {
      return status.resultat
    }
    if (status.statut === 'echec') {
      throw new Error(status.error || 'La recherche a échoué sur mahakim.ma')
    }
    if (status.statut === 'introuvable') {
      throw new Error('Recherche introuvable (expirée). Relancez.')
    }
    // statut === 'en_cours' → on attend et on réessaie
    await sleep(intervalMs)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}