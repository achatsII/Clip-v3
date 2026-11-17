import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { byQuote, FEATURE_LABELS, FEATURE_ORDER, FREE_PLAN, MODULES } from '@/lib/billing/catalog'
import { AI_FEATURE } from '@/lib/gateway/ai'

interface Manifest {
  product: {
    slug: string
    channels: string[]
    default_plan_code: string
    application: { default_scopes: string[] }
    enforce_denial?: boolean
    providers: { revenuecat?: { enabled: boolean; project: string; app_user_id_scope: string; posture: string; apps: Record<string, Record<string, string>>; iap_justification: { reason: string } } }
  }
  features: Array<{ key: string; kind: string; unit?: string; unit_scale?: number }>
  plans: Array<{
    code: string
    kind: string
    trial_days?: number
    status: string
    version: number
    availability: { channels: string[]; audience: string; store_entitlement?: string }
    prices?: Array<{ interval: string; amount_cents: number; store_product_id?: string }>
    entitlements: { features?: Record<string, boolean>; limits?: Record<string, number | null>; credits?: Array<{ feature: string; amount: number; period: string }> }
  }>
  ai_operations?: unknown
}

const manifest = parse(readFileSync(resolve(__dirname, '../../../billing.manifest.yaml'), 'utf8')) as Manifest

