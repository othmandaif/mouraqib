const API_BASE = '/api'

const CLE_TOKEN = 'malafipro_token'
const ANCIENNE_CLE = 'mouraqib_token' // ancien nom : relu une fois puis supprimé (pas de déconnexion)

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const t = localStorage.getItem(CLE_TOKEN)
    if (t) return t
    const ancien = localStorage.getItem(ANCIENNE_CLE)
    if (ancien) { localStorage.setItem(CLE_TOKEN, ancien); localStorage.removeItem(ANCIENNE_CLE) }
    return ancien
  } catch { return null }
}

export function setToken(token: string) {
  try { localStorage.setItem(CLE_TOKEN, token); localStorage.removeItem(ANCIENNE_CLE) } catch { /* navigation privée */ }
  viderCache()
}

export function clearToken() {
  try { localStorage.removeItem(CLE_TOKEN); localStorage.removeItem(ANCIENNE_CLE) } catch { /* navigation privée */ }
  viderCache() // jamais de données d'un autre compte sur un poste partagé
}

/* ------------------------------------------------------------------ */
/* Cache des lectures (GET) : affichage instantané au retour sur une  */
/* page, puis mise à jour en arrière-plan. Requêtes identiques        */
/* simultanées regroupées en une seule.                               */
/* ------------------------------------------------------------------ */

const cache = new Map<string, unknown>()
const enCours = new Map<string, Promise<unknown>>()

export function lireCache<T>(path: string): T | undefined {
  return cache.get(path) as T | undefined
}

export function viderCache() {
  cache.clear()
  enCours.clear()
}

/** GET partagé : une seule requête réseau à la fois par chemin ; le résultat alimente le cache. */
export function apiGet<T>(path: string): Promise<T> {
  const deja = enCours.get(path)
  if (deja) return deja as Promise<T>
  const p = apiFetch<T>(path)
    .then((d) => { cache.set(path, d); return d })
    .finally(() => enCours.delete(path))
  enCours.set(path, p)
  return p
}

function signaler(evt: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(evt))
}

/**
 * Écritures en cours (POST/PATCH/PUT/DELETE), tous écrans confondus : la barre du haut (BarreProgression)
 * les suit, ainsi toute action qui prend du temps montre qu'elle a été prise en compte.
 */
let ecrituresEnCours = 0
export const nbEcrituresEnCours = () => ecrituresEnCours
function compterEcriture(delta: 1 | -1) {
  ecrituresEnCours = Math.max(0, ecrituresEnCours + delta)
  signaler('mp:ecritures')
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const ecriture = !!options.method && options.method !== 'GET'
  if (!ecriture) return requete<T>(path, options)
  compterEcriture(1)
  try { return await requete<T>(path, options) } finally { compterEcriture(-1) }
}

async function requete<T>(path: string, options: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  // Lecture sans réponse après 25 s (réseau faible au tribunal) = coupure : sinon l'écran attend indéfiniment.
  // Pas de délai sur les écritures : un envoi lent peut avoir abouti, on ne le relance pas.
  const lecture = !options.method || options.method === 'GET'
  const signal = options.signal ?? (lecture && typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(25_000) : undefined)

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal })
  } catch (e) {
    if (options.signal?.aborted) throw e // annulation voulue par l'appelant : pas une coupure
    signaler('mp:api-erreur') // hors ligne / serveur injoignable : bandeau EtatConnexion
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('Pas de connexion internet')
    if (e instanceof DOMException && e.name === 'TimeoutError') throw new Error('Le serveur a mis trop de temps à répondre. Réessayez.')
    throw new Error('Connexion impossible')
  }
  signaler(res.status >= 500 ? 'mp:api-erreur' : 'mp:api-ok')

  // 401 sur la connexion = mauvais identifiants : on laisse le formulaire afficher l'erreur
  if (res.status === 401 && !path.startsWith('/auth/login')) {
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

  // Mot de passe provisoire pas encore changé : page de changement obligatoire
  if (res.status === 403 && data?.error === 'Mot de passe provisoire à changer') {
    if (!window.location.pathname.startsWith('/mot-de-passe-provisoire')) window.location.href = '/mot-de-passe-provisoire'
    throw new Error('Mot de passe provisoire à changer')
  }

  // Compte désactivé par le commercial pendant la session : retour à la connexion avec le message
  if (res.status === 403 && data?.error === 'Compte désactivé' && !path.startsWith('/auth/login')) {
    clearToken()
    window.location.href = '/login?desactive=1'
    throw new Error('Compte désactivé')
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