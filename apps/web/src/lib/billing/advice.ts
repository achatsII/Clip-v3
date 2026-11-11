/**
 * Ce que la fenêtre des refus conseille et dit. Fonctions pures, testées : un plan conseillé qui
 * n'apporte rien, ou un solde annoncé à tort, serait « un message de limite faux ».
 */
import { formatDate } from '../util/cn'
import type { BillingState, CreditBucket, PublicPlan } from './client'

/** Ce qu'un plan donne pour une feature, en un nombre comparable : crédits, plafond (illimité = ∞) ou 1/0. */
export function amountOf(plan: PublicPlan, key: string): number {
  const e = plan.entitlements
  const credit = e.credits?.find((c) => c.feature_key === key)
  if (credit) return credit.amount
  if (e.limits && key in e.limits) {
    const v = e.limits[key]
    return v === null ? Infinity : (v ?? 0)
  }
  return e.features?.[key] ? 1 : 0
}

/** Ce que l'organisation a aujourd'hui pour cette feature, lu dans l'état (absente = 0). */
export function amountNow(state: BillingState | null, key: string): number {
  if (!state) return 0
  const credit = state.credits.find((c) => c.feature_key === key)
  if (credit) return credit.granted
  const limit = state.limits.find((l) => l.feature_key === key)
  if (limit) return limit.limit === null ? Infinity : limit.limit
  return state.features[key] ? 1 : 0
}

const monthlyCents = (p: PublicPlan) => p.prices.find((x) => x.interval === 'monthly')?.amount_cents ?? p.prices[0]?.amount_cents ?? 0

/**
 * Le plan à conseiller : jamais le plan actuel, seulement un plan en vente qui donne vraiment plus
 * (plus de crédits, une limite plus haute, la fonction), et le moins cher de ceux-là. Le plan que
 * la plateforme désigne dans son refus passe d'abord. Aucun : `null` (la fenêtre le dit).
 */
export function planFor(plans: PublicPlan[], state: BillingState | null, feature?: string, hint?: string | null): PublicPlan | null {
  const currentCode = state?.plan_code ?? plans.find((p) => p.is_current)?.code ?? null
  const current = plans.find((p) => p.code === currentCode) ?? null
  const forSale = plans.filter((p) => p.kind === 'base' && p.prices.length > 0 && p.code !== currentCode).sort((a, b) => monthlyCents(a) - monthlyCents(b))
  if (hint) {
    const hinted = forSale.find((p) => p.code === hint)
    if (hinted) return hinted
  }
  const now = feature ? (current ? amountOf(current, feature) : amountNow(state, feature)) : current ? monthlyCents(current) : 0
  return forSale.find((p) => (feature ? amountOf(p, feature) : monthlyCents(p)) > now) ?? null
}

const creditsText = (n: number) => `${n.toLocaleString('fr-CA')} crédit${n > 1 ? 's' : ''}`

/** Pourquoi la fenêtre des crédits s'ouvre : un refus réel de la plateforme, ou le solde du mois. */
export function creditsReason(c: CreditBucket | null, refused: boolean): string {
  if (!c) return refused ? 'Plus assez de crédits IA pour cette action. Rien n’a été débité.' : 'Vos crédits IA de ce mois-ci.'
  const left = Math.max(0, Math.round(c.available))
  const until = c.period_end ? ` jusqu’au ${formatDate(c.period_end)}` : ''
  if (left === 0) return `Vos crédits IA sont épuisés${until}.${refused ? ' Rien n’a été débité pour l’action refusée.' : ''}`
  return refused ? `Il vous reste ${creditsText(left)} : pas assez pour cette action. Rien n’a été débité.` : `Il vous reste ${creditsText(left)}${until}.`
}

/** Aucun plan ne donne plus de crédits : on dit quand ils reviennent. */
export function renewalText(c: CreditBucket | null): string {
  return `Aucun plan n’en donne davantage.${c?.period_end ? ` Vos crédits se renouvellent le ${formatDate(c.period_end)}.` : ''}`
}
