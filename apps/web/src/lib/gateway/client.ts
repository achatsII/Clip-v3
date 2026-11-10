/**
 * Client HTTP de la Gateway Octopus.
 *
 * Reprend le gabarit du skill api-plateforme-ii : un seul rafraîchissement sur 401 (garde
 * anti-récursion), un seul rafraîchissement en vol (garde anti-stampede), jetons en localStorage,
 * déconnexion qui garde les préférences d'affichage (`ui_theme`).
 */
import { APP_IDENTIFIER, GATEWAY_URL } from '../config'

export class ApiError extends Error {
  status: number
  detail: unknown
  code?: string
  constructor(message: string, status: number, detail?: unknown, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.code = code
  }
}

export type Expect = 'json' | 'blob' | 'text' | 'response'

export interface CallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  form?: FormData
  headers?: Record<string, string>
  expect?: Expect
  timeoutMs?: number
  signal?: AbortSignal
}

/** D'où viennent les jetons : la session de l'utilisateur, ou un lien public (jeton guest). */
export interface TokenSource {
  getToken(): string | null
  /** Tente UN rafraîchissement ; vrai si un nouveau jeton est disponible. */
  refresh(): Promise<boolean>
  /** Appelé quand la session est morte (refresh refusé). */
  onAuthFailure(): void
}

export interface GatewayClient {
  call<T = unknown>(endpoint: string, options?: CallOptions): Promise<T>
  source: TokenSource
}

function messageFrom(detail: unknown, status: number): { message: string; code?: string } {
  if (detail && typeof detail === 'object') {
    const d = detail as Record<string, unknown>
    const code = typeof d.code === 'string' ? d.code : undefined
    const err = d.error
    if (typeof err === 'string') return { message: err, code }
    if (err && typeof err === 'object' && typeof (err as Record<string, unknown>).message === 'string') {
      return { message: (err as Record<string, unknown>).message as string, code }
    }
    if (typeof d.message === 'string') return { message: d.message, code }
    if (typeof d.title === 'string') return { message: d.title, code }
  }
  if (typeof detail === 'string' && detail) return { message: detail }
  return { message: `Erreur ${status}` }
}

export function createGatewayClient(source: TokenSource): GatewayClient {
  async function call<T>(endpoint: string, options: CallOptions = {}, retried = false): Promise<T> {
    const { method = 'GET', body, form, headers = {}, expect = 'json', timeoutMs, signal } = options
    const token = source.getToken()
    if (!token) {
      source.onAuthFailure()
      throw new ApiError('Session expirée', 401)
    }
    const h: Record<string, string> = { Authorization: `Bearer ${token}`, ...headers }
    if (!form && body !== undefined) h['Content-Type'] = 'application/json'

    const controller = new AbortController()
    const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null
    if (signal) {
      if (signal.aborted) controller.abort()
      else signal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    let res: Response
    try {
      res = await fetch(endpoint.startsWith('http') ? endpoint : `${GATEWAY_URL}${endpoint}`, {
        method,
        headers: h,
        body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
        signal: controller.signal,
      })
    } catch (e) {
      if (controller.signal.aborted) {
        throw new ApiError(signal?.aborted ? 'Annulé' : 'Le serveur a mis trop de temps à répondre', 0, null, 'timeout')
      }
      throw new ApiError('Pas de connexion au serveur', 0, String(e), 'network')
    } finally {
      if (timer) clearTimeout(timer)
    }

    if (res.status === 401) {
      if (retried) {
        source.onAuthFailure()
        throw new ApiError('Session expirée', 401)
      }
      const ok = await source.refresh()
      if (!ok) {
        source.onAuthFailure()
        throw new ApiError('Session expirée', 401)
      }
      return call<T>(endpoint, options, true)
    }

    if (!res.ok) {
      let detail: unknown = null
      const text = await res.text().catch(() => '')
      try {
        detail = text ? JSON.parse(text) : null
      } catch {
        detail = text
      }
      const { message, code } = messageFrom(detail, res.status)
      throw new ApiError(message, res.status, detail, code)
    }

    if (expect === 'response') return res as unknown as T
    if (expect === 'blob') return (await res.blob()) as unknown as T
    if (expect === 'text') return (await res.text()) as unknown as T
    const text = await res.text()
    if (!text) return {} as T
    try {
      return JSON.parse(text) as T
    } catch {
      return text as unknown as T
    }
  }

  return { call: (endpoint, options) => call(endpoint, options), source }
}

/* ───────────────────────── Session de l'utilisateur ───────────────────────── */

const ACCESS = 'access_token'
const REFRESH = 'refresh_token'

function ls(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

let refreshInFlight: Promise<boolean> | null = null
const authListeners = new Set<() => void>()

export function onAuthChange(fn: () => void): () => void {
  authListeners.add(fn)
  return () => authListeners.delete(fn)
}
function emitAuth() {
  authListeners.forEach((fn) => {
    try {
      fn()
    } catch {
      /* un écouteur fautif ne casse pas les autres */
    }
  })
}

export function getAccessToken(): string | null {
  return ls()?.getItem(ACCESS) ?? null
}

export function hasSession(): boolean {
  return !!getAccessToken()
}

export function storeTokens(access: string, refresh?: string | null) {
  const s = ls()
  if (!s) return
  s.setItem(ACCESS, access)
  if (refresh) s.setItem(REFRESH, refresh)
  emitAuth()
}

async function refreshUserSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    try {
      const refreshToken = ls()?.getItem(REFRESH)
      if (!refreshToken) return false
      const res = await fetch(`${GATEWAY_URL}/api/v1/auth/token/refresh?app_identifier=${encodeURIComponent(APP_IDENTIFIER)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) return false
      const data = (await res.json()) as { access_token?: string; refresh_token?: string }
      if (!data.access_token) return false
      storeTokens(data.access_token, data.refresh_token)
      return true
    } catch {
      return false
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

/** Vide la session en gardant les préférences d'affichage. */
export function logout(redirect = true) {
  const s = ls()
  if (s) {
    const keep: Record<string, string> = {}
    for (const key of ['ui_theme', 'clip_install_id']) {
      const v = s.getItem(key)
      if (v) keep[key] = v
    }
    for (let i = s.length - 1; i >= 0; i--) {
      const k = s.key(i)
      if (k && !k.startsWith('clip_pref_')) s.removeItem(k)
    }
    Object.entries(keep).forEach(([k, v]) => s.setItem(k, v))
  }
  emitAuth()
  if (redirect && typeof window !== 'undefined') window.location.assign('/connexion')
}

const userSource: TokenSource = {
  getToken: getAccessToken,
  refresh: refreshUserSession,
  onAuthFailure: () => logout(true),
}

/** Le client de l'utilisateur connecté. */
export const gateway = createGatewayClient(userSource)

/** Appel d'une route publique (sans jeton). */
export async function publicCall<T>(endpoint: string, options: Omit<CallOptions, 'expect'> & { expect?: Expect } = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, expect = 'json' } = options
  let res: Response
  try {
    res = await fetch(`${GATEWAY_URL}${endpoint}`, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    throw new ApiError('Pas de connexion au serveur', 0, String(e), 'network')
  }
  const text = await res.text().catch(() => '')
  let detail: unknown = text
  try {
    detail = text ? JSON.parse(text) : null
  } catch {
    /* corps non JSON */
  }
  if (!res.ok) {
    const { message, code } = messageFrom(detail, res.status)
    throw new ApiError(message, res.status, detail, code)
  }
  if (expect === 'text') return text as unknown as T
  return (detail ?? {}) as T
}
