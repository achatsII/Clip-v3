import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const bridge = vi.hoisted(() => ({ caps: [] as string[], calls: [] as Array<[string, unknown]>, offers: {} as Record<string, unknown> }))
vi.mock('@/lib/bridge/native', () => ({
  nativeEnv: () => ({ platform: 'ios', capabilities: bridge.caps }),
  hasCapability: (c: string) => bridge.caps.includes(c),
  callNative: vi.fn(async (type: string, payload: unknown) => {
    bridge.calls.push([type, payload])
    if (type === 'store.offers') return { offers: bridge.offers }
    if (type === 'store.purchase') return { outcome: 'purchased' }
    return {}
  }),
}))

import { StoreBuy } from '@/components/billing/Store'
import { ToastProvider } from '@/components/ui/Toast'
import { BillingError, createBillingClient, type BillingState, type PublicPlan } from '@/lib/billing/client'
import { BillingProvider } from '@/lib/billing/state'
import { buyInStore, restoreInStore, storeDisclosure, storePurchaseText, StorePurchaseError, type StoreNative } from '@/lib/billing/store'

const state = (over: Partial<BillingState> = {}): BillingState =>
  ({ product: 'clip-v3', state: 'active', plan_code: 'free', plan_version: 1, features: {}, limits: [], credits: [], currency: 'CAD', current_period_end: null, grace_until: null, cancel_at_period_end: false, channel: 'none', ...over }) as BillingState
const solo: PublicPlan = {
  code: 'solo',
  name: 'Solo',
  kind: 'base',
  prices: [
    { interval: 'monthly', currency: 'CAD', amount_cents: 4900, store_product_id: 'clip_v3_solo_monthly_v1' },
    { interval: 'yearly', currency: 'CAD', amount_cents: 49000, store_product_id: 'clip_v3_solo_yearly_v1' },
  ],
  entitlements: {},
}
const native = (r: Awaited<ReturnType<StoreNative['purchase']>>): StoreNative => ({ purchase: vi.fn(async () => r), restore: vi.fn(async () => ({ ok: true })) })
const noSleep = async () => undefined

afterEach(() => {
  cleanup()
  bridge.caps = []
  bridge.calls.length = 0
  bridge.offers = {}
})

describe('acheter dans le magasin', () => {
  it('l’achat fait, la plateforme le relit : le plan est ouvert', async () => {
    const client = { mobileSync: vi.fn(async () => state({ plan_code: 'solo', channel: 'ios' })), context: vi.fn() }
    expect(await buyInStore(client, native({ outcome: 'purchased' }), 'clip_v3_solo_monthly_v1', { platform: 'ios', planCode: 'solo', sleep: noSleep })).toBe('active')
    expect(client.context).not.toHaveBeenCalled()
  })

  it('la relecture tarde : l’état se relit en filet, puis « en cours de validation »', async () => {
    const late = { mobileSync: vi.fn(async () => state()), context: vi.fn().mockResolvedValueOnce(state()).mockResolvedValueOnce(state({ plan_code: 'solo', channel: 'ios' })) }
    expect(await buyInStore(late, native({ outcome: 'purchased' }), 'p', { platform: 'ios', planCode: 'solo', sleep: noSleep })).toBe('active')
    const never = { mobileSync: vi.fn(async () => state()), context: vi.fn(async () => state()) }
    expect(await buyInStore(never, native({ outcome: 'purchased' }), 'p', { platform: 'ios', planCode: 'solo', attempts: 2, sleep: noSleep })).toBe('pending')
  })

  it('rappelée trop tôt, la relecture attend son délai et reprend une fois ; un compte sans organisation remonte', async () => {
    const sleep = vi.fn(noSleep)
    const client = { mobileSync: vi.fn().mockRejectedValueOnce(new BillingError(429, 'rate_limited', null, 'tôt', 3)).mockResolvedValueOnce(state({ plan_code: 'solo', channel: 'ios' })), context: vi.fn() }
    expect(await buyInStore(client, native({ outcome: 'purchased' }), 'p', { platform: 'ios', planCode: 'solo', sleep })).toBe('active')
    expect(sleep).toHaveBeenCalledWith(3000)
    const lost = { mobileSync: vi.fn(async () => Promise.reject(new BillingError(409, 'org_unresolved', null, 'non'))), context: vi.fn() }
    await expect(buyInStore(lost, native({ outcome: 'purchased' }), 'p', { platform: 'ios', sleep: noSleep })).rejects.toMatchObject({ code: 'org_unresolved' })
  })

  it('abandonné : rien ; en attente : sans relecture ; refusé : la raison', async () => {
    const client = { mobileSync: vi.fn(), context: vi.fn() }
    expect(await buyInStore(client, native({ outcome: 'cancelled' }), 'p', { platform: 'ios', sleep: noSleep })).toBe('cancelled')
    expect(await buyInStore(client, native({ outcome: 'pending' }), 'p', { platform: 'ios', sleep: noSleep })).toBe('pending')
    expect(client.mobileSync).not.toHaveBeenCalled()
    await expect(buyInStore(client, native({ outcome: 'failed', failure: 'other_account' }), 'p', { platform: 'ios', sleep: noSleep })).rejects.toMatchObject({ kind: 'other_account' })
  })

  it('restaurer : retrouve, puis fait relire ; un refus garde sa raison', async () => {
    const client = { mobileSync: vi.fn(async () => state({ plan_code: 'solo', channel: 'ios' })), context: vi.fn() }
    expect((await restoreInStore(client, native({ outcome: 'purchased' })))?.plan_code).toBe('solo')
    const bad: StoreNative = { purchase: vi.fn(), restore: vi.fn(async () => ({ ok: false, failure: 'network' as const })) }
    await expect(restoreInStore(client, bad)).rejects.toBeInstanceOf(StorePurchaseError)
  })
})

