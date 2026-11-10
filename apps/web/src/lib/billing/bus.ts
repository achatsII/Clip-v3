/**
 * Les refus de facturation et les opérations d'IA terminées, d'où qu'ils viennent (le client de
 * facturation ou l'appel d'IA mesuré) : la fenêtre des refus et le solde s'y abonnent.
 */
export interface Refusal {
  status: number
  code: string
  reason: string | null
  featureKey: string | null
  upgradePlan: string | null
}

const REFUSAL_CODES = new Set(['insufficient_credits', 'capacity_exceeded', 'not_entitled', 'subscription_inactive', 'subscription_suspended'])

const refusalListeners = new Set<(r: Refusal) => void>()
const settledListeners = new Set<() => void>()

export function onRefusal(fn: (r: Refusal) => void) {
  refusalListeners.add(fn)
  return () => {
    refusalListeners.delete(fn)
  }
}

export function onSettled(fn: () => void) {
  settledListeners.add(fn)
  return () => {
    settledListeners.delete(fn)
  }
}

export function emitSettled() {
  settledListeners.forEach((fn) => {
    try {
      fn()
    } catch {
      /* un écouteur en panne ne bloque rien */
    }
  })
}

/** Rend le refus lisible si le corps d'erreur en est un (on lit `code`, jamais le message). */
export function refusalFrom(status: number, body: unknown): Refusal | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const code = typeof b.code === 'string' ? b.code : null
  if (!code || !REFUSAL_CODES.has(code)) return null
  const hint = b.upgrade_hint as { plan_code?: unknown } | null | undefined
  return {
    status,
    code,
    reason: typeof b.reason === 'string' ? b.reason : null,
    featureKey: typeof b.feature_key === 'string' ? b.feature_key : null,
    upgradePlan: typeof hint?.plan_code === 'string' ? hint.plan_code : null,
  }
}

export function emitRefusal(r: Refusal) {
  refusalListeners.forEach((fn) => {
    try {
      fn(r)
    } catch {
      /* idem */
    }
  })
}
