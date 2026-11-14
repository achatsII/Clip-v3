/**
 * IA : l'assistant (AskAI v4), la synthèse vocale, la voix temps réel, la génération d'images.
 *
 * Chaque appel à l'assistant part sur `/api/v4/assistant/ask` et nomme son usage (`AiOperation`,
 * gardé au registre). L'IA n'a pas de prix fixe : facturation v2 allumée, chaque réponse est débitée
 * de son coût réel, une fois terminée (askAi du skill billing) :
 * 1. avant : le solde des crédits d'IA est relu ; à zéro ou en dessous, refus 402 sans appel ;
 * 2. la réponse de l'assistant porte son coût réel (`billing.costs.cad`, `billing_merged` pour
 *    plusieurs lots de fichiers) ;
 * 3. après : ce coût, converti en crédits au taux de l'environnement (`AI_CREDIT_RATE`), est débité
 *    par `/api/v2/billing/consume` avec la clé de l'appel. Une réponse lancée est payée en entier,
 *    même sous zéro ; une réponse en échec qui rend un coût est débitée de ce coût ; sans coût
 *    (délai, coupure), rien n'est débité.
 * Rien ne se prédit avant : l'écran montre ce qui a été débité, après (`onAiCost`).
 */
import { requireAiConsent } from '../ai/consent'
import { emitAiCost, emitRefusal, emitSettled } from '../billing/bus'
import { AI_CREDIT_RATE, BILLING_V2, PRODUCT_SLUG } from '../config'
import { ApiError, GatewayClient } from './client'
import { messages } from '@/lib/i18n'

/** Les usages de l'IA dans CLIP : le nom va au registre avec chaque débit (aucun prix fixe). */
export const AI_OPERATIONS = [
  'generate_s',
  'generate_m',
  'generate_l',
  'import_s',
  'import_l',
  'step_assist',
  'translate',
  'translate_image',
  'annotate',
  'illustrate',
  'ask_question',
  'standard_agent',
  'edit_agent',
  'visual',
  'look_s',
  'look_m',
  'look_l',
  'quiz',
  'report_summary',
  'report_question',
] as const
export type AiOperation = (typeof AI_OPERATIONS)[number]

export interface AskFile {
  url?: string
  geminiFileUri?: string
  filename: string
  mimeType: string
  sizeBytes?: number
}

export interface AskBody {
  prompt: string
  system_instruction: string
  provider: 'google' | 'anthropic' | 'openai'
  level: 'low' | 'mid' | 'high'
  thinking?: 'enabled' | 'disabled'
  effort?: 'minimal' | 'low' | 'medium' | 'high'
  json_schema?: Record<string, unknown>
  files?: AskFile[]
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  mediaResolution?: 'auto' | 'low' | 'medium' | 'high'
  maxOutputTokens?: number
  imageGenerationMode?: 'disabled' | 'auto' | 'enabled'
}

export interface AskResult<T = unknown> {
  text: string
  json: T | null
  model: string | null
  usage: Record<string, unknown> | null
  /** Les crédits débités pour cette réponse, au coût réel ; null sans débit (facturation éteinte). */
  charged: number | null
}

/** La banque de crédits que l'IA débite (la feature du manifeste). */
export const AI_FEATURE = 'ai_credits'

/**
 * Le coût réel d'une réponse de l'assistant, en dollars canadiens : `billing_merged` quand la
 * réponse a fait plusieurs lots de fichiers, sinon `billing`. Null si la réponse n'en porte pas.
 */
export function aiCostCad(body: unknown): number | null {
  if (body === null || typeof body !== 'object') return null
  const b = body as Record<string, { costs?: { cad?: unknown } } | undefined>
  for (const source of [b.billing_merged, b.billing]) {
    const cad = source?.costs?.cad
    if (typeof cad === 'number' && Number.isFinite(cad) && cad >= 0) return cad
  }
  return null
}