describe('billing.manifest.yaml ↔ code de l’app', () => {
  it('l’IA au coût réel : aucun prix fixe, une seule banque de crédits, débit jamais refusé, assistant:ask', () => {
    // Pas de section ai_operations : rien n'a de prix fixe, chaque réponse est débitée de son coût réel.
    expect(manifest.ai_operations).toBeUndefined()
    const ai = manifest.features.find((f) => f.key === AI_FEATURE)
    expect(ai).toMatchObject({ kind: 'credit', unit: 'credit' })
    expect(ai?.unit_scale ?? 1).toBe(1)
    expect(manifest.features.filter((f) => f.kind === 'credit')).toHaveLength(1)
    // Une réponse lancée est payée en entier, même sous zéro : c'est la suivante qui est refusée.
    expect(manifest.product.enforce_denial).toBe(false)
    expect(manifest.product.application.default_scopes).toContain('assistant:ask')
    // Chaque plan de base qu'on paie (ou qu'on reçoit de l'équipe) donne ses crédits d'IA chaque mois ;
    // le plan sans abonnement n'en a aucun (décision du 2026-11-17 : on essaie 7 jours, pas de gratuit).
    for (const p of manifest.plans.filter((x) => x.kind === 'base')) {
      const grant = p.entitlements.credits?.find((c) => c.feature === AI_FEATURE)
      if (p.code === FREE_PLAN) {
        expect(grant, p.code).toBeUndefined()
        continue
      }
      expect(grant?.period, p.code).toBe('monthly')
      expect(grant?.amount, p.code).toBeGreaterThan(0)
    }
  })

  it('l’offre en ligne : sur le web seulement, Solo et Équipe à l’essai 7 jours, aucun produit des magasins', () => {
    expect(manifest.product.channels).toEqual(['web'])
    expect((manifest.product as { providers: Record<string, unknown> }).providers.revenuecat).toBeUndefined()
    for (const p of manifest.plans) {
      expect(p.availability.channels, p.code).toEqual(['web'])
      for (const price of p.prices ?? []) expect((price as { store_product_id?: string }).store_product_id, p.code).toBeUndefined()
    }
    const trial = (code: string) => (manifest.plans.find((p) => p.code === code && p.status === 'active') as { trial_days?: number }).trial_days
    expect([trial('solo'), trial('equipe'), trial('usine'), trial(FREE_PLAN)]).toEqual([7, 7, undefined, undefined])
  })

  it('chaque feature du manifeste a son libellé, et l’ordre d’affichage les couvre toutes', () => {
    for (const f of manifest.features) {
      expect(FEATURE_LABELS[f.key as keyof typeof FEATURE_LABELS]?.fr, f.key).toBeTruthy()
      expect(FEATURE_LABELS[f.key as keyof typeof FEATURE_LABELS]?.en, f.key).toBeTruthy()
    }
    expect([...FEATURE_ORDER].sort()).toEqual(manifest.features.map((f) => f.key).sort())
  })

  it('le plan par défaut n’a aucun prix, une limite ne s’accorde jamais aussi en oui/non', () => {
    const free = manifest.plans.find((p) => p.code === manifest.product.default_plan_code)
    expect(free?.prices ?? []).toHaveLength(0)
    const limits = new Set(manifest.features.filter((f) => f.kind === 'limit').map((f) => f.key))
    for (const p of manifest.plans) for (const k of Object.keys(p.entitlements.features ?? {})) expect(limits.has(k), `${p.code}.${k}`).toBe(false)
  })

  it('aucun scope de facturation ni de plateforme pour les comptes en libre-service ; de l’assistant, seulement assistant:ask', () => {
    for (const s of manifest.product.application.default_scopes) {
      expect(s).not.toMatch(/^(billing:|platform:|\*$)/)
      if (s.startsWith('assistant:')) expect(s).toBe('assistant:ask')
    }
  })

  it('les features des plans existent au catalogue', () => {
    const keys = new Set(manifest.features.map((f) => f.key))
    for (const p of manifest.plans) {
      for (const k of [...Object.keys(p.entitlements.features ?? {}), ...Object.keys(p.entitlements.limits ?? {}), ...(p.entitlements.credits ?? []).map((c) => c.feature)]) expect(keys.has(k), `${p.code}.${k}`).toBe(true)
    }
  })

  it('vendu dans les magasins : RevenueCat déclaré, un produit unique par prix, le droit de chaque plan', () => {
    const mobile: string[] = manifest.product.channels.filter((c) => c === 'ios' || c === 'android')
    if (!mobile.length) return
    const rc = manifest.product.providers.revenuecat
    expect(rc).toMatchObject({ enabled: true, app_user_id_scope: 'organization', posture: 'in_app_purchase' })
    for (const ch of mobile) expect(rc?.apps?.[ch], ch).toBeTruthy()
    expect(rc?.iap_justification.reason.length).toBeGreaterThanOrEqual(80)
    const ids: string[] = []
    for (const p of manifest.plans) {
      const onMobile = p.availability.channels.some((c) => mobile.includes(c))
      if (!onMobile) continue
      expect(p.availability.audience, p.code).toBe('personal')
      if (!p.prices?.length) continue
      // Le droit du plan, le même pour toutes ses versions ; un produit par prix, propre à cette version.
      expect(p.availability.store_entitlement, p.code).toBe(`${manifest.product.slug}.${p.code}`)
      for (const price of p.prices) {
        expect(price.store_product_id, `${p.code} ${price.interval}`).toBe(`${manifest.product.slug.replace(/-/g, '_')}_${p.code}_${price.interval}_v${p.version}`)
        expect(price.store_product_id).toMatch(/^[a-z0-9_.]+$/)
        ids.push(price.store_product_id!)
      }
    }
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('chaque module du code est un add-on du manifeste : web seulement, sur devis (sans prix ni essai), avec Usine', () => {
    const addons = manifest.plans.filter((p) => p.kind === 'addon')
    const bases = new Set(manifest.plans.filter((p) => p.kind === 'base').map((p) => p.code))
    const named = MODULES.flatMap((m) => Object.entries(m.addons).map(([base, code]) => ({ m, base, code: code! })))
    expect(named.map((x) => x.code).sort()).toEqual(addons.map((p) => p.code).sort())
    for (const { m, base, code } of named) {
      const p = addons.find((a) => a.code === code)!
      expect(bases.has(base), `${code} : plan de base ${base}`).toBe(true)
      expect(p.status, code).toBe('active')
      expect(p.entitlements.features?.[m.feature], code).toBe(true)
      expect(p.availability.channels, code).toEqual(['web'])
      // Sur devis, comme le plan qui les reçoit : rien ne s'achète seul, rien ne s'essaie seul.
      expect(p.prices ?? [], code).toEqual([])
      expect(p.trial_days, code).toBeUndefined()
      expect(byQuote({ code, prices: p.prices ?? [] }), code).toBe(true)
      expect(byQuote({ code: base, prices: manifest.plans.find((b) => b.code === base)?.prices ?? [] }), `${code} : ${base} sur devis`).toBe(true)
    }
  })

  it('aucun plan de base ne donne un module ; seuls les plans sur devis les reçoivent', () => {
    const moduleFeatures = new Set(MODULES.map((m) => m.feature))
    for (const p of manifest.plans.filter((x) => x.kind === 'base')) for (const [k, v] of Object.entries(p.entitlements.features ?? {})) if (moduleFeatures.has(k as never)) expect(v, `${p.code}.${k}`).toBe(false)
    for (const m of MODULES) expect(Object.keys(m.addons), m.key).toEqual(['usine'])
  })

  it('en libre-service, rien d’illimité ; le plan gratuit est celui du manifeste ; Usine est sur devis, sur le web seulement', () => {
    expect(FREE_PLAN).toBe(manifest.product.default_plan_code)
    const bases = manifest.plans.filter((p) => p.kind === 'base' && p.status === 'active')
    for (const p of bases.filter((x) => (x.prices ?? []).length > 0 || x.code === FREE_PLAN))
      for (const [k, v] of Object.entries(p.entitlements.limits ?? {})) expect(v, `${p.code}.${k} : un plan en libre-service a une limite`).not.toBeNull()
    const usine = bases.find((p) => p.code === 'usine')!
    expect(byQuote({ code: usine.code, prices: usine.prices ?? [] })).toBe(true)
    expect(usine.availability.channels).toEqual(['web'])
    expect(usine.availability.store_entitlement).toBeUndefined()
  })

  it('crédits et limites concordent : la banque de chaque plan suffit à atteindre sa limite d’instructions, même à partir de longues vidéos', () => {
    // Coût réel mesuré en QA (novembre 2026) : 16 à 55 crédits par génération, environ 150 pour 30 minutes de vidéo.
    const LONG_GENERATION = 150
    for (const p of manifest.plans.filter((x) => x.kind === 'base' && x.status === 'active')) {
      const limit = p.entitlements.limits?.published_instructions
      const bank = p.entitlements.credits?.find((c) => c.feature === 'ai_credits')?.amount ?? 0
      // Sans abonnement, pas d'IA : ses quelques instructions se rédigent à la main.
      if (limit == null || p.code === FREE_PLAN) continue
      expect(bank, `${p.code} : ${bank} crédits pour ${limit} instructions`).toBeGreaterThanOrEqual(limit * LONG_GENERATION)
    }
  })
})
