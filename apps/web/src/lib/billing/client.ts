/**
 * Client de facturation v2 (gabarit du skill billing, adapté à CLIP) : état du compte, droit à
 * une fonction, plans, paiement et portail Stripe. Les opérations d'IA passent par `aiApi.ask`
 * (route mesurée `/api/v2/ai/ask`). Rien ici ne décide d'un accès : la plateforme fait foi.
 *
 * check() ne lève jamais de refus : il répond 200 avec { allowed, reason }. Un refus porte un code
 * stable (402 insufficient_credits, 403 not_entitled…) : on teste le code, jamais le message.
 */
import { GATEWAY_URL, PRODUCT_SLUG } from '../config'
import { getAccessToken, refreshSession } from '../gateway/client'
import { emitRefusal, refusalFrom } from './bus'

export type CreditBucket = {
  feature_key: string
  unit: string
  unit_scale: number
  balance: number
  available: number
  granted: number
  consumed: number
  reserved: number
  period_end: string | null
  overage_policy?: string
}

export type BillingState = {
  product: string
  state: string
  plan_code: string | null
  plan_version: number | null
  features: Record<string, boolean>
  limits: { feature_key: string; used: number; limit: number | null }[]
  credits: CreditBucket[]
  currency: string | null
  current_period_end: string | null
  grace_until: string | null
  cancel_at_period_end: boolean
  channel: 'web' | 'ios' | 'android' | 'none'
}

export type PlanPrice = { interval: 'monthly' | 'yearly' | 'one_time'; currency: string; amount_cents: number; tax_behavior?: string; store_product_id?: string }

export type PublicPlan = {
  code: string
  name: string
  kind: 'base' | 'addon'
  version?: number
  is_current?: boolean
  trial_days?: number | null
  prices: PlanPrice[]
  entitlements: {
    features?: Record<string, boolean>
    limits?: Record<string, number | null>
    credits?: { feature_key: string; amount: number; period: string; unit: string }[]
  }
}

export type PlansOffer = { product: string; channel: string; currency: string; plans: PublicPlan[] }

export type CheckResult = { allowed: boolean; feature_key: string; reason: string | null; upgrade_hint?: { plan_code: string | null; addon_code: string | null } | null }

export class BillingError extends Error {
  readonly status: number
  readonly code: string | null
  readonly body: Record<string, unknown> | null
  constructor(status: number, code: string | null, body: Record<string, unknown> | null, message: string) {
    super(message)
    this.name = 'BillingError'
    this.status = status
    this.code = code
    this.body = body
  }
  get reason(): string | null {
    return typeof this.body?.reason === 'string' ? this.body.reason : null
  }
  get manageUrl(): string | null {
    return typeof this.body?.manage_url === 'string' ? this.body.manage_url : null
  }
}

export function operationKey(prefix: string, businessId?: string): string {
  if (businessId) return `${prefix}:${businessId}`
  const random = typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
  return `${prefix}:${random}`
}

export function creditsOf(state: BillingState | null, featureKey: string): CreditBucket | null {
  return state?.credits.find((c) => c.feature_key === featureKey) ?? null
}

export type LimitStatus = { limit: number | null; used: number; remaining: number | null; reached: boolean }

/** Une limite du plan ; `null` tant que l'état n'est pas lu. Absente de l'état = 0 (« non »). */
export function limitOf(state: BillingState | null, featureKey: string, used?: number): LimitStatus | null {
  if (state === null) return null
  const item = state.limits.find((l) => l.feature_key === featureKey)
  const limit = item ? item.limit : 0
  const taken = used ?? item?.used ?? 0
  const remaining = limit === null ? null : Math.max(0, limit - taken)
  return { limit, used: taken, remaining, reached: remaining !== null && remaining <= 0 }
}

export function hasFeature(state: BillingState | null, featureKey: string): boolean {
  return state === null || state.features[featureKey] === true
}

export interface BillingClientConfig {
  gatewayUrl?: string
  product?: string
  channel?: 'web' | 'ios' | 'android'
  getToken?: () => string | null
  refresh?: () => Promise<boolean>
  fetch?: typeof fetch
}

export function createBillingClient(config: BillingClientConfig = {}) {
  const base = (config.gatewayUrl ?? GATEWAY_URL).replace(/\/+$/, '')
  const product = config.product ?? PRODUCT_SLUG
  const channel = config.channel ?? 'web'
  const getToken = config.getToken ?? getAccessToken
  const refresh = config.refresh ?? refreshSession
  // fetch se relit à chaque appel (une app qui le remplace après coup passe par le sien).
  const doFetch: typeof fetch = (input, init) => (config.fetch ?? globalThis.fetch)(input, init)

  async function call<T>(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>, retried = false): Promise<T> {
    const token = getToken()
    if (!token) throw new BillingError(401, 'unauthenticated', null, 'Aucun utilisateur connecté')
    const res = await doFetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'X-Product': product, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401 && !retried && (await refresh())) return call<T>(method, path, body, true)
    const text = await res.text()
    let parsed: unknown = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = text
    }
    if (!res.ok) {
      const problem = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
      const code = typeof problem?.code === 'string' ? problem.code : null
      const refusal = refusalFrom(res.status, problem)
      if (refusal) emitRefusal(refusal)
      throw new BillingError(res.status, code, problem, typeof problem?.detail === 'string' ? problem.detail : `Erreur ${res.status}`)
    }
    return parsed as T
  }

  return {
    context: () => call<BillingState>('GET', '/api/v2/billing/context'),
    check: (featureKey: string, options: { quantity?: number; intent?: 'use' | 'add' } = {}) => call<CheckResult>('POST', '/api/v2/billing/check', { feature_key: featureKey, ...options }),
    plans: () => call<PlansOffer>('GET', `/api/v2/billing/plans?channel=${channel}`),
    async checkout(planCode: string, interval: 'monthly' | 'yearly', urls: { success: string; cancel: string }, key = operationKey(`paiement:${planCode}:${interval}`)): Promise<string> {
      const data = await call<{ checkout_url: string }>('POST', '/api/v2/billing/checkout', { plan_code: planCode, interval, success_url: urls.success, cancel_url: urls.cancel, idempotency_key: key })
      return data.checkout_url
    },
    async portal(returnUrl: string): Promise<string> {
      return (await call<{ portal_url: string }>('POST', '/api/v2/billing/portal', { return_url: returnUrl })).portal_url
    },
  }
}

export type BillingClient = ReturnType<typeof createBillingClient>
