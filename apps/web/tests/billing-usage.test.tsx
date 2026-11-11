import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ReactNode } from 'react'
import { parse } from 'yaml'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UsageMeter } from '@/components/billing/Usage'
import { planFor } from '@/lib/billing/advice'
import { LIMIT_FEATURES } from '@/lib/billing/catalog'
import type { BillingState, PublicPlan } from '@/lib/billing/client'
import { BillingProvider, useBilling } from '@/lib/billing/state'
import { countEditors, limitReason, offerText, usageLevel, usageText } from '@/lib/billing/usage'

// La vraie grille, lue dans le manifeste, telle que /plans la rendrait.
interface ManifestPlan {
  code: string
  name: string
  kind: 'base'
  status: string
  prices?: PublicPlan['prices']
  entitlements: { features?: Record<string, boolean>; limits?: Record<string, number | null>; credits?: Array<{ feature: string; amount: number; period: string }> }
}
const manifest = parse(readFileSync(resolve(__dirname, '../../../billing.manifest.yaml'), 'utf8')) as { features: Array<{ key: string; kind: string }>; plans: ManifestPlan[] }
const grid: PublicPlan[] = manifest.plans
  .filter((p) => p.status === 'active')
  .map((p) => ({
    code: p.code,
    name: p.name,
    kind: p.kind,
    prices: p.prices ?? [],
    entitlements: { features: p.entitlements.features, limits: p.entitlements.limits, credits: (p.entitlements.credits ?? []).map((c) => ({ feature_key: c.feature, amount: c.amount, period: c.period, unit: 'credit' })) },
  }))
const on = (plan: string): BillingState =>
  ({ product: 'clip-v3', state: 'active', plan_code: plan, plan_version: 1, features: {}, limits: [], credits: [], currency: 'CAD', current_period_end: null, grace_until: null, cancel_at_period_end: false, channel: 'web' }) as BillingState

const fake = vi.hoisted(() => ({ plans: [] as unknown[], calls: 0 }))
vi.mock('@/components/billing/BillingRoot', () => ({
  billingClient: {
    plans: async () => {
      fake.calls++
      return { product: 'clip-v3', channel: 'web', currency: 'CAD', plans: fake.plans }
    },
  },
}))

afterEach(cleanup)

describe('les limites du plan, en mots', () => {
  it('les features à limite de l’app sont celles du manifeste', () => {
    expect([...LIMIT_FEATURES].sort()).toEqual(manifest.features.filter((f) => f.kind === 'limit').map((f) => f.key).sort())
  })

  it('la jauge s’allume à 80 % et dit « plein » à la limite ; illimité, jamais', () => {
    expect(usageLevel({ used: 19, limit: 25 })).toBe('ok')
    expect(usageLevel({ used: 20, limit: 25 })).toBe('near')
    expect(usageLevel({ used: 4, limit: 5 })).toBe('near')
    expect(usageLevel({ used: 5, limit: 5 })).toBe('full')
    expect(usageLevel({ used: 2, limit: 3 })).toBe('ok')
    expect(usageLevel({ used: 0, limit: 0 })).toBe('full')
    expect(usageLevel({ used: 900, limit: null })).toBe('ok')
    expect(usageLevel(null)).toBe('ok')
  })

  it('0 et 1 au singulier, et les instructions sont « publiées »', () => {
    expect(usageText('stations', 1, 5)).toBe('1 poste sur 5')
    expect(usageText('editors', 0, 1)).toBe('0 rédacteur sur 1')
    expect(usageText('stations', 21, 25)).toBe('21 postes sur 25')
    expect(usageText('published_instructions', 3, 3)).toBe('3 instructions publiées sur 3')
  })

  it('la fenêtre dit ce que le plan permet et où l’on en est, sans inventer de compte', () => {
    expect(limitReason('stations', 5, 5)).toBe('Votre plan permet 5 postes : la limite est atteinte.')
    expect(limitReason('stations', 25, 21)).toBe('Vous en êtes à 21 postes sur 25.')
    expect(limitReason('published_instructions', 3)).toBe('Votre plan permet 3 instructions publiées.')
    expect(limitReason('editors', 1, 1)).toBe('Votre plan permet 1 rédacteur : la limite est atteinte. Les lecteurs et les opérateurs ne se comptent jamais.')
  })

  it('les rédacteurs comptés : tous sauf les lecteurs, invitations comprises, au moins soi', () => {
    const m = (role: 'admin' | 'approver' | 'author' | 'reader') => ({ role, categories: [], stationIds: [] })
    expect(countEditors({ a: m('admin'), b: m('reader'), 'email:c@x.ca': m('author'), d: m('approver') })).toBe(3)
    expect(countEditors({})).toBe(1)
    expect(countEditors({ b: m('reader') })).toBe(1)
  })
})