describe('ce que l’app dit, sans lien ni prix d’ailleurs', () => {
  it('pourquoi l’achat n’est pas offert ici', () => {
    expect(storePurchaseText({ allowed: true, reason: null, managed_in: null }, 'ios')).toBeNull()
    expect(storePurchaseText({ allowed: false, reason: 'team_organization', managed_in: null }, 'ios')).toMatch(/personnel/)
    expect(storePurchaseText({ allowed: false, reason: 'managed_elsewhere', managed_in: 'android' }, 'ios')).toMatch(/Google Play/)
    expect(storePurchaseText({ allowed: false, reason: 'managed_elsewhere', managed_in: 'web' }, 'ios')).not.toMatch(/web|Stripe|\$/)
    expect(storePurchaseText(undefined, 'android')).toMatch(/administrateur/)
  })

  it('les mentions avant l’achat : prix, durée, renouvellement, compte du magasin, annulation', () => {
    const t = storeDisclosure({ planName: 'Solo', price: '49,00 $', interval: 'monthly', platform: 'ios' })
    expect(t).toMatch(/49,00 \$ par mois/)
    expect(t).toMatch(/renouvelé automatiquement/)
    expect(t).toMatch(/compte App Store/)
    expect(t).toMatch(/Annulez/)
  })

  it('le client relit l’achat par mobile/sync, lit Retry-After, et demande les plans du canal de l’appareil', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      String(url).includes('mobile/sync') ? new Response(JSON.stringify({ code: 'rate_limited' }), { status: 429, headers: { 'Retry-After': '7' } }) : new Response(JSON.stringify({ plans: [] }), { status: 200 }),
    )
    const client = createBillingClient({ gatewayUrl: 'https://gw.test', getToken: () => 'tok', refresh: async () => false, fetch: fetchMock as unknown as typeof fetch, channel: () => 'android' })
    await expect(client.mobileSync()).rejects.toMatchObject({ status: 429, code: 'rate_limited', retryAfterSeconds: 7 })
    await client.plans()
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toEqual(['https://gw.test/api/v2/billing/mobile/sync', 'https://gw.test/api/v2/billing/plans?channel=android'])
  })
})

function wrap(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const billing = { context: vi.fn(async () => state()), check: vi.fn(), plans: vi.fn(), checkout: vi.fn(), portal: vi.fn(), mobileSync: vi.fn(async () => state({ plan_code: 'solo', channel: 'ios' })) }
  return { billing, ...render(<QueryClientProvider client={qc}><ToastProvider><BillingProvider client={billing as never} session="u1" enabled>{ui}</BillingProvider></ToastProvider></QueryClientProvider>) }
}

describe('l’achat dans l’app, à l’écran', () => {
  it('permis : le prix du magasin, les mentions, l’achat qui ouvre le plan', async () => {
    bridge.caps = ['store.connect', 'store.offers', 'store.purchase', 'store.restore', 'openExternal']
    bridge.offers = { clip_v3_solo_monthly_v1: { priceString: '49,99 $', price: 49.99, currencyCode: 'CAD', perMonth: 49.99, intro: null, introEligible: null } }
    const onActive = vi.fn()
    const v = wrap(<StoreBuy client={{ mobileSync: async () => state({ plan_code: 'solo', channel: 'ios' }), context: async () => state() } as never} plan={solo} interval="monthly" storePurchase={{ allowed: true, reason: null, managed_in: null }} platform="ios" onActive={onActive} />)
    await waitFor(() => expect(v.getByText('49,99 $')).toBeTruthy())
    expect(v.getByText(/renouvelé automatiquement/)).toBeTruthy()
    expect(v.getByText('Conditions d’utilisation (Apple)')).toBeTruthy()
    await act(async () => fireEvent.click(v.getByRole('button', { name: 'S’abonner à Solo' })))
    await waitFor(() => expect(onActive).toHaveBeenCalled())
    expect(bridge.calls.map((c) => c[0])).toContain('store.purchase')
  })

  it('une équipe : une phrase, aucun achat ; sans capacité (Expo Go) : bientôt', async () => {
    bridge.caps = ['store.connect', 'store.offers', 'store.purchase', 'store.restore']
    const team = wrap(<StoreBuy client={{} as never} plan={solo} interval="monthly" storePurchase={{ allowed: false, reason: 'team_organization', managed_in: null }} platform="ios" />)
    expect(team.getByText(/personnel/)).toBeTruthy()
    expect(team.queryByRole('button', { name: /S’abonner/ })).toBeNull()
    await act(async () => undefined)
    expect(bridge.calls).toHaveLength(0)
    cleanup()
    bridge.caps = []
    const go = wrap(<StoreBuy client={{} as never} plan={solo} interval="monthly" storePurchase={{ allowed: true, reason: null, managed_in: null }} platform="ios" />)
    expect(go.getByText(/arrive bientôt/)).toBeTruthy()
    expect(bridge.calls).toHaveLength(0)
  })
})
