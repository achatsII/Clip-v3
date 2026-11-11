import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { AI_COSTS, FEATURE_LABELS, FEATURE_ORDER } from '@/lib/billing/catalog'
import { AI_OPERATIONS } from '@/lib/gateway/ai'

interface Manifest {
  product: {
    slug: string
    channels: string[]
    default_plan_code: string
    application: { default_scopes: string[] }
    providers: { revenuecat?: { enabled: boolean; project: string; app_user_id_scope: string; posture: string; apps: Record<string, Record<string, string>>; iap_justification: { reason: string } } }
  }
  features: Array<{ key: string; kind: string }>
  plans: Array<{
    code: string
    status: string
    version: number
    availability: { channels: string[]; audience: string; store_entitlement?: string }
    prices?: Array<{ interval: string; store_product_id?: string }>
    entitlements: { features?: Record<string, boolean>; limits?: Record<string, number | null>; credits?: Array<{ feature: string }> }
  }>
  ai_operations: Array<{ key: string; capability: string; feature: string; credits: number }>
}

const manifest = parse(readFileSync(resolve(__dirname, '../../../billing.manifest.yaml'), 'utf8')) as Manifest

describe('billing.manifest.yaml ↔ code de l’app', () => {
  it('chaque appel d’IA du code a son opération au manifeste, au même prix', () => {
    const ops = Object.fromEntries(manifest.ai_operations.map((o) => [o.key, o.credits]))
    expect(Object.keys(ops).sort()).toEqual([...AI_OPERATIONS].sort())
    expect(ops).toEqual(AI_COSTS)
    for (const o of manifest.ai_operations) {
      expect(o.capability).toBe('assistant.ask')
      expect(o.credits).toBeGreaterThan(0)
      expect(manifest.features.find((f) => f.key === o.feature)?.kind).toBe('credit')
    }
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

  it('aucun scope d’assistant ni de facturation pour les comptes en libre-service', () => {
    for (const s of manifest.product.application.default_scopes) expect(s).not.toMatch(/^(assistant:|billing:|platform:|\*$)/)
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
})
