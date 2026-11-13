import { describe, expect, it } from 'vitest'
import { dataApi, type Doc } from '@/lib/gateway/data'
import { emptyContent } from '@/lib/model/repo'
import {
  allocateNumbers,
  backfillIndex,
  cardOf,
  cleanPrefix,
  formatNumber,
  instructionSearchText,
  libraryFilter,
  MAX_INDEX,
  publishedCard,
  queryTokens,
  searchInstructions,
  searchKey,
  searchPublished,
  type StationRef,
} from '@/lib/model/search'
import { publishInstruction, saveDraft } from '@/lib/model/service'
import type { Instruction, InstructionContent, OrgSettings, Published } from '@/lib/model/types'
import { fakeGateway } from './fakeClient'

const content = (over: Partial<InstructionContent> = {}): InstructionContent =>
  emptyContent({
    title: 'Changer la matrice de la presse',
    language: 'fr',
    tags: ['Matrice', 'P-12'],
    equipment: 'Presse hydraulique P-12',
    steps: [
      { id: 'st_1', title: 'Cadenasser', text: 'Couper l’énergie électrique.', media: [{ kind: 'image', url: 'https://x/a.jpg' }], section: 'Préparation' },
      { id: 'st_2', title: 'Serrer les boulons', text: 'Serrer à 45 N·m (3.5 tours).', media: [], keyPoints: ['Clé dynamométrique'] },
    ],
    ...over,
  })

/** La profondeur d'un filtre telle que la Gateway la compte : 1 à la racine, les tableaux de $and/$or ne comptent pas. */
function depth(node: unknown, level = 1): number {
  if (!node || typeof node !== 'object') return level - 1
  if (Array.isArray(node)) return Math.max(level - 1, ...node.map((x) => depth(x, level)))
  return Math.max(level, ...Object.values(node).map((v) => depth(v, level + 1)))
}

const stations: StationRef[] = [
  { id: 's1', name: 'Presse P-12', code: 'P12', area: 'Emboutissage' },
  { id: 's2', name: 'Ligne 3 — Emballage', area: 'Emballage' },
]

describe('l’index de recherche', () => {
  it('sans accents ni casse, chaque mot une fois ; les numéros et décimales restent entiers', () => {
    expect(searchKey(['Électricité ÉLECTRICITÉ', 'IT-0042', 'Serrer à 3.5 tours', '(M-1234)'])).toBe('electricite it-0042 serrer a 3.5 tours m-1234')
  })

  it('tient dans sa taille maximale', () => {
    const long = Array.from({ length: 2000 }, (_, i) => `mot${i}`).join(' ')
    expect(searchKey([long]).length).toBeLessThanOrEqual(MAX_INDEX)
  })

  it('contient le numéro, le titre, les étiquettes, l’équipement et ce que disent les étapes', () => {
    const text = instructionSearchText({ number: 'IT-0042' }, content())
    for (const w of ['it-0042', 'changer', 'matrice', 'p-12', 'hydraulique', 'preparation', 'cadenasser', 'electrique', 'boulons', 'dynamometrique', '3.5']) expect(text.split(' ')).toContain(w)
  })
})

