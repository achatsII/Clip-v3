/**
 * IA : l'assistant (AskAI v4), la synthèse vocale, la voix temps réel, la génération d'images.
 *
 * Chaque appel à l'assistant nomme son opération (`AiOperation`). Facturation v2 allumée, l'appel
 * part sur `/api/v2/ai/ask` et la plateforme débite le prix de l'opération ; éteinte, il part sur
 * `/api/v4/assistant/ask`, à l'identique. Aucun repli d'une route vers l'autre.
 */
import { BILLING_V2, PRODUCT_SLUG } from '../config'
import { ApiError, GatewayClient } from './client'

/** Les opérations d'IA de CLIP, une par usage (copie de `ai_operations` du manifeste). */
export const AI_OPERATIONS = [
  'generate_s',
  'generate_m',
  'generate_l',
  'import_s',
  'import_l',
  'step_assist',
  'instruction_edit',
  'translate',
  'annotate',
  'illustrate',
  'ask_question',
  'standard_agent',
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

export function aiApi(client: GatewayClient) {
  async function ask<T = unknown>(operation: AiOperation, body: AskBody, opts: { scope?: string; timeoutMs?: number; signal?: AbortSignal } = {}): Promise<AskResult<T>> {
    const timeoutMs = opts.timeoutMs ?? 180_000
    let env: AskEnvelope
    try {
      env = BILLING_V2
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
      throw e
    }
    const r = env.results ?? {}
    if (env.success === false || r.error) {
      usageListeners.forEach((fn) => fn({ operation, model: r.model ?? null, usage: null, ok: false }))
      const code = typeof r.error === 'string' ? r.error : 'ai_error'
      throw new ApiError(code === 'JSON_PARSE_ERROR' ? "L'IA a rendu une réponse illisible. Réessayez." : "L'IA n'a pas pu répondre. Réessayez.", 502, env, code)
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

    /** Synthèse vocale (voix québécoise par défaut) ; rend l'URL publique du fichier audio. */
    async tts(text: string, opts: { pace?: 'slow' | 'normal' | 'medium_fast'; language?: string; gender?: 'female' | 'male' } = {}): Promise<string> {
      const res = await client.call<{ success?: boolean; audioURL?: string | null }>('/api/v1/ai/tts', {
        method: 'POST',
        body: {
          provider: 'gemini',
          gender: opts.gender ?? 'female',
          accent: opts.language && !/^fr|french/i.test(opts.language) ? undefined : 'qc',
          pace: opts.pace ?? 'normal',
          tone: 'neutral',
          responseMode: 'url',
          language: opts.language ?? 'auto',
          text,
        },
        timeoutMs: 60_000,
      })
      if (!res.success || !res.audioURL) throw new ApiError("La lecture à voix haute n'est pas disponible pour le moment", 502, res)
      return res.audioURL
    },

    /** Jeton éphémère Gemini Live (voix temps réel, ~15 min, usage unique). */
    async liveSession(): Promise<{ sessionId: string; model: string; accessToken: string }> {
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

    /** Génère une image (illustration) à partir d'un texte et d'images de référence. */
    async generateImage(prompt: string, referenceImages: string[], size = { width: 1024, height: 768 }): Promise<string> {
      const res = await client.call<Array<{ success?: boolean; results?: Array<{ imageURL?: string }> }> | { success?: boolean; results?: Array<{ imageURL?: string }> }>(
        '/api/v2/ai/generate/image',
        {
          method: 'POST',
          body: { prompt, provider: 'google', level: 'mid', width: size.width, height: size.height, quantity: 1, referenceImages },
          timeoutMs: 180_000,
        },
      )
      const first = Array.isArray(res) ? res[0] : res
      const url = first?.results?.[0]?.imageURL
      if (!url) throw new ApiError("L'illustration n'a pas pu être créée", 502, res)
      return url
    },
  }
}

export type AiApi = ReturnType<typeof aiApi>
