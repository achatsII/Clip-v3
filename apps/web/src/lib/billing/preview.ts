/**
 * L'aperçu de la facturation (toggle `billingPreview`, sur le web) : tant que le catalogue n'est pas
 * publié à la plateforme (drapeau `NEXT_PUBLIC_BILLING_V2` éteint), l'app montre quand même ses
 * plans, ses modules, ses cadenas, ses jauges et ses offres, tels qu'ils seront vendus.
 *
 * - Le catalogue vient d'une copie du manifeste (`PREVIEW_PLANS`) ; le test la compare au
 *   manifeste, plan par plan : un prix ou un droit qui change là change ici.
 * - La personne choisit, dans cet appareil, ce que l'usine aurait (un plan, des modules, un niveau de
 *   crédits) ; par défaut, Usine avec tous les modules : rien ne se ferme.
 * - Rien ne s'achète et rien n'est débité : « choisir » un plan ou « essayer » un module change
 *   seulement l'aperçu. L'IA garde sa route d'avant ; le serveur ne vérifie rien de plus.
 */
import { addonFor, MODULES, type FeatureKey, type ModuleKey } from './catalog'
import type { BillingClient, BillingState, CheckResult, PlansOffer, PublicPlan } from './client'

export const PREVIEW_BASE_PLANS = ['free', 'solo', 'equipe', 'usine'] as const
export type PreviewPlan = (typeof PREVIEW_BASE_PLANS)[number]
export const CREDIT_LEVELS = ['full', 'low', 'empty'] as const
export type CreditLevel = (typeof CREDIT_LEVELS)[number]

export interface PreviewSelection {
  plan: PreviewPlan
  modules: ModuleKey[]
  credits: CreditLevel
}

/** Par défaut, tout est ouvert : l'aperçu montre, il ne ferme rien à personne. */
export const DEFAULT_PREVIEW: PreviewSelection = { plan: 'usine', modules: ['academy', 'records'], credits: 'full' }

type Flags = Record<Exclude<FeatureKey, 'ai_credits' | 'published_instructions' | 'stations' | 'editors'>, boolean>
const NONE: Flags = { translations: false, adoption_stats: false, approvals: false, bulk_import: false, voice_assistant: false, brand_kit: false, full_export: false, shared_blocks: false, academy: false, records_plus: false }
const cad = (monthly: number, yearly: number): PublicPlan['prices'] => [
  { interval: 'monthly', currency: 'CAD', amount_cents: monthly },
  { interval: 'yearly', currency: 'CAD', amount_cents: yearly },
]
const base = (code: PreviewPlan, name: string, prices: PublicPlan['prices'], features: Partial<Flags>, limits: Record<string, number | null>, credits: number): PublicPlan => ({
  code,
  name,
  kind: 'base',
  version: 1,
  prices,
  entitlements: { features: { ...NONE, ...features }, limits, credits: [{ feature_key: 'ai_credits', amount: credits, period: 'monthly', unit: 'credit' }] },
})
const addon = (code: string, name: string, prices: PublicPlan['prices'], feature: 'academy' | 'records_plus'): PublicPlan => ({ code, name, kind: 'addon', version: 1, trial_days: 14, prices, entitlements: { features: { [feature]: true } } })

/** Les plans en vente (versions actives du manifeste), dans l'ordre de la page. */
export const PREVIEW_PLANS: readonly PublicPlan[] = [
  base('free', 'Gratuit', [], {}, { published_instructions: 3, stations: 1, editors: 1 }, 300),
  base('solo', 'Solo', cad(4900, 49000), { adoption_stats: true }, { published_instructions: 30, stations: 5, editors: 1 }, 2500),
  base('equipe', 'Équipe', cad(29900, 299000), { translations: true, adoption_stats: true, approvals: true, brand_kit: true, shared_blocks: true }, { published_instructions: null, stations: 25, editors: 5 }, 12000),
  base('usine', 'Usine', cad(89900, 899000), { translations: true, adoption_stats: true, approvals: true, bulk_import: true, voice_assistant: true, brand_kit: true, full_export: true, shared_blocks: true }, { published_instructions: null, stations: 100, editors: 15 }, 40000),
  addon('academie-equipe', 'Académie', cad(14900, 149000), 'academy'),
  addon('academie-usine', 'Académie', cad(44900, 449000), 'academy'),
  addon('releves-equipe', 'Relevés', cad(9900, 99000), 'records_plus'),
  addon('releves-usine', 'Relevés', cad(29900, 299000), 'records_plus'),
]

/* ───────────────────────── Ce que l'usine aurait (dans cet appareil) ───────────────────────── */

// `clip_pref_` : la préférence survit à la déconnexion, comme la langue et le thème.
const KEY = 'clip_pref_billing_preview'

