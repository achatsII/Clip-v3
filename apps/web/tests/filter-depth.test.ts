import { describe, expect, it } from 'vitest'
import { dataApi, filterDepth, flattenFilter, MAX_FILTER_DEPTH } from '@/lib/gateway/data'
import type { GatewayClient } from '@/lib/gateway/client'
import { inboxInstructions, instructionsWhere, libraryFilter } from '@/lib/model/search'

/**
 * La Gateway refuse un `mongo_filter` de plus de 5 niveaux (« mongo_filter exceeds maximum depth of 5 »,
 * 400) ; novembre 2026, « À voir » et l'accueil tombaient en erreur avec `clip-v2`. Chaque filtre part
 * aplati, sans changer de sens.
 */
function capture() {
  const bodies: Array<Record<string, unknown>> = []
  const client = {
    call: async (_e: string, o?: { body?: unknown }) => {
      bodies.push((o?.body ?? {}) as Record<string, unknown>)
      return { results: [], count: 0 }
    },
  } as unknown as GatewayClient
  return { data: dataApi(client), bodies }
}

describe('la profondeur des filtres', () => {
  it('compte comme la Gateway : le filtre refusé a 6 niveaux, celui de la bibliothèque 5', () => {
    const refused = { $and: [{ s: { $ne: 'archived' } }, { $or: [{ s: { $eq: 'review' } }, { $and: [{ a: { $eq: 'u' } }, { r: { $exists: true } }] }] }] }
    expect(filterDepth(refused)).toBe(6)
    expect(filterDepth(libraryFilter({}, []))).toBe(5)
  })

  it('aplatit sans changer le sens', () => {
    expect(flattenFilter({ $and: [{ a: 1 }, { $and: [{ b: 2 }, { c: 3 }] }] })).toEqual({ a: 1, b: 2, c: 3 })
    // Deux conditions sur le même champ restent séparées.
    expect(flattenFilter({ $and: [{ a: { $gt: 1 } }, { a: { $lt: 5 } }] })).toEqual({ $and: [{ a: { $gt: 1 } }, { a: { $lt: 5 } }] })
    expect(flattenFilter({ $or: [{ x: 1 }, { $and: [{ y: 2 }, { z: 3 }] }] })).toEqual({ $or: [{ x: 1 }, { y: 2, z: 3 }] })
    expect(flattenFilter({ a: { $in: [null, 0] } })).toEqual({ a: { $in: [null, 0] } })
  })

  it('« À voir » et les cartes de l’accueil partent sous la limite', async () => {
    const { data, bodies } = capture()
    await inboxInstructions(data, 'u1')
    await instructionsWhere(data, { $and: [{ 'json_data.authorId': { $eq: 'u1' } }, { 'json_data.status': { $ne: 'review' } }, { $or: [{ 'json_data.publishedVersion': { $in: [null, 0] } }, { 'json_data.dirty': { $eq: true } }] }] }, 4)
    await instructionsWhere(data, { $and: [{ 'json_data.publishedVersion': { $gt: 0 } }, { $or: [{ 'json_data.category': { $in: ['a'] } }, { 'json_data.stationIds': { $in: ['s'] } }] }] }, 6)
    await data.filter('clip_instruction', { filter: libraryFilter({ q: 'pompe moteur', status: 'draft', category: 'sst', stationIds: ['s'], mine: { userId: 'u', categories: ['c'], stationIds: ['s'] }, labels: { f: ['v'] } }, [{ id: 's', name: 'Pompe' }]) })
    expect(bodies).toHaveLength(4)
    for (const b of bodies) expect(filterDepth(b.mongo_filter)).toBeLessThanOrEqual(MAX_FILTER_DEPTH)
  })
})
