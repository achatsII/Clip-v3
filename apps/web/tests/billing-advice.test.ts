import { describe, expect, it } from 'vitest'
import { creditsReason, planFor, renewalText } from '@/lib/billing/advice'
import type { BillingState, CreditBucket, PublicPlan } from '@/lib/billing/client'

// Les trois plans du manifeste (prix et quantités tels quels).
const off = { translations: false, adoption_stats: false, approvals: false, bulk_import: false, voice_assistant: false, brand_kit: false, full_export: false }
const credits = (amount: number) => [{ feature_key: 'ai_credits', amount, period: 'monthly', unit: 'credit' }]
const plans: PublicPlan[] = [
  { code: 'free', name: 'Gratuit', kind: 'base', prices: [], entitlements: { features: off, limits: { published_instructions: 5, stations: 2, editors: 1 }, credits: credits(1000) } },
  { code: 'usine', name: 'Usine', kind: 'base', prices: [{ interval: 'monthly', currency: 'CAD', amount_cents: 24900 }, { interval: 'yearly', currency: 'CAD', amount_cents: 249000 }], entitlements: { features: Object.fromEntries(Object.keys(off).map((k) => [k, true])), limits: { published_instructions: null, stations: 100, editors: 10 }, credits: credits(60000) } },
  { code: 'solo', name: 'Solo', kind: 'base', prices: [{ interval: 'monthly', currency: 'CAD', amount_cents: 2900 }, { interval: 'yearly', currency: 'CAD', amount_cents: 29000 }], entitlements: { features: { ...off, translations: true, adoption_stats: true }, limits: { published_instructions: null, stations: 10, editors: 1 }, credits: credits(10000) } },
]

const bucket = (available: number, granted = 10000): CreditBucket => ({ feature_key: 'ai_credits', unit: 'credit', unit_scale: 1, balance: available, available, granted, consumed: granted - available, reserved: 0, period_end: '2026-11-23T12:00:00Z' })
const on = (plan: string, granted = 10000): BillingState =>
  ({ product: 'clip-v3', state: 'active', plan_code: plan, plan_version: 1, features: {}, limits: [], credits: [bucket(1640, granted)], currency: 'CAD', current_period_end: null, grace_until: null, cancel_at_period_end: false, channel: 'web' }) as BillingState

describe('plan conseillé par la fenêtre des refus', () => {
  it('ne conseille jamais le plan actuel : sur Solo, plus de crédits mène à Usine', () => {
    expect(planFor(plans, on('solo'), 'ai_credits')?.code).toBe('usine')
  })

  it('choisit le moins cher des plans qui donnent vraiment plus', () => {
    expect(planFor(plans, on('free', 1000), 'ai_credits')?.code).toBe('solo')
    expect(planFor(plans, on('free', 1000), 'stations')?.code).toBe('solo')
    expect(planFor(plans, on('solo'), 'stations')?.code).toBe('usine')
    expect(planFor(plans, on('solo'), 'approvals')?.code).toBe('usine')
    expect(planFor(plans, on('free', 1000))?.code).toBe('solo')
  })

  it('au plan le plus haut, aucun plan : la fenêtre dit quand les crédits reviennent', () => {
    expect(planFor(plans, on('usine', 60000), 'ai_credits')).toBeNull()
    expect(planFor(plans, on('usine', 60000))).toBeNull()
  })

  it('suit le plan désigné par la plateforme, sauf s’il est déjà le plan actuel', () => {
    expect(planFor(plans, on('free', 1000), 'ai_credits', 'usine')?.code).toBe('usine')
    expect(planFor(plans, on('solo'), 'ai_credits', 'solo')?.code).toBe('usine')
  })
})

describe('ce que la fenêtre des crédits dit', () => {
  it('ouverte depuis le solde : le vrai solde, sans parler d’un refus', () => {
    const text = creditsReason(bucket(1640), false)
    expect(text).toMatch(/^Il vous reste 1\s640 crédits jusqu’au 23 novembre 2026\.$/)
    expect(text).not.toMatch(/épuisés|débité/)
  })

  it('après un refus : rien n’a été débité, et « épuisés » seulement à zéro', () => {
    expect(creditsReason(bucket(0), true)).toMatch(/^Vos crédits IA sont épuisés jusqu’au 23 novembre 2026\. Rien n’a été débité/)
    expect(creditsReason(bucket(100), true)).toBe('Il vous reste 100 crédits : pas assez pour cette action. Rien n’a été débité.')
    expect(creditsReason(null, true)).toMatch(/Rien n’a été débité/)
  })

  it('aucun plan plus généreux : la date de renouvellement', () => {
    expect(renewalText(bucket(0, 60000))).toBe('Aucun plan n’en donne davantage. Vos crédits se renouvellent le 23 novembre 2026.')
  })
})
