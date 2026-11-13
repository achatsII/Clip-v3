import { describe, expect, it } from 'vitest'
import { moduleOffer } from '@/lib/billing/advice'
import { addTry, candidates, emptyMemory, pickOffer, snooze, SNOOZE, STALE, WEEK, type AdvisorInput, type Offer } from '@/lib/billing/advisor'
import { refusalFrom } from '@/lib/billing/bus'
import { MODULES } from '@/lib/billing/catalog'
import type { BillingState, PublicPlan } from '@/lib/billing/client'

// La grille du manifeste : Gratuit, Solo, Équipe, Usine, et les modules d'Équipe et d'Usine.
const credits = (amount: number) => [{ feature_key: 'ai_credits', amount, period: 'monthly', unit: 'credit' }]
const price = (cents: number) => [{ interval: 'monthly' as const, currency: 'CAD', amount_cents: cents }, { interval: 'yearly' as const, currency: 'CAD', amount_cents: cents * 10 }]
const base = (code: string, name: string, cents: number, features: Record<string, boolean>, stations: number, ai: number, published: number | null, editors: number): PublicPlan => ({
  code,
  name,
  kind: 'base',
  prices: cents ? price(cents) : [],
  entitlements: { features: { academy: false, records_plus: false, ...features }, limits: { published_instructions: published, stations, editors }, credits: credits(ai) },
})
const addon = (code: string, name: string, cents: number, feature: string): PublicPlan => ({ code, name, kind: 'addon', trial_days: 14, prices: price(cents), entitlements: { features: { [feature]: true } } })
const plans: PublicPlan[] = [
  base('free', 'Gratuit', 0, { translations: false }, 1, 300, 3, 1),
  base('solo', 'Solo', 4900, { translations: false }, 5, 2500, 30, 1),
  base('equipe', 'Équipe', 29900, { translations: true }, 25, 12000, null, 5),
  base('usine', 'Usine', 89900, { translations: true }, 100, 40000, null, 15),
  addon('academie-equipe', 'Académie', 14900, 'academy'),
  addon('academie-usine', 'Académie', 44900, 'academy'),
  addon('releves-equipe', 'Relevés', 9900, 'records_plus'),
  addon('releves-usine', 'Relevés', 29900, 'records_plus'),
]
const on = (plan: string, features: Record<string, boolean> = {}): BillingState =>
  ({ product: 'clip-v3', state: 'active', plan_code: plan, plan_version: 1, features, limits: [], credits: [], currency: 'CAD', current_period_end: null, grace_until: null, cancel_at_period_end: false, channel: 'web' }) as BillingState
const NOW = Date.parse('2026-11-13T12:00:00Z')
const input = (over: Partial<AdvisorInput> = {}): AdvisorInput => ({ state: on('equipe', { translations: true }), plans, usage: {}, tries: {}, evidence: {}, modules: ['academy', 'records'], now: NOW, ...over })
const academy = MODULES.find((m) => m.key === 'academy')!

describe('le module à proposer selon le plan de l’usine', () => {
  it('Équipe et Usine reçoivent chacun leur module ; Solo est mené à Équipe', () => {
    expect(moduleOffer(plans, on('equipe'), academy).addon?.code).toBe('academie-equipe')
    expect(moduleOffer(plans, on('usine'), academy).addon?.code).toBe('academie-usine')
    expect(moduleOffer(plans, on('solo'), academy)).toMatchObject({ addon: null, plan: { code: 'equipe' } })
    expect(moduleOffer(plans, on('free'), academy).plan?.code).toBe('equipe')
  })

  it('suit le module que la plateforme désigne, s’il est bien de ce module ; un module pas en vente : rien', () => {
    expect(moduleOffer(plans, on('equipe'), academy, 'academie-usine').addon?.code).toBe('academie-usine')
    expect(moduleOffer(plans, on('equipe'), academy, 'releves-equipe').addon?.code).toBe('academie-equipe')
    expect(moduleOffer(plans.filter((p) => p.code !== 'academie-equipe'), on('equipe'), academy).addon).toBeNull()
  })

  it('le refus de la plateforme garde le module qu’il nomme', () => {
    expect(refusalFrom(403, { code: 'not_entitled', feature_key: 'academy', upgrade_hint: { plan_code: null, addon_code: 'academie-equipe' } })).toMatchObject({ featureKey: 'academy', upgradePlan: null, upgradeAddon: 'academie-equipe' })
  })
})