/** Le coût en crédits, arrondi au crédit supérieur ; un coût nul ne coûte rien. */
export function creditsForCost(costCad: number, rate: number): number {
  // L'arrondi intermédiaire efface le bruit des flottants avant de monter au crédit supérieur.
  return Math.max(0, Math.ceil(Math.round(costCad * rate * 1e6) / 1e6))
}

/** Ce que le débit garde de la réponse, pour le registre : l'usage, le coût, le modèle, les tokens ; jamais le contenu. */
function debitMetadata(operation: string, body: unknown, costCad: number): Record<string, unknown> {
  const b = (body !== null && typeof body === 'object' ? body : {}) as Record<string, any>
  const usage = b.usage_normalized ?? b.results?.usage_normalized ?? {}
  const meta: Record<string, unknown> = { operation, cost_cad: costCad }
  const model = usage.billing_model ?? usage.model ?? b.results?.model
  if (typeof model === 'string') meta.model = model.slice(0, 100)
  for (const [field, value] of [['input_tokens', usage.input_tokens], ['output_tokens', usage.output_tokens_total]] as const) {
    if (typeof value === 'number' && Number.isFinite(value)) meta[field] = value
  }
  return meta
}

const DEBIT_ATTEMPTS = 3

export type AiDebitErrorListener = (error: unknown, debit: { operation: AiOperation; idempotencyKey: string; credits: number }) => void
const debitErrorListeners = new Set<AiDebitErrorListener>()
/** Une réponse rendue dont le débit n'a pas pu s'écrire, même après les nouveaux essais : pour le journal. */
export function onAiDebitError(fn: AiDebitErrorListener) {
  debitErrorListeners.add(fn)
  return () => debitErrorListeners.delete(fn)
}

interface AskEnvelope {
  success?: boolean
  billing?: { costs?: { cad?: number } }
  billing_merged?: { costs?: { cad?: number } }
  results?: {
    assistant_response?: string
    parsed_json?: unknown
    model?: string
    error?: unknown
    error_details?: unknown
    usage_normalized?: Record<string, unknown>
  }
  usage_normalized?: Record<string, unknown>
}

