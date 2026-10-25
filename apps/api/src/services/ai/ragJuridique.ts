import { Pool } from 'pg'
import { askDeepseek } from './deepseek'
import { logger } from '../../utils/logger'

/**
 * RAG juridique bilingue : recherche dans le corpus de lois marocaines
 * (table chunk_juridique, indexée avec Voyage voyage-law-2, 1024 dims, index HNSW cosinus).
 *
 * Deux sources : adala (français) + pmp (arabe). Pour couvrir les deux, on lance
 * DEUX recherches en parallèle : une avec la question arabe brute (matche pmp),
 * une avec sa réécriture française (matche adala), puis on fusionne les résultats.
 */

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
const VOYAGE_MODEL = 'voyage-law-2'
const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_RERANK_URL = 'https://api.voyageai.com/v1/rerank'
const RERANK_MODEL = 'rerank-2'
const TOP_K = 12
const CANDIDATS_PAR_RECHERCHE = 25   // recherche unique : on ratisse large, le reranker trie

// Pool Postgres dédié (réutilise la même base que Prisma).
// DATABASE_URL est déjà dans ton .env pour Prisma.
// Pool dédié à la recherche vectorielle : borné pour ne pas affamer Prisma, requêtes limitées à 10 s
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.RAG_POOL_MAX ?? 5), idleTimeoutMillis: 30_000, statement_timeout: 10_000 })
pool.on('error', (e) => logger.warn('Pool RAG :', e))

// Cache mémoire des embeddings de questions (même question reposée = pas de nouvel appel payant)
const cacheEmbeddings = new Map<string, number[]>()
const MAX_CACHE = 500

export interface ArticleJuridique {
  chunkId: string
  article: string | null
  titreLoi: string | null
  text: string
  score: number
  source: string | null
  pdfUrl: string | null
}

/** Embedding d'une requête via Voyage (input_type=query). */
async function embedQuery(texte: string): Promise<number[] | null> {
  if (!VOYAGE_API_KEY) {
    logger.warn('VOYAGE_API_KEY manquante — RAG juridique désactivé')
    return null
  }
  const cle = texte.trim().slice(0, 2000)
  const enCache = cacheEmbeddings.get(cle)
  if (enCache) return enCache
  try {
    const res = await fetch(VOYAGE_URL, {
      signal: AbortSignal.timeout(8000), // le chat ne doit jamais rester bloqué sur la recherche
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        input: [texte],
        model: VOYAGE_MODEL,
        input_type: 'query',
      }),
    })
    if (!res.ok) {
      logger.warn(`Voyage ${res.status}: ${(await res.text()).slice(0, 150)}`)
      return null
    }
    const data = (await res.json()) as any
    const emb: number[] | null = data?.data?.[0]?.embedding ?? null
    if (emb) {
      if (cacheEmbeddings.size >= MAX_CACHE) cacheEmbeddings.delete(cacheEmbeddings.keys().next().value as string)
      cacheEmbeddings.set(cle, emb)
    }
    return emb
  } catch (err) {
    logger.warn('Échec embedding Voyage:', err)
    return null
  }
}

/**
 * Reclasse une liste de documents par pertinence réelle vis-à-vis de la question,
 * via le reranker Voyage (rerank-2). Multilingue : compare arabe ET français sur
 * la MÊME échelle — résout le problème des scores d'embedding non comparables.
 * Retourne les indices reclassés (meilleur d'abord). Repli : null (ordre d'origine).
 */
async function reranker(question: string, documents: string[], topK: number): Promise<number[] | null> {
  if (!VOYAGE_API_KEY || documents.length === 0) return null
  try {
    const res = await fetch(VOYAGE_RERANK_URL, {
      signal: AbortSignal.timeout(8000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        query: question,
        documents,
        model: RERANK_MODEL,
        top_k: topK,
      }),
    })
    if (!res.ok) {
      logger.warn(`Voyage rerank ${res.status}: ${(await res.text()).slice(0, 150)}`)
      return null
    }
    const data = (await res.json()) as any
    const ordre: number[] = (data?.data ?? []).map((d: any) => d.index)
    return ordre.length ? ordre : null
  } catch (err) {
    logger.warn('Échec reranker Voyage:', err)
    return null
  }
}



/** Formate un vecteur pour pgvector : '[0.1,0.2,...]'. */
function vecToSql(vec: number[]): string {
  return '[' + vec.join(',') + ']'
}

/**
 * Recherche les articles de loi les plus proches de la question.
 * Retourne [] si Voyage indisponible (le chat continue sans droit).
 */
