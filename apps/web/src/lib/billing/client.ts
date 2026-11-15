/**
 * Client de facturation v2 (gabarit du skill billing, adapté à CLIP) : état du compte, droit à
 * une fonction, plans, paiement et portail Stripe. L'IA passe par `aiApi.ask`, qui débite chaque
 * réponse de son coût réel, après (`/api/v2/billing/consume`). Rien ici ne décide d'un accès : la
 * plateforme fait foi.
 *
 * check() ne lève jamais de refus : il répond 200 avec { allowed, reason }. Un refus porte un code
 * stable (402 insufficient_credits, 403 not_entitled…) : on teste le code, jamais le message.
 */
import { messages } from '@/lib/i18n'
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

/**
 * Sur iOS et Android : l'achat dans le magasin est-il permis à cette organisation. On n'achète que
 * si `allowed` ; sinon une phrase selon `reason`, sans lien ni prix d'un paiement hors du magasin.
 * `team_organization` : plusieurs membres (un abonnement du magasin est à une personne) ;
 * `managed_elsewhere` : un abonnement payant vit ailleurs (`managed_in`) ; `not_sold_in_app` : rien
 * à acheter ici ; `org_unresolved` : l'organisation ne peut pas recevoir l'achat.
 */
export type StorePurchase = {
  allowed: boolean
  reason: 'not_sold_in_app' | 'org_unresolved' | 'managed_elsewhere' | 'team_organization' | null
  managed_in: 'web' | 'ios' | 'android' | null
}

export type PlansOffer = { product: string; channel: string; currency: string; plans: PublicPlan[]; store_purchase?: StorePurchase }

export type CheckResult = { allowed: boolean; feature_key: string; reason: string | null; upgrade_hint?: { plan_code: string | null; addon_code: string | null } | null }

export class BillingError extends Error {
  readonly status: number
  readonly code: string | null
  readonly body: Record<string, unknown> | null
  /** Sur 429 et 503 : dans combien de secondes réessayer (en-tête Retry-After) ; null sinon. */
  readonly retryAfterSeconds: number | null
  constructor(status: number, code: string | null, body: Record<string, unknown> | null, message: string, retryAfterSeconds: number | null = null) {
    super(message)
    this.name = 'BillingError'
    this.status = status
    this.code = code
    this.body = body
    this.retryAfterSeconds = retryAfterSeconds
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
  /** Le canal de vente : le web paie par Stripe, l'app mobile par le magasin. Une fonction : lu à chaque appel. */
  channel?: 'web' | 'ios' | 'android' | (() => 'web' | 'ios' | 'android')
  getToken?: () => string | null
  refresh?: () => Promise<boolean>
  fetch?: typeof fetch
}

export function createBillingClient(config: BillingClientConfig = {}) {
  const base = (config.gatewayUrl ?? GATEWAY_URL).replace(/\/+$/, '')
  const product = config.product ?? PRODUCT_SLUG
  const channel = () => (typeof config.channel === 'function' ? config.channel() : config.channel ?? 'web')
  const getToken = config.getToken ?? getAccessToken
  const refresh = config.refresh ?? refreshSession
  // fetch se relit à chaque appel (une app qui le remplace après coup passe par le sien).
  const doFetch: typeof fetch = (input, init) => (config.fetch ?? globalThis.fetch)(input, init)

  async function call<T>(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>, retried = false): Promise<T> {
    const token = getToken()
    if (!token) throw new BillingError(401, 'unauthenticated', null, messages().billing.errors.signedOut)
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
      const retry = Number(res.headers.get('retry-after'))
      throw new BillingError(res.status, code, problem, typeof problem?.detail === 'string' ? problem.detail : messages().billing.errors.status(res.status), Number.isFinite(retry) && retry > 0 ? retry : null)
    }
    return parsed as T
  }

  return {
    context: () => call<BillingState>('GET', '/api/v2/billing/context'),
    check: (featureKey: string, options: { quantity?: number; intent?: 'use' | 'add' } = {}) => call<CheckResult>('POST', '/api/v2/billing/check', { feature_key: featureKey, ...options }),
    plans: () => call<PlansOffer>('GET', `/api/v2/billing/plans?channel=${channel()}`),
    /**
     * Après un achat ou une restauration dans le magasin : la plateforme relit l'achat chez
     * RevenueCat et rend l'état à jour, sans attendre le webhook. Corps vide : le client ne déclare
     * jamais un achat. 429 rate_limited (retryAfterSeconds), 503 store_unavailable (le webhook
     * prendra le relais), 409 org_unresolved (l'organisation ne peut pas recevoir l'achat).
     */
    mobileSync: () => call<BillingState>('POST', '/api/v2/billing/mobile/sync'),
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
