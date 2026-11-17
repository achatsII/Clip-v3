import { describe, expect, it } from 'vitest'
import { APP_IDENTIFIER, SHARED_APP } from '@/lib/config'
import { dataApi } from '@/lib/gateway/data'
import { fakeGateway } from './fakeClient'

// L'application de Clip à la Gateway (`clip-v2`, le défaut) : la Gateway cloisonne, Clip n'ajoute rien.
describe('dataApi (application de Clip, `clip-v2`)', () => {
  it('se connecte par `clip-v2` sans variable', () => {
    expect(process.env.NEXT_PUBLIC_APP_IDENTIFIER ?? '').toBe('')
    expect(APP_IDENTIFIER).toBe('clip-v2')
    expect(SHARED_APP).toBe(false)
  })

  it('n’écrit ni ne filtre le slug, et garde les documents tels que la Gateway les rend', async () => {
    const gw = fakeGateway((endpoint) => (endpoint.endsWith('/filter') ? { results: [{ _id: '1', json_data: { a: 1 } }, { _id: '2', json_data: { app_identifier: 'clip-v3' } }] } : { results: [{ inserted_id: 'x', json_data: {} }] }))
    const data = dataApi(gw)
    await data.insert('clip_station', { name: 'Poste A' })
    expect((gw.calls[0].options.body as { json_data: Record<string, unknown> }).json_data).toEqual({ name: 'Poste A' })

    const docs = await data.filter('clip_station', { filter: { 'json_data.name': { $eq: 'Poste A' } }, projection: { 'json_data.name': 1 } })
    const body = gw.calls[1].options.body as { mongo_filter: unknown; projection: unknown }
    expect(body.mongo_filter).toEqual({ 'json_data.name': { $eq: 'Poste A' } })
    expect(body.projection).toEqual({ 'json_data.name': 1 })
    expect(docs.map((d) => d._id)).toEqual(['1', '2'])
  })
})