describe('la recherche au serveur', () => {
  it('chaque mot doit se trouver : dans l’index, dans le titre, ou nommer un poste de l’instruction', () => {
    const f = libraryFilter({ q: 'Presse  matrice' }, stations) as { $and: Array<Record<string, unknown>> }
    const words = f.$and.filter((c) => '$or' in c && JSON.stringify(c).includes('searchText'))
    expect(words).toHaveLength(2)
    expect(words[0]).toEqual({ $or: [{ 'json_data.searchText': { $regex: 'presse' } }, { 'json_data.title': { $regex: 'presse', $options: 'i' } }, { 'json_data.stationIds': { $in: ['s1'] } }] })
    expect(words[1]).toEqual({ $or: [{ 'json_data.searchText': { $regex: 'matrice' } }, { 'json_data.title': { $regex: 'matrice', $options: 'i' } }] })
    // Sans recherche, le filtre des brouillons vides n'est pas là ; avec, non plus.
    expect(JSON.stringify(f)).not.toContain('sourceCount')
  })

  it('un caractère spécial ne casse pas la recherche', () => {
    expect(queryTokens('(3.5) M-1234* « Électrique »')).toEqual(['3.5', 'm-1234', 'electrique'])
    // Le point garde son sens littéral dans la recherche.
    const f = JSON.stringify(libraryFilter({ q: '(3.5+' }, []))
    expect(f).toContain('"$regex":"3\\\\.5"')
  })

  it('les filtres : statut, catégorie, lieu, pour moi, page suivante', () => {
    const now = Date.parse('2026-11-13T12:00:00Z')
    const f = (q: Parameters<typeof libraryFilter>[0], cursor?: string) => JSON.stringify(libraryFilter(q, stations, now, cursor))
    expect(f({ status: 'published' })).toContain('"json_data.publishedVersion":{"$gt":0}')
    expect(f({ status: 'draft' })).toContain('{"json_data.publishedVersion":{"$in":[null,0]}},{"json_data.dirty":{"$eq":true}}')
    expect(f({ status: 'review' })).toContain('"json_data.status":{"$eq":"review"}')
    expect(f({ status: 'renew' })).toContain('"json_data.renewal.dueAt":{"$lte":"2026-12-13T12:00:00.000Z"}')
    expect(f({ category: 'sst' })).toContain('"json_data.category":{"$eq":"sst"}')
    expect(f({ stationIds: ['s1', 's2'] })).toContain('"json_data.stationIds":{"$in":["s1","s2"]}')
    expect(f({ mine: { userId: 'u1', categories: ['sst'], stationIds: [] } })).toContain('{"$or":[{"json_data.category":{"$in":["sst"]}},{"json_data.authorId":{"$eq":"u1"}}]}')
    expect(f({}, '2026-11-01T00:00:00Z')).toContain('"json_data.updatedAt":{"$lt":"2026-11-01T00:00:00Z"}')
    // Sans recherche, un brouillon vide de plus d'une heure ne s'affiche pas.
    expect(f({})).toContain('"json_data.createdAt":{"$gte":"2026-11-13T11:00:00.000Z"}')
  })

  it('reste dans la profondeur permise par la Gateway (5), filtre complet et cloisonnement compris', async () => {
    const gw = fakeGateway(() => ({ results: [] }))
    await searchInstructions(dataApi(gw), { q: 'presse matrice cadenas', status: 'draft', category: 'sst', stationIds: ['s1'], mine: { userId: 'u1', categories: ['sst'], stationIds: ['s1'] } }, stations, '2026-11-01T00:00:00Z')
    const body = gw.calls[0].options.body as { mongo_filter: unknown; projection: Record<string, number>; sort: Record<string, number> }
    expect(depth(body.mongo_filter)).toBeLessThanOrEqual(5)
    expect(body.projection).toMatchObject({ 'json_data.draft': 0, 'json_data.sources': 0, 'json_data.searchText': 0 })
    expect(body.sort).toEqual({ 'json_data.updatedAt': -1 })
  })

  it('une page à la fois : la suite part de la dernière ligne vue', async () => {
    const doc = (i: number) => ({ _id: `i${i}`, json_data: { app_identifier: 'clip-v3', title: `T${i}`, updatedAt: `2026-11-${String(30 - i).padStart(2, '0')}T00:00:00Z` } })
    const full = fakeGateway(() => ({ results: Array.from({ length: 4 }, (_, i) => doc(i)) }))
    const page = await searchInstructions(dataApi(full), {}, [], null, 3)
    expect(page.docs.map((d) => d._id)).toEqual(['i0', 'i1', 'i2'])
    expect(page.next).toBe('2026-11-28T00:00:00Z')
    expect((full.calls[0].options.body as { limit: number }).limit).toBe(4)
    const last = fakeGateway(() => ({ results: [doc(5)] }))
    expect((await searchInstructions(dataApi(last), {}, [], page.next, 3)).next).toBeNull()
  })
})

