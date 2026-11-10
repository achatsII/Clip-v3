import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emitSettled } from '@/lib/billing/bus'
import { createBillingClient, hasFeature, limitOf, type BillingState } from '@/lib/billing/client'
import { BillingProvider, useBilling, useEntitlement, useLimit } from '@/lib/billing/state'

const stateFor = (plan: string, features: Record<string, boolean>, limits: BillingState['limits'] = []): BillingState =>
  ({ product: 'clip-v3', state: 'active', plan_code: plan, plan_version: 1, features, limits, credits: [], currency: 'CAD', current_period_end: null, grace_until: null, cancel_at_period_end: false, channel: 'web' }) as BillingState

function fakeBilling(context: () => Promise<BillingState>) {
  return { context: vi.fn(context), check: vi.fn(), plans: vi.fn(), checkout: vi.fn(), portal: vi.fn() } as unknown as ReturnType<typeof createBillingClient> & { context: ReturnType<typeof vi.fn> }
}

function Probe() {
  const { state, loading } = useBilling()
  const e = useEntitlement('bulk_import')
  const l = useLimit('stations', 2)
  return <span data-testid="out">{`${e}|${loading}|${state?.plan_code ?? '-'}|${l ? `${l.used}/${l.limit}${l.reached ? '!' : ''}` : 'nolimit'}`}</span>
}

afterEach(cleanup)

describe('BillingProvider et useEntitlement', () => {
  it('off quand la facturation est éteinte, sans aucune lecture ni verrou', () => {
    const client = fakeBilling(async () => stateFor('usine', { bulk_import: true }))
    const v = render(<BillingProvider client={client} session="u1" enabled={false}><Probe /></BillingProvider>)
    expect(v.getByTestId('out').textContent).toBe('off|false|-|nolimit')
    expect(client.context).not.toHaveBeenCalled()
  })

  it('pending pendant la lecture, puis locked sans le droit et open avec', async () => {
    let resolve: (s: BillingState) => void = () => undefined
    const client = fakeBilling(() => new Promise((r) => (resolve = r)))
    const v = render(<BillingProvider client={client} session="u1" enabled><Probe /></BillingProvider>)
    expect(v.getByTestId('out').textContent).toBe('pending|true|-|nolimit')
    await act(async () => resolve(stateFor('free', { bulk_import: false }, [{ feature_key: 'stations', used: 0, limit: 2 }])))
    expect(v.getByTestId('out').textContent).toBe('locked|false|free|2/2!')

    const open = fakeBilling(async () => stateFor('usine', { bulk_import: true }, [{ feature_key: 'stations', used: 0, limit: 100 }]))
    const w = render(<BillingProvider client={open} session="u2" enabled><Probe /></BillingProvider>)
    await waitFor(() => expect(w.getAllByTestId('out').at(-1)?.textContent).toBe('open|false|usine|2/100'))
  })

  it('état illisible (passerelle en panne) : la fonction et la limite se ferment, jamais ouvertes', async () => {
    const client = fakeBilling(async () => {
      throw new Error('502')
    })
    const v = render(<BillingProvider client={client} session="u4" enabled><Probe /></BillingProvider>)
    await waitFor(() => expect(v.getByTestId('out').textContent).toBe('locked|false|-|2/0!'))
  })

  it('relit l’état après chaque opération d’IA (le solde a bougé)', async () => {
    const client = fakeBilling(async () => stateFor('solo', {}))
    render(<BillingProvider client={client} session="u3" enabled><Probe /></BillingProvider>)
    await waitFor(() => expect(client.context).toHaveBeenCalledTimes(1))
    act(() => emitSettled())
    await waitFor(() => expect(client.context).toHaveBeenCalledTimes(2))
  })
})

describe('client de facturation', () => {
  it('envoie le jeton et X-Product, et traduit un refus par son code', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: 'not_entitled', detail: 'Non', reason: null }), { status: 403 }))
    const client = createBillingClient({ gatewayUrl: 'https://gw.test', getToken: () => 'tok', refresh: async () => false, fetch: fetchMock as unknown as typeof fetch })
    await expect(client.context()).rejects.toMatchObject({ status: 403, code: 'not_entitled' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://gw.test/api/v2/billing/context')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok', 'X-Product': 'clip-v3' })
  })

  it('check() ne lève pas : le verdict est dans le corps', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ allowed: false, feature_key: 'stations', reason: 'limit_reached' }), { status: 200 }))
    const client = createBillingClient({ gatewayUrl: 'https://gw.test', getToken: () => 'tok', fetch: fetchMock as unknown as typeof fetch })
    expect(await client.check('stations', { intent: 'add' })).toMatchObject({ allowed: false, reason: 'limit_reached' })
  })

  it('limitOf : absente = 0, null = illimité ; hasFeature ne bloque rien sans état', () => {
    const s = stateFor('free', { approvals: false }, [{ feature_key: 'stations', used: 0, limit: 2 }, { feature_key: 'published_instructions', used: 0, limit: null }])
    expect(limitOf(s, 'stations', 2)).toMatchObject({ reached: true, remaining: 0 })
    expect(limitOf(s, 'published_instructions', 500)).toMatchObject({ reached: false, remaining: null })
    expect(limitOf(s, 'editors', 0)).toMatchObject({ limit: 0, reached: true })
    expect(limitOf(null, 'stations')).toBeNull()
    expect(hasFeature(null, 'approvals')).toBe(true)
    expect(hasFeature(s, 'approvals')).toBe(false)
  })
})
