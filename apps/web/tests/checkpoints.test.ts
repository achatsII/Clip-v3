import { describe, expect, it } from 'vitest'
import type { DataApi, Doc, FilterOptions } from '@/lib/gateway/data'
import { CHECKPOINT_CAP, CHECKPOINT_EVERY_MS, contentHash, createCheckpointer } from '@/lib/model/checkpoints'
import type { DraftCheckpoint, InstructionContent } from '@/lib/model/types'

const MIN = 60_000
const T0 = Date.parse('2026-11-12T14:00:00Z')

const content = (title: string, steps = 1): InstructionContent =>
  ({
    title,
    summary: '',
    kind: 'procedure',
    category: 'production',
    tags: [],
    ppe: [],
    tools: [],
    safety: [],
    steps: Array.from({ length: steps }, (_, i) => ({ id: `s${i}`, title: `Étape ${i}`, text: '', keyPoints: [], warning: null, media: [] })),
    lockout: null,
    language: 'fr',
  }) as InstructionContent

/** Une base en mémoire : juste ce que les points de retour lisent et écrivent, et le compte des appels. */
function memoryData(seed: Array<Partial<DraftCheckpoint>> = []) {
  const rows = new Map<string, Record<string, unknown>>()
  let n = 0
  const calls = { insert: 0, filter: 0, remove: 0 }
  let failFilter = false
  for (const s of seed) rows.set(`seed${n++}`, { instructionId: 'i1', reason: 'auto', note: null, ...s })
  const data = {
    async insert<T extends object>(_type: string, json: T): Promise<Doc<T>> {
      calls.insert++
      const id = `c${n++}`
      rows.set(id, json as Record<string, unknown>)
      return { _id: id, json_data: json }
    },
    async filter<T>(_type: string, o: FilterOptions = {}): Promise<Doc<T>[]> {
      calls.filter++
      if (failFilter) throw new Error('réseau')
      const want = (o.filter?.['json_data.instructionId'] as { $eq: string }).$eq
      return [...rows.entries()]
        .filter(([, j]) => j.instructionId === want)
        .sort(([, a], [, b]) => String(b.at).localeCompare(String(a.at)))
        .slice(0, o.limit)
        .map(([id, j]) => ({ _id: id, json_data: (o.projection?.['json_data.content'] === 0 ? { ...j, content: undefined } : j) as T }))
    },
    async remove(_type: string, id: string) {
      calls.remove++
      rows.delete(id)
    },
  }
  return { data: data as unknown as DataApi, rows, calls, setFail: (v: boolean) => (failFilter = v) }
}

const by = { id: 'u1', name: 'Mélanie' }
/** Laisse finir la file d'écriture (la base factice ne fait que des promesses). */
const settle = () => new Promise((r) => setTimeout(r, 0))

describe('les points de retour du brouillon', () => {
  it('pendant qu’on modifie : un au plus toutes les 10 minutes, l’état d’avant la modification', async () => {
    const db = memoryData()
    let now = T0
    const cp = createCheckpointer(db.data, 'i1', by, { now: () => now })
    cp.beforeChange(content('Avant'))
    await settle()
    expect(db.calls.insert).toBe(1)
    // Des dizaines de modifications ensuite : rien de plus, ni écriture ni lecture.
    for (let i = 0; i < 50; i++) {
      now += 5_000
      cp.beforeChange(content(`v${i}`))
    }
    await settle()
    expect(db.calls.insert).toBe(1)
    expect(db.calls.filter).toBe(1)
    now = T0 + CHECKPOINT_EVERY_MS + 1
    cp.beforeChange(content('Dix minutes plus tard'))
    await settle()
    expect(db.calls.insert).toBe(2)
    const titles = [...db.rows.values()].map((r) => (r.content as InstructionContent).title)
    expect(titles).toEqual(['Avant', 'Dix minutes plus tard'])
  })

  it('jamais deux fois de suite le même contenu, ni une copie de la version publiée', async () => {
    const db = memoryData()
    const published = content('Publiée')
    const cp = createCheckpointer(db.data, 'i1', by, { skip: () => published })
    await cp.mark(content('Publiée'), 'agent', 'raccourcis')
    expect(db.calls.insert).toBe(0)
    await cp.mark(content('Brouillon'), 'agent', 'raccourcis')
    await cp.mark(content('Brouillon'), 'restore', 'v2')
    expect(db.calls.insert).toBe(1)
  })

  it('l’empreinte ne dépend pas de l’ordre des clés', () => {
    const a = content('Couper')
    const b = Object.fromEntries(Object.entries(a).reverse()) as InstructionContent
    expect(contentHash(a)).toBe(contentHash(b))
    expect(contentHash(a)).not.toBe(contentHash(content('Couper', 2)))
  })

  it('un point posé il y a 3 minutes (une autre séance, un autre appareil) fait attendre le suivant', async () => {
    const db = memoryData([{ at: new Date(T0 - 3 * MIN).toISOString(), hash: 'x' }])
    const cp = createCheckpointer(db.data, 'i1', by, { now: () => T0 })
    cp.beforeChange(content('Encore'))
    await settle()
    expect(db.calls.filter).toBe(1)
    expect(db.calls.insert).toBe(0)
    // Un point posé à la main (avant l'assistant, avant un retour), lui, s'écrit tout de suite.
    await cp.mark(content('Encore'), 'agent', 'raccourcis')
    expect(db.calls.insert).toBe(1)
  })

  it('au plus 20 par instruction : les plus anciens s’effacent, la version de l’IA reste', async () => {
    const db = memoryData()
    let now = T0
    const cp = createCheckpointer(db.data, 'i1', by, { now: () => now })
    await cp.mark(content('Version de l’IA'), 'generated')
    for (let i = 0; i < 30; i++) {
      now += MIN
      await cp.mark(content(`modif ${i}`), 'agent', `demande ${i}`)
    }
    expect(db.rows.size).toBe(CHECKPOINT_CAP)
    const titles = [...db.rows.values()].map((r) => (r.content as InstructionContent).title)
    expect(titles).toContain('Version de l’IA')
    expect(titles).toContain('modif 29')
    expect(titles).not.toContain('modif 0')
    // Une écriture et au plus un effacement par point : la liste n'est lue qu'une fois.
    expect(db.calls.filter).toBe(1)
    expect(db.calls.remove).toBe(31 - CHECKPOINT_CAP)
  })

  it('une base injoignable ne gêne jamais la modification, et se relit au prochain point', async () => {
    const db = memoryData()
    db.setFail(true)
    const cp = createCheckpointer(db.data, 'i1', by)
    await expect(cp.mark(content('A'), 'agent')).resolves.toBeUndefined()
    expect(db.calls.insert).toBe(0)
    db.setFail(false)
    await cp.mark(content('A'), 'agent')
    expect(db.calls.insert).toBe(1)
  })
})