/** Une sélection lue n'importe où est remise en ordre : un plan connu, des modules que ce plan reçoit. */
export function cleanSelection(raw: unknown): PreviewSelection {
  const x = raw && typeof raw === 'object' ? (raw as Partial<PreviewSelection>) : {}
  const plan = PREVIEW_BASE_PLANS.includes(x.plan as PreviewPlan) ? (x.plan as PreviewPlan) : DEFAULT_PREVIEW.plan
  const modules = (Array.isArray(x.modules) ? x.modules : DEFAULT_PREVIEW.modules).filter((k, i, all): k is ModuleKey => all.indexOf(k) === i && MODULES.some((m) => m.key === k && !!addonFor(m, plan)))
  const credits = CREDIT_LEVELS.includes(x.credits as CreditLevel) ? (x.credits as CreditLevel) : DEFAULT_PREVIEW.credits
  return { plan, modules, credits }
}

export function readPreview(): PreviewSelection {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? cleanSelection(JSON.parse(raw)) : DEFAULT_PREVIEW
  } catch {
    return DEFAULT_PREVIEW
  }
}

export function writePreview(sel: PreviewSelection): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cleanSelection(sel)))
  } catch {
    /* sans stockage, l'aperçu garde le défaut */
  }
}

/* ───────────────────────── L'état et le client simulés ───────────────────────── */

/** La part des crédits du mois qui reste, selon le niveau choisi (bas : sous le seuil de 20 %). */
const REMAINING: Record<CreditLevel, number> = { full: 0.82, low: 0.12, empty: 0 }

/** L'état que rendrait la plateforme pour cette sélection (les comptes d'usage restent ceux de l'app). */
export function previewState(sel: PreviewSelection, now = new Date()): BillingState {
  const s = cleanSelection(sel)
  const plan = PREVIEW_PLANS.find((p) => p.code === s.plan)!
  const features: Record<string, boolean> = { ...plan.entitlements.features }
  for (const key of s.modules) features[MODULES.find((m) => m.key === key)!.feature] = true
  const granted = plan.entitlements.credits?.[0]?.amount ?? 0
  const available = Math.round(granted * REMAINING[s.credits])
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString()
  return {
    product: 'clip-v3',
    state: 'active',
    plan_code: s.plan,
    plan_version: 1,
    features,
    limits: Object.entries(plan.entitlements.limits ?? {}).map(([feature_key, limit]) => ({ feature_key, used: 0, limit })),
    credits: [{ feature_key: 'ai_credits', unit: 'credit', unit_scale: 1, balance: available, available, granted, consumed: granted - available, reserved: 0, period_end: periodEnd, overage_policy: 'block' }],
    currency: 'CAD',
    current_period_end: s.plan === 'free' ? null : periodEnd,
    grace_until: null,
    cancel_at_period_end: false,
    channel: 'web',
  }
}

/** « Acheter » dans l'aperçu : un plan remplace le plan (les modules qu'il ne reçoit pas tombent), un module s'ajoute. */
export function applyPurchase(sel: PreviewSelection, code: string): PreviewSelection {
  if (PREVIEW_BASE_PLANS.includes(code as PreviewPlan)) return cleanSelection({ ...sel, plan: code, credits: 'full' })
  const m = MODULES.find((x) => Object.values(x.addons).includes(code))
  return m ? cleanSelection({ ...sel, modules: [...sel.modules, m.key] }) : sel
}

/** Le paramètre qui dit, au retour, ce qu'on vient de « prendre » dans l'aperçu. */
// Pas « apercu » : ce paramètre sert déjà à l'aperçu d'une instruction (`lire?apercu=1`).
export const PREVIEW_PARAM = 'essai-apercu'

/** Le nom d'un plan ou d'un module du catalogue de l'aperçu ; null s'il est inconnu. */
export const previewName = (code: string | null | undefined): string | null => PREVIEW_PLANS.find((p) => p.code === code)?.name ?? null

/** Le client de l'aperçu : même forme que le vrai, mais tout se passe dans l'appareil. */
export function createPreviewClient(store: { read: () => PreviewSelection; write: (s: PreviewSelection) => void } = { read: readPreview, write: writePreview }): BillingClient {
  const context = async (): Promise<BillingState> => previewState(store.read())
  return {
    context,
    check: async (featureKey: string): Promise<CheckResult> => {
      const allowed = (await context()).features[featureKey] === true
      return { allowed, feature_key: featureKey, reason: allowed ? null : 'not_entitled', upgrade_hint: null }
    },
    plans: async (): Promise<PlansOffer> => {
      const current = store.read().plan
      return { product: 'clip-v3', channel: 'web', currency: 'CAD', plans: PREVIEW_PLANS.map((p) => ({ ...p, is_current: p.code === current })) }
    },
    mobileSync: context,
    // Pas de paiement : l'aperçu prend le plan ou le module, et on revient là où on était.
    checkout: async (planCode: string, _interval: 'monthly' | 'yearly', urls: { success: string; cancel: string }): Promise<string> => {
      store.write(applyPurchase(store.read(), planCode))
      const back = new URL(urls.success)
      back.searchParams.set(PREVIEW_PARAM, planCode)
      return back.toString()
    },
    // Pas de portail : rien n'a été payé.
    portal: async (returnUrl: string): Promise<string> => returnUrl,
  }
}
