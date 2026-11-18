/**
 * Une organisation qui ne s'est jamais abonnée : la plateforme rend `state: 'none'`, `plan_code: null` et aucune
 * limite (vu en QA le 2026-11-18). C'est le plan par défaut du manifeste : ses plafonds s'appliquent (pas « 0 sur
 * 0 »), et l'essai lui est proposé. Kiplo, qui ne vend ni Usine ni modules, n'en propose aucun.
 */
import { describe, expect, it } from 'vitest'
import { PRODUCTS } from '@/lib/brand/product'
import { onFreePlan, sellableModules } from '@/lib/billing/catalog'
import { limitOf, type BillingState } from '@/lib/billing/client'
import { withDefaultPlan } from '@/lib/billing/preview'

const NONE: BillingState = {
  product: 'clip-v2',
  state: 'none',
  plan_code: null,
  plan_version: null,
  features: {},
  limits: [],
  credits: [],
  currency: null,
  current_period_end: null,
  grace_until: null,
  cancel_at_period_end: false,
  channel: 'none',
}

describe('sans abonnement', () => {
  it('le plan par défaut donne ses plafonds, au lieu de « 0 sur 0 »', () => {
    // Tel que la plateforme le rend, tout serait atteint d'avance.
    expect(limitOf(NONE, 'published_instructions', 0)?.reached).toBe(true)
    const s = withDefaultPlan(NONE)
    expect(limitOf(s, 'published_instructions', 0)).toMatchObject({ limit: 3, reached: false })
    expect(limitOf(s, 'published_instructions', 3)?.reached).toBe(true)
    expect(limitOf(s, 'stations', 0)).toMatchObject({ limit: 1, reached: false })
    expect(limitOf(s, 'editors', 1)?.reached).toBe(true)
  })

  it('un état qui porte un plan ou des limites ne change pas', () => {
    const solo: BillingState = { ...NONE, state: 'active', plan_code: 'solo', limits: [{ feature_key: 'stations', used: 0, limit: 3 }] }
    expect(withDefaultPlan(solo)).toBe(solo)
  })

  it('l’essai se propose à qui n’a jamais payé, pas à un état illisible', () => {
    expect(onFreePlan(NONE)).toBe(true)
    expect(onFreePlan({ plan_code: 'free' })).toBe(true)
    expect(onFreePlan({ plan_code: 'equipe' })).toBe(false)
    expect(onFreePlan(null)).toBe(false)
  })

  it('Kiplo ne propose aucun module ; CLIP, ceux qui sont bâtis', () => {
    const on = { academy: true, recordsPlus: true }
    expect(sellableModules(on, PRODUCTS.kiplo)).toEqual([])
    expect(sellableModules(on, PRODUCTS.clip).map((m) => m.key)).toEqual(['academy', 'records'])
    expect(sellableModules({ academy: true }, PRODUCTS.clip).map((m) => m.key)).toEqual(['academy'])
  })
})