describe('les offres qui serviraient, de la plus pressante à la moins pressante', () => {
  it('une limite atteinte passe avant une limite proche, puis une fonction essayée, puis un module', () => {
    const list = candidates(
      input({
        state: on('solo'),
        usage: { stations: { used: 4, limit: 5 }, published_instructions: { used: 30, limit: 30 } },
        tries: { translations: [NOW - 1000, NOW - 2000] },
        evidence: { academy: 40 },
      }),
    )
    expect(list.map((o) => o.id)).toEqual(['limit:published_instructions', 'limit:stations', 'feature:translations'])
    expect(list[1]).toMatchObject({ kind: 'limit', full: false, plan: 'equipe' })
  })

  it('un seul rédacteur sur Solo, un seul poste sur Gratuit : c’est le plan, pas une offre', () => {
    expect(candidates(input({ state: on('solo'), usage: { editors: { used: 1, limit: 1 } } }))).toEqual([])
    expect(candidates(input({ state: on('free'), usage: { stations: { used: 1, limit: 1 } } }))).toEqual([])
    expect(candidates(input({ state: on('solo'), usage: { editors: { used: 2, limit: 1 } } }))[0]).toMatchObject({ id: 'limit:editors', full: true, plan: 'equipe' })
  })

  it('une fonction essayée une seule fois, ou il y a plus d’un mois, ou déjà ouverte : rien', () => {
    expect(candidates(input({ state: on('solo'), tries: { translations: [NOW] } }))).toEqual([])
    expect(candidates(input({ state: on('solo'), tries: { translations: [NOW - SNOOZE - 1, NOW - SNOOZE - 2] } }))).toEqual([])
    expect(candidates(input({ tries: { translations: [NOW, NOW] } }))).toEqual([])
  })

  it('un module que l’usage appelle : seulement si le plan le reçoit, si l’usine ne l’a pas, et s’il est bâti', () => {
    expect(candidates(input({ evidence: { academy: 12 } }))).toMatchObject([{ id: 'module:academy', addon: 'academie-equipe', trialDays: 14, evidence: 12 }])
    expect(candidates(input({ evidence: { academy: 9 } }))).toEqual([])
    expect(candidates(input({ state: on('solo'), evidence: { academy: 40 } }))).toEqual([])
    expect(candidates(input({ state: on('equipe', { academy: true }), evidence: { academy: 40 } }))).toEqual([])
    expect(candidates(input({ evidence: { academy: 40 }, modules: [] }))).toEqual([])
    expect(candidates(input({ evidence: { records: 30 } }))[0]).toMatchObject({ id: 'module:records', addon: 'releves-equipe' })
  })

  it('une fonction d’un module essayée sur Solo mène au plan qui le reçoit ; une seule offre par fonction', () => {
    expect(candidates(input({ state: on('solo'), tries: { academy: [NOW, NOW] } }))).toMatchObject([{ id: 'feature:academy', plan: 'equipe', addon: null }])
    const both = candidates(input({ tries: { academy: [NOW, NOW] }, evidence: { academy: 30 } }))
    expect(both.map((o) => o.id)).toEqual(['feature:academy'])
    expect(both[0]).toMatchObject({ addon: 'academie-equipe', plan: null })
  })

  it('au plan le plus haut, une limite pleine n’a rien à proposer ; les crédits épuisés mènent au plan qui en donne plus', () => {
    expect(candidates(input({ state: on('usine'), usage: { stations: { used: 100, limit: 100 } } }))).toEqual([])
    expect(candidates(input({ state: on('solo'), tries: { ai_credits: [NOW, NOW] } }))).toMatchObject([{ id: 'feature:ai_credits', plan: 'equipe' }])
  })
})

describe('une offre à la fois, rarement', () => {
  const a: Offer = { id: 'limit:stations', kind: 'limit', feature: 'stations', used: 4, limit: 5, full: false, plan: 'equipe' }
  const b: Offer = { id: 'feature:translations', kind: 'feature', feature: 'translations', tries: 2, plan: 'equipe', addon: null }

  it('la première paraît ; elle reste tant qu’elle sert, même si une autre devient plus pressante', () => {
    const first = pickOffer([a, b], emptyMemory(), NOW)
    expect(first).toMatchObject({ offer: { id: a.id }, fresh: true })
    const again = pickOffer([b, a], first.memory, NOW + 3 * 86400_000)
    expect(again).toMatchObject({ offer: { id: a.id }, fresh: false })
  })

  it('une nouvelle au plus par semaine', () => {
    const first = pickOffer([a], emptyMemory(), NOW)
    // L'offre ne sert plus (la limite a été montée) : rien d'autre avant une semaine.
    expect(pickOffer([b], first.memory, NOW + WEEK - 1).offer).toBeNull()
    expect(pickOffer([b], first.memory, NOW + WEEK)).toMatchObject({ offer: { id: b.id }, fresh: true })
  })

  it('« Plus tard » la range un mois, et la semaine d’attente repart', () => {
    const first = pickOffer([a, b], emptyMemory(), NOW)
    const later = snooze(first.memory, a.id, NOW + 86400_000)
    expect(pickOffer([a, b], later, NOW + 2 * 86400_000).offer).toBeNull()
    expect(pickOffer([a, b], later, NOW + 86400_000 + WEEK).offer?.id).toBe(b.id)
    expect(pickOffer([a], later, NOW + 86400_000 + SNOOZE).offer?.id).toBe(a.id)
  })

  it('restée deux semaines sans réponse, elle se range d’elle-même', () => {
    const first = pickOffer([a, b], emptyMemory(), NOW)
    const stale = pickOffer([a, b], first.memory, NOW + STALE)
    expect(stale.offer?.id).toBe(b.id)
    expect(stale.memory.snoozed[a.id]).toBe(NOW + STALE + SNOOZE)
  })

  it('les essais se comptent sur 30 jours, dix au plus par fonction', () => {
    let t = addTry({ approvals: [NOW - SNOOZE - 1] }, 'translations', NOW)
    for (let i = 0; i < 12; i++) t = addTry(t, 'translations', NOW + i)
    expect(t.approvals).toBeUndefined()
    expect(t.translations).toHaveLength(10)
  })
})
