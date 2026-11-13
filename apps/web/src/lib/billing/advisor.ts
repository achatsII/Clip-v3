/**
 * Le conseiller d'achat (toggle `salesAdvisor`) : de temps en temps, l'offre qui sert vraiment
 * l'usine, tirée de son usage. Une seule à la fois ; une nouvelle au plus par semaine ; « Plus tard »
 * la range 30 jours, et une offre restée deux semaines sans réponse se range d'elle-même. Elle ne
 * paraît qu'à l'accueil : jamais au poste, ni pendant une capture ou une publication. Fonctions
 * pures, testées : une offre qui n'apporte rien, ou qui revient sans cesse, ferait fuir.
 */
import { moduleOffer, planFor } from './advice'
import { isLimitFeature, moduleOf, MODULES, type FeatureKey, type LimitFeature, type ModuleKey } from './catalog'
import type { BillingState, PublicPlan } from './client'
import { usageLevel } from './usage'

const DAY = 86400_000
/** Une nouvelle offre au plus par semaine. */
export const WEEK = 7 * DAY
/** « Plus tard » : un mois sans revoir cette offre. */
export const SNOOZE = 30 * DAY
/** Une offre montrée deux semaines sans réponse se range comme « Plus tard ». */
export const STALE = 14 * DAY
/** Une fonction fermée essayée autant de fois en 30 jours mérite qu'on la propose. */
export const TRIES = 2
/** L'usage, sur 30 jours, qui montre qu'un module servirait : des formations validées, des relevés faits. */
export const MODULE_EVIDENCE: Record<ModuleKey, number> = { academy: 10, records: 30 }

export type Offer =
  /** Une limite atteinte ou proche (80 %) : le plan qui en donne plus. */
  | { id: string; kind: 'limit'; feature: LimitFeature; used: number; limit: number; full: boolean; plan: string }
  /** Une fonction fermée essayée plusieurs fois : le plan, ou le module, qui l'ouvre. */
  | { id: string; kind: 'feature'; feature: FeatureKey; tries: number; plan: string | null; addon: string | null }
  /** Un module que l'usage appelle (le plan le reçoit) : 14 jours offerts. */
  | { id: string; kind: 'module'; module: ModuleKey; feature: FeatureKey; evidence: number; addon: string; trialDays: number }

export interface AdvisorInput {
  state: BillingState
  plans: PublicPlan[]
  /** Ce que l'app compte de ses limites (postes, rédacteurs, instructions publiées). */
  usage: Partial<Record<LimitFeature, { used: number; limit: number | null }>>
  /** Les essais d'une fonction fermée (horodatages en ms), par feature. */
  tries: Partial<Record<string, number[]>>
  /** L'usage qui montre qu'un module servirait, sur 30 jours ; absent ou null : inconnu. */
  evidence: Partial<Record<ModuleKey, number | null>>
  /** Les modules qu'on peut proposer ici : bâtis (toggle allumé) et vendus sur cet appareil (le web). */
  modules: readonly ModuleKey[]
  now: number
}

