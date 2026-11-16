/**
 * Ce que la fenêtre des refus conseille et dit. Fonctions pures, testées : un plan conseillé qui
 * n'apporte rien, ou un solde annoncé à tort, serait « un message de limite faux ».
 */
import { messages } from '@/lib/i18n'
import { formatDate } from '../util/cn'
import { addonFor, byQuote, type ModuleDef } from './catalog'
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
 * Le plan à conseiller : jamais le plan actuel, seulement un plan qui donne vraiment plus (plus de
 * crédits, une limite plus haute, la fonction). D'abord le moins cher des plans en vente ; s'il n'y en
 * a pas, le plan sur devis qui le donne (Usine : « Parler à l'équipe CLIP »). Le plan que la plateforme
 * désigne dans son refus passe d'abord. Aucun : `null` (la fenêtre le dit).
 */
export function planFor(plans: PublicPlan[], state: BillingState | null, feature?: string, hint?: string | null): PublicPlan | null {
  const currentCode = state?.plan_code ?? plans.find((p) => p.is_current)?.code ?? null
  const current = plans.find((p) => p.code === currentCode) ?? null
  const others = plans.filter((p) => p.kind === 'base' && p.code !== currentCode)
  const forSale = others.filter((p) => p.prices.length > 0).sort((a, b) => monthlyCents(a) - monthlyCents(b))
  const quoted = others.filter((p) => byQuote(p))
  if (hint) {
    const hinted = forSale.find((p) => p.code === hint) ?? quoted.find((p) => p.code === hint)
    if (hinted) return hinted
  }
  const now = feature ? (current ? amountOf(current, feature) : amountNow(state, feature)) : current ? monthlyCents(current) : 0
  const onSale = forSale.find((p) => (feature ? amountOf(p, feature) : monthlyCents(p)) > now)
  if (onSale) return onSale
  // Sans fonction précise, un plan sur devis donne plus que tout plan en vente (toute l'usine).
  return quoted.find((p) => !feature || amountOf(p, feature) > now) ?? null
}

/**
 * Ce qui ouvre un module : son add-on, si le plan de l'usine le reçoit (en vente ou sur devis) ;
 * sinon le moins cher des plans qui le reçoivent, un plan sur devis en dernier (« l'Académie s'ajoute
 * à Usine »). Le module que la plateforme désigne dans son refus (`upgrade_hint.addon_code`) passe
 * d'abord.
 */
export function moduleOffer(plans: PublicPlan[], state: BillingState | null, m: ModuleDef, hint?: string | null): { addon: PublicPlan | null; plan: PublicPlan | null } {
  const currentCode = state?.plan_code ?? plans.find((p) => p.is_current && p.kind === 'base')?.code ?? null
  const offered = (code: string | null | undefined) => (code ? (plans.find((p) => p.kind === 'addon' && p.code === code && (p.prices.length > 0 || byQuote(p))) ?? null) : null)
  const code = addonFor(m, currentCode)
  if (code) return { addon: (hint && Object.values(m.addons).includes(hint) ? offered(hint) : null) ?? offered(code), plan: null }
  const eligible = plans
    .filter((p) => p.kind === 'base' && (p.prices.length > 0 || byQuote(p)) && p.code !== currentCode && m.addons[p.code])
    .sort((a, b) => Number(byQuote(a)) - Number(byQuote(b)) || monthlyCents(a) - monthlyCents(b))
  return { addon: null, plan: eligible[0] ?? null }
}

/** Pourquoi la fenêtre des crédits s'ouvre : un refus réel de la plateforme, ou le solde du mois. */
export function creditsReason(c: CreditBucket | null, refused: boolean): string {
  const t = messages().billing.balance
  if (!c) return refused ? t.refused : t.monthly
  const left = Math.max(0, Math.round(c.available))
  const until = c.period_end ? formatDate(c.period_end) : null
  if (left === 0) return t.exhausted(until, refused)
  return refused ? t.notEnough(left) : t.left(left, until)
}

/** Aucun plan ne donne plus de crédits : on dit quand ils reviennent. */
export function renewalText(c: CreditBucket | null): string {
  return messages().billing.balance.renewal(c?.period_end ? formatDate(c.period_end) : null)
}
