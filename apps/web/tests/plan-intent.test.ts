import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { afterEach, describe, expect, it } from 'vitest'
import { BILLING_INTERVAL, clearPlanIntent, parsePlanIntent, PLAN_INTENT_KEY, readPlanIntent, savePlanIntent, SELLABLE_PLANS, subscriptionPathFor } from '@/lib/billing/intent'

interface Manifest {
  plans: Array<{ code: string; kind: string; status: string; prices?: unknown[] }>
}
const manifest = parse(readFileSync(resolve(__dirname, '../../../billing.manifest.yaml'), 'utf8')) as Manifest
/** Les forfaits qu'on peut choisir en s'inscrivant, lus au manifeste : de base, actifs, avec un prix. */
const paidBase = manifest.plans.filter((p) => p.kind === 'base' && p.status === 'active' && (p.prices ?? []).length > 0).map((p) => p.code)
const free = manifest.plans.find((p) => p.kind === 'base' && !(p.prices ?? []).length)?.code ?? ''
const addon = manifest.plans.find((p) => p.kind === 'addon')?.code ?? ''

afterEach(() => sessionStorage.clear())

describe('l’intention d’achat venue du site', () => {
  it('ne connaît que les forfaits de base payants du manifeste', () => {
    expect([...SELLABLE_PLANS].sort()).toEqual([...paidBase].sort())
    expect(paidBase.length).toBeGreaterThan(0)
  })

  it('accepte un forfait payant et un intervalle month ou year', () => {
    for (const plan of paidBase) {
      expect(parsePlanIntent(`?inscription=1&plan=${plan}&interval=month`)).toEqual({ plan, interval: 'month' })
      expect(parsePlanIntent(new URLSearchParams({ plan, interval: 'year' }))).toEqual({ plan, interval: 'year' })
    }
  })

  it('refuse le gratuit, un module, un forfait inconnu, un intervalle douteux ou absent', () => {
    const plan = paidBase[0]
    expect(parsePlanIntent(`?plan=${free}&interval=month`)).toBeNull()
    expect(parsePlanIntent(`?plan=${addon}&interval=month`)).toBeNull()
    expect(parsePlanIntent('?plan=entreprise&interval=month')).toBeNull()
    expect(parsePlanIntent(`?plan=${plan}&interval=monthly`)).toBeNull()
    expect(parsePlanIntent(`?plan=${plan}&interval=week`)).toBeNull()
    expect(parsePlanIntent(`?plan=${plan}`)).toBeNull()
    expect(parsePlanIntent(`?plan=${plan.toUpperCase()}&interval=month`)).toBeNull()
    expect(parsePlanIntent('')).toBeNull()
  })

  it('se garde dans la session, se relit validée, puis s’efface', () => {
    const intent = { plan: paidBase[0], interval: 'year' as const }
    savePlanIntent(intent)
    expect(JSON.parse(sessionStorage.getItem(PLAN_INTENT_KEY) ?? '{}')).toEqual(intent)
    expect(readPlanIntent()).toEqual(intent)
    clearPlanIntent()
    expect(readPlanIntent()).toBeNull()
  })

  it('une valeur trafiquée dans la session vaut « aucune intention »', () => {
    sessionStorage.setItem(PLAN_INTENT_KEY, JSON.stringify({ plan: 'usine-gratuite', interval: 'year' }))
    expect(readPlanIntent()).toBeNull()
    sessionStorage.setItem(PLAN_INTENT_KEY, '{pas du json')
    expect(readPlanIntent()).toBeNull()
  })

  it('mène à la page Abonnement, forfait présélectionné, dans le vocabulaire de la plateforme', () => {
    expect(subscriptionPathFor({ plan: paidBase[0], interval: 'month' })).toBe(`/reglages/abonnement?plan=${paidBase[0]}&interval=month`)
    expect(BILLING_INTERVAL).toEqual({ month: 'monthly', year: 'yearly' })
  })
})
