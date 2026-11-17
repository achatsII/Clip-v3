/**
 * L'offre : le volume (plus on monte, moins chaque unité coûte), les deux fonctions nouvelles au bon
 * plan (l'écran dès Solo, l'IA qui apprend de l'équipe dès Équipe), la prévision des crédits (« à ce
 * rythme… ») et l'offre qui en découle, et le rapport « Crédits d'IA : où ils vont ».
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'yaml'

const billing = vi.hoisted(() => ({ right: 'locked' as 'locked' | 'open', paywall: vi.fn() }))
vi.mock('@/lib/billing/state', async (orig) => ({
  ...(await orig<typeof import('@/lib/billing/state')>()),
  useEntitlement: () => billing.right,
  useGate: () => (right: string, feature: string, action: () => void) => (right === 'locked' ? billing.paywall(feature) : action()),
}))
vi.mock('@/lib/media/screenRecorder', async (orig) => ({ ...(await orig<typeof import('@/lib/media/screenRecorder')>()), canRecordScreen: () => true }))
vi.mock('@/components/providers/Session', () => ({ useSession: () => ({ data: { insert: vi.fn(), patch: vi.fn(), filter: async () => [], get: async () => null }, files: {}, org: { json_data: {} }, can: () => true, profile: { userId: 'u1' }, displayName: 'Mélanie' }) }))
vi.mock('@/lib/toggles', () => ({ useToggle: () => true }))

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CaptureBoard } from '@/components/capture/CaptureBoard'
import { ConfirmProvider } from '@/components/ui/Confirm'
import { ToastProvider } from '@/components/ui/Toast'
import { candidates } from '@/lib/billing/advisor'
import type { BillingState, PublicPlan } from '@/lib/billing/client'
import { creditsForecast } from '@/lib/billing/forecast'
import { aiGroupOf, reportOf, type AiUse } from '@/lib/reports/catalog'
import { periodOf, previousOf } from '@/lib/reports/facts'

type Plan = { code: string; status: string; prices?: Array<{ interval: string; amount_cents: number }>; entitlements: { features?: Record<string, boolean>; limits?: Record<string, number | null>; credits?: Array<{ amount: number }> } }
const manifest = parse(readFileSync(resolve(__dirname, '../../../billing.manifest.yaml'), 'utf8')) as { plans: Plan[] }
const plan = (code: string) => manifest.plans.find((p) => p.code === code && p.status === 'active')!

beforeEach(() => localStorage.setItem('clip_pref_ui_lang', 'fr'))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('le volume : plus on monte, moins chaque unité coûte', () => {
  it('Équipe donne 5 fois Solo pour 4 fois le prix : chaque poste, rédacteur, instruction et crédit y revient moins cher', () => {
    const monthly = (p: Plan) => p.prices!.find((x) => x.interval === 'monthly')!.amount_cents
    const solo = plan('solo')
    const team = plan('equipe')
    for (const key of ['stations', 'editors', 'published_instructions'] as const) {
      const perSolo = monthly(solo) / (solo.entitlements.limits![key] as number)
      const perTeam = monthly(team) / (team.entitlements.limits![key] as number)
      expect(perTeam, key).toBeLessThan(perSolo)
    }
    const perCredit = (p: Plan) => monthly(p) / p.entitlements.credits![0].amount
    expect(perCredit(team)).toBeLessThan(perCredit(solo))
    // L'annuel vaut 10 mois.
    for (const p of [solo, team]) expect(p.prices!.find((x) => x.interval === 'yearly')!.amount_cents).toBe(monthly(p) * 10)
  })

  it('l’écran dès Solo, l’IA qui apprend de toute l’équipe dès Équipe ; jamais au gratuit', () => {
    const f = (code: string) => plan(code).entitlements.features!
    expect([f('free').screen_capture, f('solo').screen_capture, f('equipe').screen_capture, f('usine').screen_capture]).toEqual([false, true, true, true])
    expect([f('free').ai_learning, f('solo').ai_learning, f('equipe').ai_learning, f('usine').ai_learning]).toEqual([false, false, true, true])
  })
})

describe('l’enregistrement de l’écran, selon le plan', () => {
  function board() {
    window.matchMedia = ((query: string) => ({ matches: true, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false })) as typeof window.matchMedia
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider>
          <ConfirmProvider>
            <CaptureBoard instructionId={null} initialSources={[]} title="Nouvelle instruction" back={{ href: '/instructions', label: 'Instructions' }} onGenerate={vi.fn()} />
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>,
    )
  }

  it('sans le droit : la tuile garde son cadenas et ouvre la fenêtre du plan, pas l’enregistreur', () => {
    billing.right = 'locked'
    board()
    const tile = screen.getByRole('button', { name: /^Écran/ })
    expect(tile.textContent).toMatch(/Écran/)
    fireEvent.click(tile)
    expect(billing.paywall).toHaveBeenCalledWith('screen_capture')
    expect(screen.queryByText('Enregistrer l’écran')).toBeNull()
  })

  it('avec le droit : la tuile ouvre l’enregistreur', () => {
    billing.right = 'open'
    board()
    fireEvent.click(screen.getByRole('button', { name: /^Écran/ }))
    expect(billing.paywall).not.toHaveBeenCalled()
    expect(screen.getByText('Enregistrer l’écran')).toBeTruthy()
  })
})

describe('à ce rythme : les crédits de la période', () => {
  const NOW = Date.parse('2026-11-11T12:00:00Z')
  const bucket = (over = {}) => ({ available: 4000, consumed: 6000, period_start: '2026-11-01T00:00:00Z', period_end: '2026-12-01T00:00:00Z', ...over })

  it('le jour où ils finiront, et combien de jours avant le renouvellement', () => {
    // 6 000 crédits en 10,5 jours : ~571 par jour ; 4 000 de reste : ~7 jours, vers le 18 novembre.
    const f = creditsForecast(bucket(), NOW)!
    expect(f.runsOutAt.slice(0, 10)).toBe('2026-11-18')
    expect(f.daysShort).toBe(13)
    expect(f.renewsAt).toBe('2026-12-01T00:00:00Z')
  })

  it('rien à dire trop tôt, sans consommation, ou quand ils tiendront jusqu’au renouvellement', () => {
    expect(creditsForecast(bucket(), Date.parse('2026-11-02T12:00:00Z'))).toBeNull()
    expect(creditsForecast(bucket({ consumed: 0 }), NOW)).toBeNull()
    expect(creditsForecast(bucket({ available: 40000, consumed: 1000 }), NOW)).toBeNull()
    expect(creditsForecast(null, NOW)).toBeNull()
  })

  it('le conseiller propose le plan qui en donne plus, une fois par période ; rien au-delà d’Équipe (Usine est sur devis)', () => {
    const credits = (amount: number) => [{ feature_key: 'ai_credits', amount, period: 'monthly', unit: 'credit' }]
    const base = (code: string, cents: number, ai: number): PublicPlan => ({ code, name: code, kind: 'base', prices: cents ? [{ interval: 'monthly', currency: 'CAD', amount_cents: cents }] : [], entitlements: { features: {}, limits: {}, credits: credits(ai) } })
    const plans = [base('free', 0, 500), base('solo', 4900, 2500), base('equipe', 19900, 12500), base('usine', 0, 40000)]
    const state = (code: string): BillingState => ({ product: 'clip-v3', state: 'active', plan_code: code, plan_version: 1, features: {}, limits: [], credits: [{ feature_key: 'ai_credits', unit: 'credit', unit_scale: 1, balance: 400, available: 400, granted: 2500, consumed: 2100, reserved: 0, period_start: '2026-11-01T00:00:00Z', period_end: '2026-12-01T00:00:00Z' }] }) as unknown as BillingState
    const list = candidates({ state: state('solo'), plans, usage: {}, tries: {}, evidence: {}, modules: [], now: NOW })
    expect(list[0]).toMatchObject({ id: 'credits:2026-12-01', kind: 'credits', feature: 'ai_credits', plan: 'equipe' })
    expect(candidates({ state: state('equipe'), plans, usage: {}, tries: {}, evidence: {}, modules: [], now: NOW }).some((o) => o.kind === 'credits')).toBe(false)
  })
})

describe('le rapport « Crédits d’IA : où ils vont »', () => {
  const now = Date.parse('2026-11-17T12:00:00Z')
  const period = periodOf(30, now)
  const at = (daysAgo: number) => new Date(now - daysAgo * 86400_000).toISOString()
  const uses: AiUse[] = [
    { operation: 'generate_m', credits: 40, userId: 'u2', at: at(1) },
    { operation: 'generate_s', credits: 20, userId: 'u1', at: at(2) },
    { operation: 'generate_l', credits: 60, userId: 'u1', at: at(3) },
    { operation: 'edit_agent', credits: 5, userId: 'u2', at: at(3) },
    { operation: 'translate', credits: 15, userId: 'u1', at: at(4) },
    { operation: 'generate_s', credits: 10, userId: 'u1', at: at(40) },
  ]

  it('chaque usage a son nom pour l’usine', () => {
    expect(['generate_m', 'import_l', 'look_s', 'translate_image', 'annotate', 'quiz', 'report_summary', 'learn_rules'].map(aiGroupOf)).toEqual(['generate', 'generate', 'assistant', 'translate', 'images', 'training', 'reports', 'other'])
  })

  it('les crédits, les générations et leur coût typique, par usage et par personne (par ordre alphabétique)', () => {
    const def = reportOf('ia')!
    expect(def).toMatchObject({ family: 'direction', needs: ['ai'] })
    const blocks = def.build({ period, previous: previousOf(period), scope: { stationIds: null, shift: 'all', shiftOf: new Map() }, events: [], executions: [], feedback: [], cards: new Map(), stations: new Map(), ai: uses, people: new Map([['u1', 'Zoé'], ['u2', 'Alex']]) })
    const kpis = blocks.find((b) => b.kind === 'kpis') as Extract<(typeof blocks)[number], { kind: 'kpis' }>
    expect(kpis.items.map((k) => [k.id, k.raw])).toEqual([
      ['credits', 140],
      ['responses', 5],
      ['generations', 3],
      ['perGeneration', 40],
    ])
    expect(kpis.items[0].previous).toBe('10')
    const uses_ = blocks.find((b) => b.kind === 'table' && b.id === 'uses') as Extract<(typeof blocks)[number], { kind: 'table' }>
    expect(uses_.rows.map((r) => [r.cells.use.text, r.cells.credits.sort])).toEqual([
      ['Générations et imports', 120],
      ['Traductions', 15],
      ['Assistant d’édition', 5],
    ])
    const people = blocks.find((b) => b.kind === 'table' && b.id === 'people') as Extract<(typeof blocks)[number], { kind: 'table' }>
    expect(people.rows.map((r) => [r.cells.person.text, r.cells.credits.sort])).toEqual([
      ['Alex', 45],
      ['Zoé', 95],
    ])
  })
})