describe('le numéro de document', () => {
  it('un préfixe sûr et un numéro sur quatre chiffres', () => {
    expect(cleanPrefix(' it/é ')).toBe('ITE')
    expect(cleanPrefix('!!')).toBe('IT')
    expect(formatNumber('QC', 42)).toBe('QC-0042')
  })

  it('saute un numéro déjà pris et avance le compteur de l’usine', async () => {
    const org = { _id: 'org1', json_data: { app_identifier: 'clip-v3', name: 'Usine', numbering: { prefix: 'IT', next: 41 } } }
    const gw = fakeGateway((endpoint, options) => {
      if (endpoint.includes('clip_org/filter')) return { results: [org] }
      if (endpoint.includes('clip_instruction/filter')) return { results: [{ _id: 'x', json_data: { app_identifier: 'clip-v3', number: 'IT-0041' } }] }
      if (options.method === 'PATCH') return { success: true }
      return { results: [] }
    })
    expect(await allocateNumbers(dataApi(gw), 2)).toEqual(['IT-0042', 'IT-0043'])
    const patch = gw.calls.find((c) => c.options.method === 'PATCH')!
    expect(patch.endpoint).toContain('clip_org')
    expect((patch.options.body as { json_data: { numbering: unknown } }).json_data.numbering).toEqual({ prefix: 'IT', next: 44 })
  })
})

describe('publier et enregistrer tiennent l’index', () => {
  const org = { name: 'Usine', approval: { mode: 'none', approverIds: [] } } as unknown as OrgSettings
  const gateway = (orgNumbering?: { prefix: string; next: number }) =>
    fakeGateway((endpoint, options) => {
      if (endpoint.includes('clip_org/filter')) return { results: [{ _id: 'org1', json_data: { app_identifier: 'clip-v3', name: 'Usine', ...(orgNumbering ? { numbering: orgNumbering } : {}) } }] }
      if (endpoint.includes('/filter')) return { results: [] }
      if (options.method === 'POST') return { results: [{ inserted_id: 'new1', json_data: {} }] }
      if (!options.method || options.method === 'GET') return { result: null }
      return { success: true }
    })
  const doc = (over: Partial<Instruction> = {}): Doc<Instruction> => ({ _id: 'i1', json_data: { title: 'T', status: 'draft', stationIds: ['s1'], draft: content(), publishedVersion: null, publishedId: null, ...over } as Instruction })

  it('la première publication donne un numéro ; la version publiée porte sa fiche et son index', async () => {
    const gw = gateway({ prefix: 'IT', next: 7 })
    const r = await publishInstruction(dataApi(gw), doc(), org, { id: 'u1', name: 'Mel' })
    expect(r.docNumber).toBe('IT-0007')
    const pub = gw.calls.find((c) => c.endpoint === '/api/v1/data/clip_published' && c.options.method === 'POST')!.options.body as { json_data: Published }
    expect(pub.json_data.card).toMatchObject({ title: 'Changer la matrice de la presse', number: 'IT-0007', stepCount: 2, cover: 'https://x/a.jpg', languages: ['fr'] })
    expect(pub.json_data.searchText).toContain('it-0007')
    const instr = gw.calls.filter((c) => c.options.method === 'PATCH' && c.endpoint.includes('clip_instruction')).at(-1)!.options.body as { json_data: Partial<Instruction> }
    expect(instr.json_data).toMatchObject({ number: 'IT-0007' })
    expect(instr.json_data.searchText).toContain('it-0007')
  })

  it('une instruction déjà numérotée garde son numéro', async () => {
    const gw = gateway({ prefix: 'IT', next: 7 })
    const r = await publishInstruction(dataApi(gw), doc({ number: 'IT-0003', publishedVersion: 2, publishedId: null }), org, { id: 'u1', name: 'Mel' })
    expect(r.docNumber).toBe('IT-0003')
    expect(gw.calls.some((c) => c.endpoint.includes('clip_org'))).toBe(false)
  })

  it('chaque enregistrement du brouillon refait l’index', async () => {
    const gw = gateway()
    await saveDraft(dataApi(gw), 'i1', { number: 'IT-0003', status: 'draft' } as Instruction, content({ title: 'Nettoyer la graisse' }), { id: 'u1', name: 'Mel' })
    const body = gw.calls[0].options.body as { json_data: { searchText: string } }
    expect(body.json_data.searchText.startsWith('it-0003 nettoyer la graisse')).toBe(true)
  })
})

