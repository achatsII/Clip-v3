import { describe, expect, it } from 'vitest'
import { dataApi } from '@/lib/gateway/data'
import { ApiError } from '@/lib/gateway/client'
import { fakeGateway } from './fakeClient'

describe('dataApi (application partagée « html »)', () => {
  it('écrit le slug clip-v3 dans chaque document et le filtre à chaque lecture', async () => {
    const gw = fakeGateway((endpoint) => (endpoint.endsWith('/filter') ? { results: [{ _id: '1', json_data: { app_identifier: 'clip-v3', a: 1 } }, { _id: '2', json_data: { app_identifier: 'autre-app' } }] } : { results: [{ inserted_id: 'x', json_data: {} }] }))
    const data = dataApi(gw)
    await data.insert('clip_station', { name: 'Poste A' })
    expect((gw.calls[0].options.body as { json_data: Record<string, unknown> }).json_data).toMatchObject({ name: 'Poste A', app_identifier: 'clip-v3' })

    const docs = await data.filter('clip_station', { filter: { 'json_data.name': { $eq: 'Poste A' } } })
    const body = gw.calls[1].options.body as { mongo_filter: { $and: unknown[] } }
    expect(body.mongo_filter.$and[0]).toEqual({ 'json_data.app_identifier': { $eq: 'clip-v3' } })
    // Un document d'une autre page « html » ne remonte jamais, même si le serveur le rendait.
    expect(docs.map((d) => d._id)).toEqual(['1'])
  })

  it('compte en POST avec le filtre dans le corps', async () => {
    const gw = fakeGateway(() => ({ success: true, count: 3 }))
    expect(await dataApi(gw).count('clip_event', { 'json_data.type': { $eq: 'view' } })).toBe(3)
    expect(gw.calls[0].endpoint).toBe('/api/v1/data/clip_event/count')
    expect(gw.calls[0].options.method).toBe('POST')
  })

  it('lit `result` au singulier et traite le 404 comme « absent »', async () => {
    const ok = fakeGateway(() => ({ result: { _id: 'a', json_data: { app_identifier: 'clip-v3' } } }))
    expect((await dataApi(ok).get('clip_org', 'a'))?._id).toBe('a')
    const missing = fakeGateway(() => new ApiError('introuvable', 404))
    expect(await dataApi(missing).get('clip_org', 'a')).toBeNull()
    const foreign = fakeGateway(() => ({ result: { _id: 'a', json_data: { app_identifier: 'autre' } } }))
    expect(await dataApi(foreign).get('clip_org', 'a')).toBeNull()
  })

  it('met à jour par PATCH (seules les clés données) et supprime sans segment /one/', async () => {
    const gw = fakeGateway(() => ({ results: [{ updated_count: 1 }] }))
    const data = dataApi(gw)
    await data.patch('clip_instruction', 'i1', { status: 'published' })
    await data.remove('clip_instruction', 'i1')
    expect(gw.calls[0]).toMatchObject({ endpoint: '/api/v1/data/clip_instruction/one/i1', options: { method: 'PATCH', body: { json_data: { status: 'published' } } } })
    expect(gw.calls[1]).toMatchObject({ endpoint: '/api/v1/data/clip_instruction/i1', options: { method: 'DELETE' } })
  })
})
