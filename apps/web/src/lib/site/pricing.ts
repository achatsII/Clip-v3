/**
 * Les forfaits du site, lus dans `billing.manifest.yaml` au build (au serveur ; les pages du site sont
 * statiques). Le manifeste est la seule source des prix, des forfaits, des quantités et du prix en
 * crédits de chaque opération d'IA : rien de tout cela n'est écrit dans le code du site.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parse } from 'yaml'
import { FEATURED_PLAN, MODULES, type FeatureKey } from '@/lib/billing/catalog'
import type { PlanInterval } from '@/lib/billing/intent'
import { SITE_LOCALE, type SiteLang } from './lang'

interface RawPrice {
  interval: 'monthly' | 'yearly'
  currency: string
  amount_cents: number
}

interface RawPlan {
  code: string
  kind: 'base' | 'addon'
  name: string
  status: string
  sort_order?: number
  trial_days?: number
  prices?: RawPrice[]
  entitlements: {
    features?: Record<string, boolean>
    limits?: Record<string, number | null>
    credits?: Array<{ feature: string; amount: number; period: string }>
  }
}

export interface RawManifest {
  product: { default_plan_code: string }
  features: Array<{ key: string; kind: string }>
  plans: RawPlan[]
  ai_operations: Array<{ key: string; credits: number }>
}

export const LIMIT_KEYS = ['published_instructions', 'stations', 'editors'] as const
export type LimitKey = (typeof LIMIT_KEYS)[number]

export interface SitePrice {
  interval: PlanInterval
  amountCents: number
  currency: string
}

export interface SitePlan {
  code: string
  /** Le nom au manifeste (le dictionnaire du site peut le traduire). */
  name: string
  featured: boolean
  paid: boolean
  prices: SitePrice[]
  /** La banque de crédits d'IA par mois. */
  credits: number
  /** null : illimité. */
  limits: Record<LimitKey, number | null>
  features: Partial<Record<FeatureKey, boolean>>
}

export interface SiteModule {
  code: string
  name: string
  feature: FeatureKey
  /** Le forfait de base auquel ce module s'ajoute : celui que l'app propose pour ce code (`MODULES`). */
  basePlan: string
  trialDays: number
  prices: SitePrice[]
}

export interface SiteCatalog {
  defaultPlan: string
  plans: SitePlan[]
  modules: SiteModule[]
  /** Le prix en crédits de chaque opération d'IA (`ai_operations`). */
  operations: Record<string, number>
  /** Le forfait annuel : combien de mois payés, combien offerts (annuel = 10 mois → 10 et 2). */
  paidMonths: number
  freeMonths: number
  /** Les jours d'essai des modules. */
  trialDays: number
}

const INTERVAL: Record<RawPrice['interval'], PlanInterval> = { monthly: 'month', yearly: 'year' }
const prices = (raw: RawPrice[] | undefined): SitePrice[] => (raw ?? []).map((p) => ({ interval: INTERVAL[p.interval], amountCents: p.amount_cents, currency: p.currency }))

/** Le catalogue du site, tiré d'un manifeste déjà lu (pur : les tests l'appellent directement). */
export function catalogFromManifest(m: RawManifest): SiteCatalog {
  const active = m.plans.filter((p) => p.status === 'active')
  const base = active.filter((p) => p.kind === 'base').sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const baseCodes = new Set(base.map((p) => p.code))
  const plans: SitePlan[] = base.map((p) => ({
    code: p.code,
    name: p.name,
    featured: p.code === FEATURED_PLAN,
    paid: (p.prices ?? []).length > 0,
    prices: prices(p.prices),
    credits: (p.entitlements.credits ?? []).filter((c) => c.feature === 'ai_credits').reduce((n, c) => n + c.amount, 0),
    limits: Object.fromEntries(LIMIT_KEYS.map((k) => [k, p.entitlements.limits?.[k] ?? null])) as Record<LimitKey, number | null>,
    features: (p.entitlements.features ?? {}) as Partial<Record<FeatureKey, boolean>>,
  }))
  const modules: SiteModule[] = active
    .filter((p) => p.kind === 'addon')
    .flatMap((p) => {
      const feature = Object.entries(p.entitlements.features ?? {}).find(([, on]) => on)?.[0] as FeatureKey | undefined
      // le forfait de base vient de la table de l'app (MODULES), pas du code : un code ne se découpe pas
      const basePlan = MODULES.flatMap((m) => Object.entries(m.addons)).find(([, code]) => code === p.code)?.[0] ?? ''
      if (!feature || !baseCodes.has(basePlan)) return []
      return [{ code: p.code, name: p.name, feature, basePlan, trialDays: p.trial_days ?? 0, prices: prices(p.prices) }]
    })
  // Annuel = N mois : le rapport annuel / mensuel du forfait mis en avant (le test vérifie qu'il vaut pour tous).
  const ref = plans.find((p) => p.featured && p.paid) ?? plans.find((p) => p.paid)
  const monthly = ref?.prices.find((x) => x.interval === 'month')?.amountCents ?? 0
  const yearly = ref?.prices.find((x) => x.interval === 'year')?.amountCents ?? 0
  const paidMonths = monthly > 0 ? Math.round(yearly / monthly) : 12
  return {
    defaultPlan: m.product.default_plan_code,
    plans,
    modules,
    operations: Object.fromEntries(m.ai_operations.map((o) => [o.key, o.credits])),
    paidMonths,
    freeMonths: Math.max(0, 12 - paidMonths),
    trialDays: Math.max(0, ...modules.map((x) => x.trialDays)),
  }
}

/** Le manifeste, cherché en remontant depuis le dossier du build (apps/web, puis la racine du dépôt). */
export function findManifest(start = process.cwd()): string {
  let dir = start
  for (let i = 0; i < 6; i++) {
    const file = join(dir, 'billing.manifest.yaml')
    if (existsSync(file)) return file
    const up = dirname(dir)
    if (up === dir) break
    dir = up
  }
  throw new Error('billing.manifest.yaml introuvable : le site lit ses forfaits dans le manifeste.')
}

let cached: SiteCatalog | null = null

/** Le catalogue, lu une fois par build. */
export function siteCatalog(): SiteCatalog {
  if (!cached) cached = catalogFromManifest(parse(readFileSync(findManifest(), 'utf8')) as RawManifest)
  return cached
}

/* ───────────────────────── Affichage ───────────────────────── */

/** Un prix dans la langue du site, le symbole après le montant en français et avant en anglais (les cents seulement s'il y en a). */
export function formatPrice(amountCents: number, currency: string, lang: SiteLang): string {
  const cents = amountCents % 100 !== 0
  return new Intl.NumberFormat(SITE_LOCALE[lang], { style: 'currency', currency, minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }).format(amountCents / 100)
}

/** Le prix d'un forfait pour un intervalle (null : gratuit ou sans ce prix). */
export const priceOf = (plan: { prices: SitePrice[] }, interval: PlanInterval) => plan.prices.find((p) => p.interval === interval) ?? null

/** Le prix d'une opération, ou l'écart de prix d'une famille (`generate_s`… `generate_l`). */
export function operationCredits(c: SiteCatalog, family: string): { min: number; max: number } | null {
  const values = Object.entries(c.operations)
    .filter(([key]) => key === family || key.startsWith(`${family}_`))
    .filter(([key]) => !(family === 'translate' && key === 'translate_image'))
    .map(([, v]) => v)
  return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null
}

/** Les forfaits de base qui donnent une feature, dans l'ordre de la page. */
export const plansWith = (c: SiteCatalog, feature: string) => c.plans.filter((p) => p.features[feature as FeatureKey] === true)