/** Les offres qui serviraient, de la plus pressante à la moins pressante ; chacune a de quoi s'acheter. */
export function candidates(x: AdvisorInput): Offer[] {
  const out: Offer[] = []
  const owned = (f: string) => x.state.features[f] === true
  const sellable = (key: ModuleKey) => x.modules.includes(key)

  // 1. Une limite atteinte, puis une limite proche : c'est la croissance qui bute.
  const limits = Object.entries(x.usage) as Array<[LimitFeature, { used: number; limit: number | null }]>
  for (const full of [true, false]) {
    for (const [feature, l] of limits) {
      // Un seul rédacteur sur Solo, un seul poste sur Gratuit : c'est le plan, pas la croissance.
      if (l.limit === null || l.used < 2 || usageLevel(l) !== (full ? 'full' : 'near')) continue
      const plan = planFor(x.plans, x.state, feature)
      if (plan) out.push({ id: `limit:${feature}`, kind: 'limit', feature, used: l.used, limit: l.limit, full, plan: plan.code })
    }
  }

  // 2. Une fonction fermée que la personne a essayée plusieurs fois ce mois-ci.
  const tried = Object.entries(x.tries)
    .map(([feature, times]) => [feature as FeatureKey, (times ?? []).filter((t) => x.now - t < SNOOZE).length] as const)
    .filter(([feature, n]) => n >= TRIES && !owned(feature) && !isLimitFeature(feature))
    .sort((a, b) => b[1] - a[1])
  for (const [feature, n] of tried) {
    const m = moduleOf(feature)
    if (m) {
      if (!sellable(m.key)) continue
      const o = moduleOffer(x.plans, x.state, m)
      if (o.addon || o.plan) out.push({ id: `feature:${feature}`, kind: 'feature', feature, tries: n, plan: o.plan?.code ?? null, addon: o.addon?.code ?? null })
      continue
    }
    const plan = planFor(x.plans, x.state, feature)
    if (plan) out.push({ id: `feature:${feature}`, kind: 'feature', feature, tries: n, plan: plan.code, addon: null })
  }

  // 3. Un module que l'usage appelle, si le plan le reçoit et que l'usine ne l'a pas.
  for (const m of MODULES) {
    const n = x.evidence[m.key]
    if (!sellable(m.key) || owned(m.feature) || n == null || n < MODULE_EVIDENCE[m.key]) continue
    const { addon } = moduleOffer(x.plans, x.state, m)
    if (addon) out.push({ id: `module:${m.key}`, kind: 'module', module: m.key, feature: m.feature, evidence: n, addon: addon.code, trialDays: addon.trial_days ?? 0 })
  }

  // Une même fonction n'a qu'une offre : la plus pressante.
  const seen = new Set<string>()
  return out.filter((o) => {
    const key = o.kind === 'limit' ? o.id : `f:${o.feature}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export interface AdvisorMemory {
  /** L'offre montrée : elle reste jusqu'à « Plus tard », jusqu'à ce qu'elle ne serve plus, ou deux semaines. */
  shown: { id: string; at: number } | null
  /** Quand une nouvelle offre a paru pour la dernière fois (une par semaine au plus). */
  lastNewAt: number | null
  /** Les offres rangées, jusqu'à quand. */
  snoozed: Record<string, number>
}

export const emptyMemory = (): AdvisorMemory => ({ shown: null, lastNewAt: null, snoozed: {} })

const keepFuture = (snoozed: Record<string, number>, now: number) => Object.fromEntries(Object.entries(snoozed).filter(([, until]) => until > now))

/** L'offre à montrer maintenant, et la mémoire qui suit (`fresh` : elle paraît pour la première fois). */
export function pickOffer(list: Offer[], memory: AdvisorMemory, now: number): { offer: Offer | null; memory: AdvisorMemory; fresh: boolean } {
  let m: AdvisorMemory = { ...memory, snoozed: keepFuture(memory.snoozed, now) }
  // Restée deux semaines sans réponse : elle se range comme « Plus tard ».
  if (m.shown && now - m.shown.at >= STALE) m = { ...m, snoozed: { ...m.snoozed, [m.shown.id]: now + SNOOZE }, shown: null }
  const open = list.filter((o) => !(m.snoozed[o.id] > now))
  const kept = m.shown ? open.find((o) => o.id === m.shown!.id) : undefined
  if (kept) return { offer: kept, memory: m, fresh: false }
  m = { ...m, shown: null }
  if (m.lastNewAt !== null && now - m.lastNewAt < WEEK) return { offer: null, memory: m, fresh: false }
  const next = open[0]
  if (!next) return { offer: null, memory: m, fresh: false }
  return { offer: next, memory: { ...m, shown: { id: next.id, at: now }, lastNewAt: now }, fresh: true }
}

/** « Plus tard » : l'offre se range un mois, et la semaine d'attente repart de maintenant. */
export function snooze(memory: AdvisorMemory, id: string, now: number): AdvisorMemory {
  return { shown: null, lastNewAt: now, snoozed: { ...keepFuture(memory.snoozed, now), [id]: now + SNOOZE } }
}

/** Un essai de plus d'une fonction fermée (on garde les dix derniers, sur 30 jours). */
export function addTry(tries: Partial<Record<string, number[]>>, feature: string, now: number): Partial<Record<string, number[]>> {
  const out: Partial<Record<string, number[]>> = {}
  for (const [k, v] of Object.entries(tries)) {
    const recent = (v ?? []).filter((t) => now - t < SNOOZE)
    if (recent.length) out[k] = recent
  }
  out[feature] = [...(out[feature] ?? []), now].slice(-10)
  return out
}
