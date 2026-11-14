/**
 * L'intention d'achat venue du site public : `/connexion?inscription=1&plan=equipe&interval=year`.
 *
 * - Le forfait doit être un forfait de base payant du manifeste, l'intervalle `month` ou `year` ; tout
 *   le reste est ignoré. La liste vient de la copie du manifeste (`PREVIEW_PLANS`), que
 *   `tests/billing-preview.test.ts` compare au manifeste et `tests/plan-intent.test.ts` aussi.
 * - Elle se garde le temps de l'inscription dans `sessionStorage` (`clip.plan_intent`) : après
 *   `/bienvenue`, et seulement si la facturation est réelle (`NEXT_PUBLIC_BILLING_V2`), la page
 *   Abonnement s'ouvre avec ce forfait présélectionné. Elle s'efface une fois servie.
 */
import { PREVIEW_PLANS } from './preview'

export type PlanInterval = 'month' | 'year'

export interface PlanIntent {
  plan: string
  interval: PlanInterval
}

export const PLAN_INTENT_KEY = 'clip.plan_intent'

/** L'intervalle tel que la plateforme le nomme (`checkout`). */
export const BILLING_INTERVAL: Record<PlanInterval, 'monthly' | 'yearly'> = { month: 'monthly', year: 'yearly' }

/** Les forfaits qu'on peut choisir en s'inscrivant : les forfaits de base qui ont un prix. */
export const SELLABLE_PLANS: readonly string[] = PREVIEW_PLANS.filter((p) => p.kind === 'base' && p.prices.length > 0).map((p) => p.code)

/** L'intention lue dans une adresse ; null si le forfait ou l'intervalle n'est pas connu. */
export function parsePlanIntent(search: string | URLSearchParams, plans: readonly string[] = SELLABLE_PLANS): PlanIntent | null {
  const q = typeof search === 'string' ? new URLSearchParams(search) : search
  const plan = (q.get('plan') ?? '').trim()
  const interval = (q.get('interval') ?? '').trim()
  if (!plans.includes(plan)) return null
  if (interval !== 'month' && interval !== 'year') return null
  return { plan, interval }
}

function session(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}

export function savePlanIntent(intent: PlanIntent): void {
  try {
    session()?.setItem(PLAN_INTENT_KEY, JSON.stringify(intent))
  } catch {
    /* stockage indisponible : l'inscription se fait sans forfait présélectionné */
  }
}

/** L'intention gardée, revalidée (une valeur trafiquée ou périmée vaut « aucune »). */
export function readPlanIntent(): PlanIntent | null {
  try {
    const raw = session()?.getItem(PLAN_INTENT_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<PlanIntent> | null
    return parsePlanIntent(new URLSearchParams({ plan: String(v?.plan ?? ''), interval: String(v?.interval ?? '') }))
  } catch {
    return null
  }
}

export function clearPlanIntent(): void {
  try {
    session()?.removeItem(PLAN_INTENT_KEY)
  } catch {
    /* rien à effacer */
  }
}

/** La page Abonnement, le forfait présélectionné. */
export const subscriptionPathFor = (intent: PlanIntent) => `/reglages/abonnement?${new URLSearchParams({ plan: intent.plan, interval: intent.interval }).toString()}`
