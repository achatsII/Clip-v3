import { describe, expect, it } from 'vitest'
import type { DataApi, Doc, FilterOptions } from '@/lib/gateway/data'
import type { UsageEvent } from '@/lib/model/types'
import { DATA_PAGE, EVENTS_CAP, loadEvents } from '@/lib/reports/load'

/** Une fausse Gateway : comme la vraie, elle refuse un `limit` au-delà de 10 000 (400). */
function gateway(total: number, opts: { insertBeforePage?: number } = {}) {
  let docs: Array<Doc<UsageEvent>> = Array.from({ length: total }, (_, i) => ({ _id: `e${String(total - i).padStart(6, '0')}`, json_data: { type: 'complete', instructionId: 'i1', at: '2026-11-01T10:00:00.000Z' } as UsageEvent }))
  const calls: FilterOptions[] = []
  const api = {
    async filter<T>(_type: string, o: FilterOptions = {}): Promise<Array<Doc<T>>> {
      if (o.limit !== undefined && (!Number.isInteger(o.limit) || o.limit < 0 || o.limit > 10_000)) throw Object.assign(new Error('limit must be an integer between 0 and 10000'), { status: 400 })
      calls.push(o)
      // Un événement écrit pendant la lecture : il arrive en tête (le plus récent).
      if (opts.insertBeforePage !== undefined && calls.length - 1 === opts.insertBeforePage) docs = [{ _id: 'z-new', json_data: { type: 'complete', instructionId: 'i2', at: '2026-11-13T10:00:00.000Z' } as UsageEvent }, ...docs]
      const skip = o.skip ?? 0
      return docs.slice(skip, skip + (o.limit ?? docs.length)) as unknown as Array<Doc<T>>
    },
  }
  return { api: api as unknown as DataApi, calls }
}

describe('lire les événements d’un rapport', () => {
  it('par pages de 10 000 au plus, jusqu’à la fin', async () => {
    const g = gateway(25_000)
    const r = await loadEvents(g.api, '2026-05-01T00:00:00.000Z')
    expect(r.events).toHaveLength(25_000)
    expect(r.capped).toBe(false)
    expect(g.calls.map((c) => [c.limit, c.skip])).toEqual([[DATA_PAGE, 0], [DATA_PAGE, 10_000], [DATA_PAGE, 20_000]])
  })

  it('une période trop chargée s’arrête au plafond et le dit', async () => {
    const g = gateway(EVENTS_CAP + 5_000)
    const r = await loadEvents(g.api, '2026-05-01T00:00:00.000Z')
    expect(r.events).toHaveLength(EVENTS_CAP)
    expect(r.capped).toBe(true)
    expect(g.calls.every((c) => (c.limit ?? 0) <= 10_000)).toBe(true)
  })

  it('un événement écrit pendant la lecture ne se compte pas deux fois', async () => {
    const g = gateway(15_000, { insertBeforePage: 1 })
    const r = await loadEvents(g.api, '2026-05-01T00:00:00.000Z')
    // La page 2 recule d'une ligne : le dernier événement de la page 1 revient, et ne compte qu'une fois.
    expect(r.events).toHaveLength(15_000)
    expect(new Set(r.events.map((e) => e.instructionId))).toEqual(new Set(['i1']))
  })

  it('seulement les types demandés : les instructions faites, et les ouvertures pour la bibliothèque', async () => {
    const g = gateway(10)
    await loadEvents(g.api, '2026-05-01T00:00:00.000Z')
    await loadEvents(g.api, '2026-05-01T00:00:00.000Z', ['view', 'complete'])
    const kinds = g.calls.map((c) => JSON.stringify(c.filter))
    expect(kinds[0]).toContain('"$in":["complete"]')
    expect(kinds[1]).toContain('"$in":["view","complete"]')
  })
})
