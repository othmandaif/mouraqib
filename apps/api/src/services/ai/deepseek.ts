import { logger } from '../../utils/logger'

const BASE_URL = 'https://api.deepseek.com/v1'
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
const API_KEY = process.env.DEEPSEEK_API_KEY

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AskOptions {
  json?: boolean        // force une réponse JSON parsable
  temperature?: number  // défaut 0.3 (analyse) ; chat → 0.6
  maxTokens?: number
}

function ensureKey() {
  if (!API_KEY) {
    throw new Error('DEEPSEEK_API_KEY manquante dans .env')
  }
}

/**
 * Appel simple (non-stream). Retourne le texte de la réponse.
 * Si options.json = true, parse et retourne l'objet (avec nettoyage des ```json).
 */
export async function askDeepseek<T = string>(
  system: string,
  user: string,
  options: AskOptions = {},
): Promise<T> {
  ensureKey()
  const { json = false, temperature = 0.3, maxTokens = 1500 } = options

  const body: Record<string, unknown> = {
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature,
    max_tokens: maxTokens,
  }
  if (json) body.response_format = { type: 'json_object' }

  let lastErr: unknown
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 60_000)
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`DeepSeek ${res.status}: ${txt.slice(0, 200)}`)
      }

      const data = (await res.json()) as any
      const content: string = data?.choices?.[0]?.message?.content ?? ''

      if (!json) return content as T

      // Parsing JSON robuste (au cas où le modèle entoure de ```json)
      const cleaned = content.replace(/```json\s*|\s*```/g, '').trim()
      try {
        return JSON.parse(cleaned) as T
      } catch {
        // tentative : extraire le premier objet {...}
        const m = cleaned.match(/\{[\s\S]*\}/)
        if (m) return JSON.parse(m[0]) as T
        throw new Error('Réponse DeepSeek non parsable en JSON')
      }
    } catch (err) {
      lastErr = err
      logger.warn(`DeepSeek tentative ${attempt} échouée:`, err)
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1200))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Échec DeepSeek')
}

/**
 * Appel en streaming (pour le chat). Appelle onToken pour chaque fragment.
 * Retourne le texte complet à la fin.
 */
export async function streamDeepseek(
  messages: ChatMessage[],
  onToken: (chunk: string) => void,
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  ensureKey()
  const { temperature = 0.6, maxTokens = 1500 } = options

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: maxTokens, stream: true }),
  })

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => '')
    throw new Error(`DeepSeek stream ${res.status}: ${txt.slice(0, 200)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload) as any
        const delta: string = json?.choices?.[0]?.delta?.content ?? ''
        if (delta) { full += delta; onToken(delta) }
      } catch {
        // fragment incomplet, ignoré
      }
    }
  }
  return full
}

/** Tronque une liste d'événements pour rester sous une limite de caractères. */
export function limiterTexte(textes: string[], maxChars = 6000): string {
  let out = ''
  for (const t of textes) {
    if (out.length + t.length > maxChars) break
    out += t + '\n'
  }
  return out.trim()
}