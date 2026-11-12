// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const ably = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>>, refuse: null as null | { code: number } }))
vi.mock('ably', () => ({
  Rest: class {
    auth = {
      requestToken: async (p: Record<string, unknown>) => {
        ably.calls.push(p)
        if (ably.refuse) throw Object.assign(new Error('refus'), ably.refuse)
        return { token: 't' }
      },
    }
  },
}))

import { realtimeStatus } from '@/lib/realtime/status'

describe('le diagnostic du temps réel', () => {
  it('sans clé : non configuré, sans appeler Ably', async () => {
    expect(await realtimeStatus(undefined)).toEqual({ configured: false, ok: false })
    expect(ably.calls).toHaveLength(0)
  })

  it('demande un vrai jeton avec les droits de l’app, et garde la réponse 10 minutes', async () => {
    const t0 = 1_000_000
    expect(await realtimeStatus('app.cle:secret', t0)).toEqual({ configured: true, ok: true })
    expect(ably.calls[0].capability).toEqual({ 'clip:org:diagnostic': ['publish', 'subscribe', 'presence'] })
    await realtimeStatus('app.cle:secret', t0 + 60_000)
    expect(ably.calls).toHaveLength(1)
    await realtimeStatus('app.cle:secret', t0 + 11 * 60_000)
    expect(ably.calls).toHaveLength(2)
  })

  it('dit le code d’Ably quand il refuse la clé, sans rien en montrer', async () => {
    ably.refuse = { code: 40160 }
    const s = await realtimeStatus('app.autre:secret', 5_000_000)
    expect(s).toEqual({ configured: true, ok: false, code: 40160 })
    expect(JSON.stringify(s)).not.toContain('secret')
  })
})