describe('le plan qui en donne plus, sur la vraie grille', () => {
  it('le deuxième rédacteur mène à Équipe : Solo n’en compte qu’un', () => {
    expect(planFor(grid, on('free'), 'editors')?.code).toBe('equipe')
    expect(planFor(grid, on('solo'), 'editors')?.code).toBe('equipe')
    expect(planFor(grid, on('equipe'), 'editors')?.code).toBe('usine')
    expect(planFor(grid, on('usine'), 'editors')).toBeNull()
  })

  it('postes et instructions publiées : le plan suivant, et ce qu’il donne', () => {
    const stations = planFor(grid, on('solo'), 'stations')!
    expect(offerText(stations, 'stations')).toBe('Équipe : 25 postes')
    expect(offerText(planFor(grid, on('free'), 'published_instructions')!, 'published_instructions')).toBe('Solo : 30 instructions publiées')
    expect(offerText(planFor(grid, on('solo'), 'published_instructions')!, 'published_instructions')).toBe('Équipe : instructions publiées sans limite')
    expect(offerText(planFor(grid, on('equipe'), 'stations')!, 'stations')).toBe('Usine : 100 postes')
  })
})

function Probe() {
  const { paywall } = useBilling()
  return <output data-testid="paywall">{paywall ? JSON.stringify({ feature: paywall.feature, used: paywall.used }) : ''}</output>
}

function wrap(ui: ReactNode, plan = 'solo') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const client = { context: vi.fn(async () => on(plan)), check: vi.fn(), plans: vi.fn(), checkout: vi.fn(), portal: vi.fn() }
  return render(
    <QueryClientProvider client={qc}>
      <BillingProvider client={client as never} session="u1" enabled>
        {ui}
        <Probe />
      </BillingProvider>
    </QueryClientProvider>,
  )
}

describe('la jauge d’une limite', () => {
  it('à 80 % : elle s’allume, nomme le plan qui en donne plus et ouvre la fenêtre avec le compte', async () => {
    fake.plans = grid
    const v = wrap(<UsageMeter feature="stations" limit={{ limit: 5, used: 4, remaining: 1, reached: false }} />)
    expect(v.getByText('4 postes sur 5 dans votre plan')).toBeTruthy()
    expect(v.getByText(/Bientôt plein/)).toBeTruthy()
    await waitFor(() => expect(v.getByText('Équipe : 25 postes.')).toBeTruthy())
    act(() => fireEvent.click(v.getByRole('button', { name: 'Voir Équipe' })))
    expect(v.getByTestId('paywall').textContent).toBe(JSON.stringify({ feature: 'stations', used: 4 }))
  })

  it('loin de la limite : une ligne discrète, sans lire les plans ; `quiet` : rien', async () => {
    fake.plans = grid
    fake.calls = 0
    const v = wrap(<UsageMeter feature="stations" limit={{ limit: 25, used: 3, remaining: 22, reached: false }} />, 'equipe')
    expect(v.getByText('3 postes sur 25 dans votre plan')).toBeTruthy()
    expect(v.queryByText(/Bientôt plein/)).toBeNull()
    const q = wrap(<UsageMeter feature="editors" limit={{ limit: 5, used: 2, remaining: 3, reached: false }} quiet />, 'equipe')
    expect(q.queryByText(/rédacteurs? sur/)).toBeNull()
    await act(async () => undefined)
    expect(fake.calls).toBe(0)
  })

  it('facturation éteinte ou limite illimitée : rien du tout', () => {
    const v = wrap(
      <>
        <UsageMeter feature="stations" limit={null} />
        <UsageMeter feature="published_instructions" limit={{ limit: null, used: 80, remaining: null, reached: false }} />
      </>,
    )
    expect(v.queryByRole('meter')).toBeNull()
    expect(v.queryByText(/sur/)).toBeNull()
  })
})
