import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Un Ably factice : une connexion dont on choisit l'état, un canal qui note ce qu'il publie.
const ably = vi.hoisted(() => {
  const published: unknown[] = []
  const handlers: Array<(c: { current: string }) => void> = []
  const connection = { state: 'connected', on: (fn: (c: { current: string }) => void) => handlers.push(fn), connect: vi.fn() }
  const channel = { state: 'attached', on: () => undefined, publish: vi.fn(async (_n: string, e: unknown) => void published.push(e)) }
  const go = (state: string) => {
    connection.state = state
    handlers.forEach((fn) => fn({ current: state }))
  }
  return { published, connection, channel, go }
})
vi.mock('ably', () => ({
  Realtime: class {
    connection = ably.connection
    channels = { get: () => ably.channel }
    close() {}
  },
}))
const filter = vi.fn()
vi.mock('@/components/providers/Session', () => ({ useSession: () => ({ data: { filter } }) }))

import { useDraftWatch } from '@/hooks/useDraftWatch'
import { connectRealtime, disconnectRealtime, publishRealtime, setRealtimeState } from '@/lib/realtime/client'
import { readVersion } from '@/lib/realtime/liveDraft'

const draft = (id: string, at: string) => ({ type: 'draft' as const, id, device: 'app' as const, from: 'telephone', at })

afterEach(() => {
  cleanup()
  disconnectRealtime()
  ably.published.length = 0
  ably.channel.publish.mockClear()
  ably.connection.connect.mockClear()
  ably.connection.state = 'connected'
})

describe('une annonce ne se perd pas pendant que la connexion revient', () => {
  it('connexion coupée (téléphone sorti de veille) : l’annonce attend, la reconnexion part tout de suite, puis elle part', async () => {
    await connectRealtime('org1', () => 'jeton')
    ably.go('suspended')
    publishRealtime(draft('i1', '2026-11-12T15:00:01Z'))
    publishRealtime(draft('i1', '2026-11-12T15:00:02Z'))
    expect(ably.channel.publish).not.toHaveBeenCalled()
    expect(ably.connection.connect).toHaveBeenCalled()
    ably.go('connected')
    // La dernière version de l'instruction seulement.
    expect(ably.published).toEqual([draft('i1', '2026-11-12T15:00:02Z')])
  })

  it('connexion branchée : l’annonce part aussitôt', async () => {
    await connectRealtime('org1', () => 'jeton')
    publishRealtime(draft('i2', '2026-11-12T15:00:03Z'))
    expect(ably.published).toEqual([draft('i2', '2026-11-12T15:00:03Z')])
  })

  it('revenir à l’écran relance la connexion sans attendre le prochain essai', async () => {
    await connectRealtime('org1', () => 'jeton')
    ably.go('disconnected')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(ably.connection.connect).toHaveBeenCalled()
  })
})

describe('la version annoncée, pas une lecture trop hâtive', () => {
  it('la Gateway rend encore l’ancienne version : on relit jusqu’à avoir celle annoncée', async () => {
    const versions = ['2026-11-12T15:00:00Z', '2026-11-12T15:00:00Z', '2026-11-12T15:00:05Z']
    const read = vi.fn(async () => ({ json_data: { updatedAt: versions.shift() } }))
    const sleep = vi.fn(async (_ms: number) => undefined)
    const doc = await readVersion(read, '2026-11-12T15:00:05Z', [500, 1200, 2500], sleep)
    expect(doc?.json_data.updatedAt).toBe('2026-11-12T15:00:05Z')
    expect(read).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([500, 1200])
  })

  it('déjà à jour, ou sans version annoncée : une seule lecture', async () => {
    const read = vi.fn(async () => ({ json_data: { updatedAt: '2026-11-12T15:00:09Z' } }))
    await readVersion(read, '2026-11-12T15:00:05Z', [500])
    await readVersion(read, undefined, [500])
    expect(read).toHaveBeenCalledTimes(2)
  })
})

describe('une annonce manquée se rattrape', () => {
  beforeEach(() => {
    filter.mockReset()
    filter.mockResolvedValue([{ _id: 'i1', json_data: { updatedAt: '2026-11-12T15:00:05Z', updatedFrom: 'telephone', updatedVia: 'app' } }])
  })
  function Watch({ onRemote }: { onRemote: (r: unknown) => void }) {
    useDraftWatch({ id: 'i1', enabled: true, known: () => '2026-11-12T15:00:00Z', idle: () => true, onRemote })
    return null
  }
  const mount = (onRemote: (r: unknown) => void) => render(<QueryClientProvider client={new QueryClient()}><Watch onRemote={onRemote} /></QueryClientProvider>)

  it('le direct revient après une coupure : on vérifie une fois', async () => {
    setRealtimeState('live')
    const onRemote = vi.fn()
    mount(onRemote)
    expect(filter).not.toHaveBeenCalled()
    await act(async () => setRealtimeState('connecting'))
    await act(async () => setRealtimeState('live'))
    expect(filter).toHaveBeenCalledTimes(1)
    expect(onRemote).toHaveBeenCalledWith(expect.objectContaining({ updatedAt: '2026-11-12T15:00:05Z' }))
  })

  it('revenir à l’écran : on vérifie tout de suite, même avec le direct branché', async () => {
    setRealtimeState('live')
    const onRemote = vi.fn()
    mount(onRemote)
    await act(async () => void window.dispatchEvent(new Event('focus')))
    expect(filter).toHaveBeenCalledTimes(1)
    expect(onRemote).toHaveBeenCalled()
  })
})