describe('les anciennes instructions reçoivent leur index', () => {
  it('numéro des publiées, index de celles qui n’en ont pas, fiche des versions publiées', async () => {
    let numbered = false
    let indexed = false
    let carded = false
    const gw = fakeGateway((endpoint, options) => {
      const body = JSON.stringify(options.body ?? {})
      if (endpoint.includes('clip_org/filter')) return { results: [{ _id: 'org1', json_data: { app_identifier: 'clip-v3', name: 'U', numbering: { prefix: 'IT', next: 1 } } }] }
      if (endpoint.includes('clip_instruction/filter') && body.includes('json_data.number":{"$in":[null]')) return { results: numbered ? [] : [{ _id: 'old1', json_data: { app_identifier: 'clip-v3', createdAt: '2025-01-01' } }] }
      if (endpoint.includes('clip_instruction/filter') && body.includes('"json_data.number":{"$in":["IT-0001"]')) return { results: [] }
      if (endpoint.includes('clip_instruction/filter') && body.includes('searchText')) return { results: indexed ? [] : [{ _id: 'old2', json_data: { app_identifier: 'clip-v3', title: 'Vieille', tags: [], draft: content({ title: 'Vieille instruction' }) } }] }
      if (endpoint.includes('clip_published/filter')) return { results: carded ? [] : [{ _id: 'p1', json_data: { app_identifier: 'clip-v3', instructionId: 'old1', content: content() } }] }
      if (endpoint.includes('clip_instruction/one/old1') && (!options.method || options.method === 'GET')) return { result: { _id: 'old1', json_data: { app_identifier: 'clip-v3', number: 'IT-0001' } } }
      if (options.method === 'PATCH') {
        if (endpoint.includes('old1')) numbered = true
        if (endpoint.includes('old2')) indexed = true
        if (endpoint.includes('clip_published')) carded = true
        return { success: true }
      }
      return { results: [] }
    })
    const r = await backfillIndex(dataApi(gw))
    expect(r).toEqual({ indexed: 1, cards: 1, numbered: 1 })
    const patches = gw.calls.filter((c) => c.options.method === 'PATCH').map((c) => [c.endpoint, (c.options.body as { json_data: Record<string, unknown> }).json_data] as const)
    expect(patches.find(([e]) => e.includes('old1'))![1]).toEqual({ number: 'IT-0001', searchText: null })
    expect(patches.find(([e]) => e.includes('old2'))![1].searchText).toContain('vieille instruction')
    expect(patches.find(([e]) => e.includes('clip_published'))![1]).toMatchObject({ card: { number: 'IT-0001', stepCount: 2 } })
    // La recherche au poste trouve la version publiée par son numéro et ses étapes.
    expect(patches.find(([e]) => e.includes('clip_published'))![1].searchText).toMatch(/^it-0001 changer .*boulons/)
  })
})

describe('la liste d’un poste', () => {
  it('lit la fiche, ou ce qu’il faut d’une version d’avant les fiches', () => {
    const withCard = { _id: 'p1', json_data: { card: publishedCard(content({ translations: { en: { title: 'x', summary: '', safety: [], steps: [] } } }), 'IT-0009') } } as Doc<Published>
    expect(cardOf(withCard)).toMatchObject({ number: 'IT-0009', languages: ['fr', 'en'], stepCount: 2 })
    const legacy = { _id: 'p2', json_data: { content: { title: 'Ancienne', category: 'sst', durationMin: 12 } } } as unknown as Doc<Published>
    expect(cardOf(legacy)).toMatchObject({ title: 'Ancienne', category: 'sst', durationMin: 12, stepCount: 0, cover: null })
  })

  it('« Tout voir » cherche au serveur, une page à la fois, sans charger le contenu', async () => {
    const gw = fakeGateway(() => ({ results: Array.from({ length: 25 }, (_, i) => ({ _id: `p${i}`, json_data: { app_identifier: 'clip-v3' } })) }))
    const r = await searchPublished(dataApi(gw), 'Matrice', 1, 24)
    expect(r.more).toBe(true)
    expect(r.docs).toHaveLength(24)
    const body = gw.calls[0].options.body as { mongo_filter: unknown; projection: Record<string, number>; skip: number; limit: number }
    expect(JSON.stringify(body.mongo_filter)).toContain('"json_data.searchText":{"$regex":"matrice"}')
    expect(body.projection['json_data.card']).toBe(1)
    expect(body.projection).not.toHaveProperty('json_data.content')
    expect(body.skip).toBe(24)
    expect(body.limit).toBe(25)
  })
})
