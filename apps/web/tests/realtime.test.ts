// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

const created = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>> }))
vi.mock('ably', () => ({
  Rest: class {
    auth = {
      createTokenRequest: async (p: Record<string, unknown>) => {
        created.calls.push(p)
        return { keyName: 'app.key', capability: JSON.stringify(p.capability), clientId: p.clientId, nonce: 'n', mac: 'm' }
      },
    }
  },
}))

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/realtime/token/route'
import { isRealtimeEvent, orgChannel, refreshFor } from '@/lib/realtime/events'

const req = (auth?: string) => new NextRequest('http://localhost/api/realtime/token', { method: 'POST', headers: auth ? { authorization: auth } : {} })
const TOKEN = `Bearer ${'x'.repeat(40)}`

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  created.calls.length = 0
})

describe('le jeton Ably d’un appareil', () => {
  it('sans clé Ably, le temps réel est éteint', async () => {
    vi.stubEnv('ABLY_KEY', '')
    expect((await POST(req(TOKEN))).status).toBe(404)
  })

  it('il faut être connecté, et la Gateway doit reconnaître le jeton', async () => {
    vi.stubEnv('ABLY_KEY', 'app.key:secret')
    expect((await POST(req())).status).toBe(401)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })))
    expect((await POST(req(TOKEN))).status).toBe(401)
    expect(created.calls).toHaveLength(0)
  })

  it('le jeton ne vaut que pour le canal de l’organisation de la personne', async () => {
    vi.stubEnv('ABLY_KEY', 'app.key:secret')
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ user: { sub: 'u1' }, results: { organization: { id: 'ORG-42' } } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await POST(req(TOKEN))
    expect(res.status).toBe(200)
    expect(created.calls[0]).toMatchObject({ clientId: 'u1', capability: { 'clip:org:org-42': ['publish', 'subscribe', 'presence'] } })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/api\/v1\/auth\/me$/)
    expect(init.headers).toMatchObject({ Authorization: TOKEN })
  })
})

describe('les événements du canal', () => {
  it('chaque phase dit quoi relire', () => {
    expect(orgChannel('ABC')).toBe('clip:org:abc')
    expect(refreshFor({ type: 'creation', id: 'i1', phase: 'stage', stage: 'analyze' })).toEqual(['creations'])
    expect(refreshFor({ type: 'creation', id: 'i1', phase: 'start' })).toEqual(['creations', 'instructions'])
    expect(refreshFor({ type: 'creation', id: 'i1', phase: 'done' })).toEqual(['creations', 'instructions', 'instruction:i1'])
  })

  it('un message inconnu est ignoré', () => {
    expect(isRealtimeEvent({ type: 'creation', id: 'i1', phase: 'done' })).toBe(true)
    expect(isRealtimeEvent({ type: 'creation', id: 'i1', phase: 'autre' })).toBe(false)
    expect(isRealtimeEvent({ type: 'autre' })).toBe(false)
    expect(isRealtimeEvent(null)).toBe(false)
  })
})