export async function rechercherArticles(question: string): Promise<ArticleJuridique[]> {
  // RAPIDE : on embedde directement la question arabe brute (Voyage voyage-law-2
  // est multilingue → matche le corpus arabe pmp ET français adala). Plus de
  // réécriture DeepSeek bloquante avant la recherche : on gagne un appel complet.
  const vecAr = await embedQuery(question)
  if (!vecAr) return []

  const sql = `
    SELECT chunk_id, article, titre_loi, text, source, pdf_url,
           1 - (embedding <=> $1::vector) AS score
    FROM chunk_juridique
    ORDER BY embedding <=> $1::vector
    LIMIT $2;
  `

  const lire = async (vec: number[] | null): Promise<ArticleJuridique[]> => {
    if (!vec) return []
    try {
      const { rows } = await pool.query(sql, [vecToSql(vec), CANDIDATS_PAR_RECHERCHE])
      return rows.map((r: any) => ({
        chunkId: r.chunk_id,
        article: r.article,
        titreLoi: r.titre_loi,
        text: r.text,
        score: Number(r.score),
        source: r.source ?? null,
        pdfUrl: r.pdf_url ?? null,
      }))
    } catch (err) {
      logger.error('Erreur recherche pgvector:', err)
      return []
    }
  }

  const candidats = await lire(vecAr)
  if (candidats.length === 0) return []

  // RERANKER : reclasse tous les candidats par pertinence réelle (multilingue).
  const docs = candidats.map((c) => `${c.titreLoi ?? ''} ${c.article ? 'المادة ' + c.article : ''}\n${c.text}`.slice(0, 2000))
  const ordre = await reranker(question, docs, candidats.length) // on rerank TOUT

  // Candidats classés par pertinence (reranker si dispo, sinon score d'embedding).
  const classes: ArticleJuridique[] = ordre
    ? ordre.map((idx) => candidats[idx]).filter(Boolean)
    : candidats.slice().sort((a, b) => b.score - a.score)

  // MIX GARANTI DES SOURCES : chaque source (adala = articles/peines précis,
  // pmp = procédure pratique) a une place réservée, pour que la réponse ait
  // à la fois les textes de loi ET la procédure. On respecte l'ordre de pertinence
  // à l'intérieur de chaque source.
  const QUOTA_MIN = 3 // au moins 3 de chaque source si disponibles
  const parSource = new Map<string, ArticleJuridique[]>()
  for (const c of classes) {
    const s = c.source ?? 'autre'
    if (!parSource.has(s)) parSource.set(s, [])
    parSource.get(s)!.push(c)
  }

  const resultat: ArticleJuridique[] = []
  const vus = new Set<string>()
  // 1) on garantit le quota minimum de chaque source (les plus pertinents)
  for (const [, liste] of parSource) {
    for (const c of liste.slice(0, QUOTA_MIN)) {
      if (!vus.has(c.chunkId)) { vus.add(c.chunkId); resultat.push(c) }
    }
  }
  // 2) on complète jusqu'à TOP_K avec les meilleurs restants, tous confondus
  for (const c of classes) {
    if (resultat.length >= TOP_K) break
    if (!vus.has(c.chunkId)) { vus.add(c.chunkId); resultat.push(c) }
  }
  // 3) on re-trie le résultat final par pertinence globale (ordre du reranker)
  const rang = new Map(classes.map((c, i) => [c.chunkId, i]))
  return resultat.sort((a, b) => (rang.get(a.chunkId)! - rang.get(b.chunkId)!)).slice(0, TOP_K)
}

/** Met en forme les articles trouvés pour injection dans le prompt. */
export function formaterArticles(articles: ArticleJuridique[]): string {
  if (!articles.length) return ''
  const blocs = articles.map((a, i) => {
    const ref = a.article ? `المادة ${a.article}` : 'مقتطف'
    const lien = a.pdfUrl ? `\n(الرابط: ${a.pdfUrl})` : ''
    return `[مصدر ${i + 1}] ${a.titreLoi ?? '—'} — ${ref}${lien}\n${a.text}`
  })
  return blocs.join('\n\n')
}

/**
 * Décide si la question nécessite une recherche dans les lois (RAG juridique).
 * Tient compte du dernier échange pour ne pas re-chercher sur un simple suivi.
 * Repli prudent : true (on cherche).
 */
export async function besoinDeDroit(question: string, dernierEchange = ''): Promise<boolean> {
  const q = question.trim()

  // ── Décision RAPIDE sans appel API (évite la latence sur les cas évidents) ──
  // Trop court → salutation/bavardage → pas de recherche.
  if (q.length < 12) return false

  // Salutations / remerciements / politesse → DIRECT.
  const politesse = /^(سلام|السلام|صباح|مساء|أهلا|مرحبا|شكرا|شكراً|بارك|تمام|طيب|ok|merci|bonjour|salut|حسنا|واخا)/i
  if (politesse.test(q)) return false

  // Suivi / reformulation d'un point déjà traité → DIRECT (on a déjà les articles en mémoire).
  const suivi = /(وضّح|وضح|اشرح أكثر|أعد|كرر|لخّص|لخص|ملخص|بمعنى|يعني|السابق|قلت|ذكرت|résume|reformule|explique)/i
  if (suivi.test(q) && dernierEchange.length > 0) return false

  // Signaux FORTS d'une question juridique → CHERCHER direct (sans appel).
  const juridique = /(الفصل|المادة|القانون|مدونة|عقوبة|أجل|مسطرة|دعوى|محكمة|استئناف|نقض|تعرض|كراء|عقد|طلاق|نفقة|إرث|جريمة|جنحة|تعويض|فسخ|بطلان|حبس|غرامة|طعن|تقادم)/
  if (juridique.test(q)) return true

  // ── Cas ambigu seulement → un appel DeepSeek (rare, donc peu coûteux) ──
  const SYSTEME =
    'Tu décides si une question nécessite de CHERCHER dans une base de textes de loi marocains, ' +
    'ou de répondre DIRECT. Réponds par UN SEUL MOT : CHERCHER ou DIRECT.\n' +
    'CHERCHER = règle de droit, article, délai, procédure, sanction, cas concret nécessitant le droit.\n' +
    'DIRECT = salutation, remerciement, suivi d’un point déjà traité, question sur les dossiers, bavardage.'
  try {
    const d = await askDeepseek<string>(
      SYSTEME,
      `Dernier échange:\n${dernierEchange.slice(0, 300)}\n\nQ: ${question} →`,
      { json: false, temperature: 0, maxTokens: 5 },
    )
    return (d || '').toUpperCase().includes('CHERCHER')
  } catch {
    return true
  }
}