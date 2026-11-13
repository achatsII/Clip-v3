/**
 * IA : l'assistant (AskAI v4), la synthèse vocale, la voix temps réel, la génération d'images.
 *
 * Chaque appel à l'assistant nomme son opération (`AiOperation`). Facturation v2 allumée, l'appel
 * part sur `/api/v2/ai/ask` et la plateforme débite le prix de l'opération ; éteinte, il part sur
 * `/api/v4/assistant/ask`, à l'identique. Aucun repli d'une route vers l'autre.
 */
import { requireAiConsent } from '../ai/consent'
import { emitRefusal, emitSettled, refusalFrom } from '../billing/bus'
import { BILLING_V2, PRODUCT_SLUG } from '../config'
import { ApiError, GatewayClient } from './client'
import { messages } from '@/lib/i18n'

/** Les opérations d'IA de CLIP, une par usage (copie de `ai_operations` du manifeste). */
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
}

interface AskEnvelope {
  success?: boolean
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

export type AiUsageListener = (event: { operation: AiOperation; model: string | null; usage: Record<string, unknown> | null; ok: boolean }) => void
const usageListeners = new Set<AiUsageListener>()
export function onAiUsage(fn: AiUsageListener) {
  usageListeners.add(fn)
  return () => usageListeners.delete(fn)
}

export function aiApi(client: GatewayClient, options: { billing?: boolean } = {}) {
  const billing = options.billing ?? BILLING_V2
  async function ask<T = unknown>(operation: AiOperation, body: AskBody, opts: { scope?: string; timeoutMs?: number; signal?: AbortSignal } = {}): Promise<AskResult<T>> {
    // Rien ne part vers l'IA sans l'accord de la personne (une fois, au premier usage).
    await requireAiConsent()
    const timeoutMs = opts.timeoutMs ?? 180_000
    let env: AskEnvelope
    try {
      // Facturation allumée : seulement la route mesurée, jamais de repli vers une route non débitée.
      env = billing
        ? await client.call<AskEnvelope>('/api/v2/ai/ask', {
            method: 'POST',
            headers: { 'X-Product': PRODUCT_SLUG },
            body: { ...body, operation, idempotency_key: idempotencyKey(operation, opts.scope ?? 'app') },
            timeoutMs,
            signal: opts.signal,
          })
        : await client.call<AskEnvelope>('/api/v4/assistant/ask', { method: 'POST', body, timeoutMs, signal: opts.signal })
    } catch (e) {
      usageListeners.forEach((fn) => fn({ operation, model: null, usage: null, ok: false }))
      if (billing && e instanceof ApiError) {
        const refusal = refusalFrom(e.status, e.detail)
        if (refusal) {
          emitRefusal(refusal)
          emitSettled()
          throw new ApiError(refusal.code === 'insufficient_credits' ? messages().common.errors.aiNoCredits : messages().common.errors.aiNotInPlan, e.status, e.detail, refusal.code)
        }
        if (e.status === 502) {
          emitSettled()
          throw new ApiError(messages().common.errors.aiUnavailable, 502, e.detail, 'ai_unavailable')
        }
      }
      throw e
    }
    if (billing) emitSettled()
    const r = env.results ?? {}
    if (env.success === false || r.error) {
      usageListeners.forEach((fn) => fn({ operation, model: r.model ?? null, usage: null, ok: false }))
      const code = typeof r.error === 'string' ? r.error : 'ai_error'
      throw new ApiError(code === 'JSON_PARSE_ERROR' ? messages().common.errors.aiUnreadable : messages().common.errors.aiFailed, 502, env, code)
    }
    const usage = (r.usage_normalized ?? env.usage_normalized ?? null) as Record<string, unknown> | null
    usageListeners.forEach((fn) => fn({ operation, model: r.model ?? null, usage, ok: true }))
    let json = (r.parsed_json ?? null) as T | null
    if (!json && body.json_schema && r.assistant_response) {
      try {
        json = JSON.parse(r.assistant_response.replace(/^```(?:json)?\s*|\s*```$/g, '')) as T
      } catch {
        json = null
      }
    }
    return { text: r.assistant_response ?? '', json, model: r.model ?? null, usage }
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