function idempotencyKey(operation: AiOperation, scope: string) {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()).slice(2)
  return `clip:${operation}:${scope}:${rand}`.replace(/[^A-Za-z0-9:._#-]/g, '-').slice(0, 200)
}

export type AiUsageListener = (event: { operation: AiOperation; model: string | null; usage: Record<string, unknown> | null; ok: boolean; credits?: number | null }) => void
const usageListeners = new Set<AiUsageListener>()
export function onAiUsage(fn: AiUsageListener) {
  usageListeners.add(fn)
  return () => usageListeners.delete(fn)
}

export function aiApi(client: GatewayClient, options: { billing?: boolean; creditRate?: number | null } = {}) {
  const billing = options.billing ?? BILLING_V2
  const rate = options.creditRate === undefined ? AI_CREDIT_RATE : options.creditRate
  const billingHeaders = { 'X-Product': PRODUCT_SLUG }

  /** Refuse avant l'appel : facturation mal réglée, crédits d'IA hors du plan, ou solde à zéro. */
  async function ensureCredits(): Promise<void> {
    // Sans taux, l'IA facturée ne s'ouvre pas sans débit : elle refuse, et le journal le dit.
    if (rate === null) throw new ApiError(messages().common.errors.aiBillingSetup, 503, null, 'billing_misconfigured')
    const state = await client.call<{ credits?: Array<{ feature_key: string; available: number }> }>('/api/v2/billing/context', { method: 'GET', headers: billingHeaders, timeoutMs: 20_000 })
    const bucket = state.credits?.find((c) => c.feature_key === AI_FEATURE)
    const refuse = (status: 402 | 403, code: 'insufficient_credits' | 'not_entitled') => {
      emitRefusal({ status, code, reason: null, featureKey: AI_FEATURE, upgradePlan: null, upgradeAddon: null })
      emitSettled()
      return new ApiError(code === 'insufficient_credits' ? messages().common.errors.aiNoCredits : messages().common.errors.aiNotInPlan, status, { code, feature_key: AI_FEATURE }, code)
    }
    if (!bucket) throw refuse(403, 'not_entitled')
    if (bucket.available <= 0) throw refuse(402, 'insufficient_credits')
  }

  /**
   * Débite le coût que porte la réponse, avec la clé de l'appel ; rend les crédits débités. Ne lève
   * jamais : la réponse est déjà rendue. Une panne se réessaie avec la même clé (un débit déjà écrit
   * revient en rejeu, sans second débit) ; un refus ne se réessaie pas.
   */
  async function debit(operation: AiOperation, body: unknown, key: string): Promise<{ costCad: number | null; charged: number | null }> {
    const costCad = aiCostCad(body)
    if (costCad === null || rate === null) return { costCad, charged: null }
    const credits = creditsForCost(costCad, rate)
    if (credits === 0) return { costCad, charged: 0 }
    let lastError: unknown = null
    for (let attempt = 0; attempt < DEBIT_ATTEMPTS; attempt++) {
      try {
        const res = await client.call<{ consumed?: number }>('/api/v2/billing/consume', {
          method: 'POST',
          headers: billingHeaders,
          body: { feature_key: AI_FEATURE, quantity: credits, idempotency_key: key, metadata: debitMetadata(operation, body, costCad) },
          timeoutMs: 20_000,
        })
        return { costCad, charged: typeof res.consumed === 'number' ? res.consumed : credits }
      } catch (e) {
        lastError = e
        if (e instanceof ApiError && e.status > 0 && e.status < 500 && e.status !== 429) break
      }
    }
    debitErrorListeners.forEach((fn) => {
      try {
        fn(lastError, { operation, idempotencyKey: key, credits })
      } catch {
        /* un journal en panne ne bloque rien */
      }
    })
    return { costCad, charged: null }
  }

  async function ask<T = unknown>(operation: AiOperation, body: AskBody, opts: { scope?: string; timeoutMs?: number; signal?: AbortSignal } = {}): Promise<AskResult<T>> {
    // Rien ne part vers l'IA sans l'accord de la personne (une fois, au premier usage).
    await requireAiConsent()
    const timeoutMs = opts.timeoutMs ?? 180_000
    // Une clé par appel : un nouvel essai est un nouvel appel, débité à nouveau.
    const key = idempotencyKey(operation, opts.scope ?? 'app')
    if (billing) await ensureCredits()
    let env: AskEnvelope
    try {
      env = await client.call<AskEnvelope>('/api/v4/assistant/ask', { method: 'POST', body, timeoutMs, signal: opts.signal })
    } catch (e) {
      usageListeners.forEach((fn) => fn({ operation, model: null, usage: null, ok: false }))
      // L'assistant a échoué : son coût, s'il en rend un, est quand même dû.
      if (billing && e instanceof ApiError) {
        const cost = await debit(operation, e.detail, key)
        emitAiCost({ operation, ...cost })
        emitSettled()
      }
      throw e
    }
    const r = env.results ?? {}
    if (env.success === false || r.error) {
      usageListeners.forEach((fn) => fn({ operation, model: r.model ?? null, usage: null, ok: false }))
      if (billing) {
        const cost = await debit(operation, env, key)
        emitAiCost({ operation, ...cost })
        emitSettled()
      }
      const code = typeof r.error === 'string' ? r.error : 'ai_error'
      throw new ApiError(code === 'JSON_PARSE_ERROR' ? messages().common.errors.aiUnreadable : messages().common.errors.aiFailed, 502, env, code)
    }
    // Facturation éteinte : rien n'est débité, mais le coût réel reste connu (l'aperçu peut le dire).
    const cost = billing ? await debit(operation, env, key) : { costCad: aiCostCad(env), charged: null }
    emitAiCost({ operation, ...cost })
    if (billing) emitSettled()
    const usage = (r.usage_normalized ?? env.usage_normalized ?? null) as Record<string, unknown> | null
    usageListeners.forEach((fn) => fn({ operation, model: r.model ?? null, usage, ok: true, credits: cost.charged }))
    let json = (r.parsed_json ?? null) as T | null
    if (!json && body.json_schema && r.assistant_response) {
      try {
        json = JSON.parse(r.assistant_response.replace(/^```(?:json)?\s*|\s*```$/g, '')) as T
      } catch {
        json = null
      }
    }
    return { text: r.assistant_response ?? '', json, model: r.model ?? null, usage, charged: cost.charged }
  }

  return {
    ask,

    /** Jeton éphémère Gemini Live (voix temps réel, ~15 min, usage unique). */
    async liveSession(): Promise<{ sessionId: string; model: string; accessToken: string }> {
      await requireAiConsent()
      const res = await client.call<{ sessionId?: string; model?: string; accessToken?: string }>('/api/v1/ai/live/session', {
        method: 'POST',
        body: {},
        timeoutMs: 20_000,
      })
      if (!res.accessToken || !res.model) throw new ApiError("L'assistant vocal n'est pas disponible", 502, res)
      return { sessionId: res.sessionId ?? '', model: res.model, accessToken: res.accessToken }
    },

    /** À appeler à la fin de chaque session Live : `usageMetadata` du dernier message, tel quel. */
    async liveUsage(sessionId: string, model: string, usageMetadata: unknown): Promise<void> {
      await client
        .call('/api/v1/ai/live/usage', { method: 'POST', body: { sessionId: sessionId || undefined, model, usageMetadata }, timeoutMs: 15_000 })
        .catch(() => undefined)
    },

    /**
     * Une image générée à partir d'un texte et d'images de référence (spec §2.7.1 : réponse en liste,
     * `results[0].imageURL`), par OpenAI au niveau moyen. Le guide ne liste encore que Google pour les
     * images : si la passerelle refuse OpenAI (400 ou 422, aucune image rendue), Google la refait une
     * fois, pour que l'illustration ne casse pas.
     */
    async generateImage(prompt: string, referenceImages: string[], size = { width: 1024, height: 1024 }): Promise<string> {
      await requireAiConsent()
      type Out = { success?: boolean; error?: unknown; message?: string; results?: Array<{ imageURL?: string; url?: string }> }
      const once = async (provider: ImageProvider) => {
        const res = await client.call<Out[] | Out>('/api/v2/ai/generate/image', {
          method: 'POST',
          body: { prompt, provider, level: IMAGE_MODEL.level, width: size.width, height: size.height, quantity: 1, ...(referenceImages.length ? { referenceImages } : {}) },
          timeoutMs: 180_000,
        })
        const first = Array.isArray(res) ? res[0] : res
        const url = first?.results?.[0]?.imageURL ?? first?.results?.[0]?.url
        if (!url) {
          const why = typeof first?.error === 'string' ? first.error : (first?.error as { message?: string } | undefined)?.message ?? first?.message
          throw new ApiError(why ? messages().common.errors.imageRefused(why) : messages().common.errors.imageNone, 422, res, 'no_image')
        }
        return url
      }
      try {
        return await once(IMAGE_MODEL.provider)
      } catch (e) {
        if (e instanceof ApiError && (e.status === 400 || e.status === 422) && IMAGE_MODEL.provider !== IMAGE_FALLBACK) return once(IMAGE_FALLBACK)
        throw e
      }
    },
  }
}

export type AiApi = ReturnType<typeof aiApi>

/** Les images générées (illustrations) : OpenAI, niveau moyen ; Google si la passerelle refuse OpenAI. */
export const IMAGE_MODEL: { provider: ImageProvider; level: 'low' | 'mid' | 'high' } = { provider: 'openai', level: 'mid' }
const IMAGE_FALLBACK: ImageProvider = 'google'
type ImageProvider = 'openai' | 'google'
