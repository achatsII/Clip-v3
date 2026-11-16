import { describe, expect, it } from 'vitest'
import { nomenclatureBlock } from '@/lib/ai/prompts'
import { normalizeInstruction } from '@/lib/ai/normalize'
import type { DataApi, Doc } from '@/lib/gateway/data'
import { applyStationRule, relabelValue, saveClassification, staleRuleStations } from '@/lib/model/classification'
import { addValues, cleanLabels, labelsFromAi, matchesRule, mergeLabels, renameIn, ruleFilter, ruleStationsFor, type Nomenclature } from '@/lib/model/nomenclature'
import { instructionSearchText, libraryFilter } from '@/lib/model/search'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'
import type { Instruction, Published, Station } from '@/lib/model/types'

const NOM: Nomenclature = {
  families: [
    { id: 'dept', name: 'Département', kind: 'list', multiple: false, values: [{ label: 'Découpe', code: 'DEC' }, { label: 'Assemblage' }] },
    { id: 'type', name: 'Type de travail', kind: 'list', multiple: true, values: [{ label: 'Nettoyage' }, { label: 'Maintenance' }] },
    { id: 'prod', name: 'Produit', kind: 'free', multiple: true, values: [] },
  ],
}

/** Une petite Gateway en mémoire : assez de Mongo pour les filtres du classement. */
function memoryData(seed: Record<string, Array<Doc<unknown>>>): DataApi & { store: Record<string, Array<Doc<Record<string, unknown>>>> } {
  const store = seed as Record<string, Array<Doc<Record<string, unknown>>>>
  const at = (doc: Doc<Record<string, unknown>>, path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), path.startsWith('json_data') || path === '_id' ? doc : doc.json_data)
  const test = (doc: Doc<Record<string, unknown>>, f: Record<string, unknown>): boolean =>
    Object.entries(f).every(([k, cond]) => {
      if (k === '$and') return (cond as Record<string, unknown>[]).every((c) => test(doc, c))
      if (k === '$or') return (cond as Record<string, unknown>[]).some((c) => test(doc, c))
      const v = at(doc, k)
      const vals = Array.isArray(v) ? v : [v]
      if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
        const c = cond as Record<string, unknown>
        if ('$in' in c) return vals.some((x) => (c.$in as unknown[]).includes(x))
        if ('$eq' in c) return vals.includes(c.$eq)
        if ('$ne' in c) return !vals.includes(c.$ne)
        return true
      }
      return vals.includes(cond)
    })
  const api = {
    store,
    async filter(type: string, opts: { filter?: Record<string, unknown> } = {}) {
      return (store[type] ?? []).filter((d) => !opts.filter || test(d, opts.filter))
    },
    async get(type: string, id: string) {
      return (store[type] ?? []).find((d) => d._id === id) ?? null
    },
    async patch(type: string, id: string, partial: Record<string, unknown>) {
      const d = (store[type] ?? []).find((x) => x._id === id)
      if (d) d.json_data = { ...d.json_data, ...partial }
    },
    async count(type: string, filter?: Record<string, unknown>) {
      return (store[type] ?? []).filter((d) => !filter || test(d, filter)).length
    },
  }
  return api as unknown as DataApi & { store: typeof store }
}

const instr = (id: string, j: Partial<Instruction>): Doc<Instruction> => ({ _id: id, json_data: { title: id, kind: 'procedure', category: 'production', tags: [], stationIds: [], status: 'published', sources: [], draft: null, publishedVersion: 1, publishedId: `pub_${id}`, authorId: 'u', authorName: 'U', createdAt: '', updatedAt: '', ...j } as Instruction })
const station = (id: string, rule?: Station['rule']): Doc<Station> => ({ _id: id, json_data: { name: id, kind: 'poste', createdAt: '', rule } as Station })
const pub = (id: string, stationIds: string[] = []): Doc<Published> => ({ _id: `pub_${id}`, json_data: { instructionId: id, version: 1, stationIds, content: { title: id, steps: [] }, branding: {}, publishedAt: '' } as unknown as Published })

describe('la nomenclature de l’usine', () => {
  it('allumée par le serveur ; le repli ne l’active jamais', () => {
    expect(DEFAULT_TOGGLES.nomenclature).toBe(true)
    expect(FALLBACK_TOGGLES.nomenclature).toBe(false)
  })

  it('le classement gardé : les familles de l’usine, les valeurs de ses listes (accents et casse n’y font rien), une valeur libre nettoyée, une seule pour une famille simple', () => {
    const out = cleanLabels({ dept: ['decoupe', 'Assemblage'], type: ['nettoyage', 'Peinture', 'Nettoyage'], prod: ['  12345 ', '12345', 'P-9'], inconnue: ['x'] }, NOM)
    expect(out).toEqual({ dept: ['Découpe'], type: ['Nettoyage'], prod: ['12345', 'P-9'] })
    // Une valeur d'une liste par son abrégé.
    expect(cleanLabels({ dept: ['dec'] }, NOM)).toEqual({ dept: ['Découpe'] })
  })

  it('ce que l’IA propose : la famille par son nom, rien d’inventé dans une liste, une valeur libre telle qu’écrite', () => {
    const raw = [
      { family: 'Département', values: ['Découpe laser', 'Découpe'] },
      { family: 'type de travail', values: ['Maintenance', 'Lubrification'] },
      { family: 'Produit', values: ['12345'] },
      { family: 'Couleur', values: ['Rouge'] },
    ]
    expect(labelsFromAi(raw, NOM)).toEqual({ dept: ['Découpe'], type: ['Maintenance'], prod: ['12345'] })
    expect(labelsFromAi('n’importe quoi', NOM)).toEqual({})
    // La génération garde la proposition telle quelle, pour la ramener ensuite aux familles.
    const n = normalizeInstruction({ title: 'Nettoyer', steps: [{ title: 'Laver', text: 'x' }], labels: raw }, [])
    expect(n.aiLabels).toEqual(raw)
  })

  it('la règle d’un poste : dans une famille l’une des valeurs, entre les familles toutes, et la catégorie si elle est dite', () => {
    const rule = { labels: { dept: ['Découpe'], type: ['Nettoyage', 'Maintenance'] } }
    expect(matchesRule(rule, { dept: ['Découpe'], type: ['Maintenance'] }, 'production')).toBe(true)
    expect(matchesRule(rule, { dept: ['Découpe'] }, 'production')).toBe(false)
    expect(matchesRule(rule, { dept: ['Assemblage'], type: ['Nettoyage'] }, 'production')).toBe(false)
    expect(matchesRule({ labels: {}, categories: ['nettoyage'] }, {}, 'nettoyage')).toBe(true)
    expect(matchesRule({ labels: { dept: ['Découpe'] }, categories: ['sst'] }, { dept: ['Découpe'] }, 'nettoyage')).toBe(false)
    // Une règle vide ne prend rien.
    expect(matchesRule({ labels: {} }, { dept: ['Découpe'] }, 'production')).toBe(false)
    expect(ruleStationsFor([station('A', rule), station('B'), station('C', { labels: { prod: ['12345'] } })], { dept: ['Découpe'], type: ['Nettoyage'], prod: ['12345'] }, 'production')).toEqual(['A', 'C'])
    expect(ruleFilter(rule)).toEqual({ $and: [{ 'json_data.labels.dept': { $in: ['Découpe'] } }, { 'json_data.labels.type': { $in: ['Nettoyage', 'Maintenance'] } }] })
  })

  it('l’IA ajoute à ce qu’on a : une famille vide prend sa proposition, une famille simple garde la sienne', () => {
    expect(mergeLabels({ dept: ['Assemblage'], type: ['Nettoyage'] }, { dept: ['Découpe'], type: ['Maintenance'], prod: ['9'] }, NOM)).toEqual({ dept: ['Assemblage'], type: ['Nettoyage', 'Maintenance'], prod: ['9'] })
  })

  it('les réglages : coller une liste ajoute ses valeurs sans doublon ; renommer ou retirer une valeur suit dans le classement', () => {
    const f = addValues(NOM.families[0], 'Peinture, découpe\nEmballage')
    expect(f.values.map((v) => v.label)).toEqual(['Découpe', 'Assemblage', 'Peinture', 'Emballage'])
    expect(renameIn({ dept: ['Découpe'], prod: ['1'] }, 'dept', 'découpe', 'Coupe')).toEqual({ dept: ['Coupe'], prod: ['1'] })
    expect(renameIn({ dept: ['Découpe'], prod: ['1'] }, 'dept', 'Découpe', null)).toEqual({ prod: ['1'] })
    expect(renameIn({ prod: ['1'] }, 'dept', 'Découpe', 'Coupe')).toBeNull()
  })

  it('la recherche trouve une instruction par son classement ; la bibliothèque filtre par famille et par les postes de règle', () => {
    expect(instructionSearchText({ title: 'Nettoyer les rails', labels: { dept: ['Découpe'], prod: ['12345'] } }, null)).toContain('decoupe')
    expect(instructionSearchText({ title: 'Nettoyer les rails', labels: { prod: ['12345'] } }, null)).toContain('12345')
    const f = libraryFilter({ labels: { dept: ['Découpe'] }, stationIds: ['A'] }, [])
    const and = (f.$and as Record<string, unknown>[]).map((x) => JSON.stringify(x))
    expect(and).toContain(JSON.stringify({ 'json_data.labels.dept': { $in: ['Découpe'] } }))
    expect(and).toContain(JSON.stringify({ $or: [{ 'json_data.stationIds': { $in: ['A'] } }, { 'json_data.ruleStationIds': { $in: ['A'] } }] }))
  })

  it('l’IA connaît les familles de l’usine ; sans famille, rien n’est ajouté à la consigne', () => {
    const block = nomenclatureBlock(NOM)
    expect(block).toContain('« Département » — une seule valeur, parmi : Découpe (DEC), Assemblage')
    expect(block).toContain('« Produit » — valeur libre')
    expect(nomenclatureBlock({ families: [] })).toBe('')
    expect(nomenclatureBlock(null)).toBe('')
  })
})

describe('le classement enregistré', () => {
  it('une instruction classée va aux postes de sa règle ; sa version publiée garde aussi ses postes choisis à la main', async () => {
    const stations = [station('A', { labels: { dept: ['Découpe'] } }), station('B', { labels: { dept: ['Assemblage'] } })]
    const doc = instr('i1', { stationIds: ['M'] })
    const data = memoryData({ clip_instruction: [doc], clip_published: [pub('i1', ['M'])] })
    const r = await saveClassification(data, doc, { labels: { dept: ['découpe'] }, nomenclature: NOM, stations })
    expect(r).toEqual({ labels: { dept: ['Découpe'] }, ruleStationIds: ['A'] })
    expect(data.store.clip_instruction[0].json_data).toMatchObject({ labels: { dept: ['Découpe'] }, ruleStationIds: ['A'], labelsCheck: null })
    expect(data.store.clip_published[0].json_data).toMatchObject({ stationIds: ['M', 'A'], ruleStationIds: ['A'], labels: { dept: ['Découpe'] } })
    expect(String(data.store.clip_published[0].json_data.searchText)).toContain('decoupe')
  })

  it('une règle de poste qui change : les instructions qui y répondent arrivent, les autres partent, celles mises à la main restent', async () => {
    const stations = [station('A', { labels: { dept: ['Assemblage'] } })]
    const docs = [
      instr('dec', { labels: { dept: ['Découpe'] } }),
      instr('ass', { labels: { dept: ['Assemblage'] }, ruleStationIds: ['A'] }),
      instr('main', { labels: { dept: ['Assemblage'] }, stationIds: ['A'], ruleStationIds: ['A'] }),
    ]
    const data = memoryData({ clip_instruction: docs, clip_published: [pub('dec'), pub('ass', ['A']), pub('main', ['A'])], clip_station: stations })
    const r = await applyStationRule(data, stations[0], { labels: { dept: ['Découpe'] } })
    expect(r).toMatchObject({ added: 1, removed: 2, matching: 1 })
    const byId = (type: string, id: string) => data.store[type].find((d) => d._id === id)!.json_data
    expect(byId('clip_instruction', 'dec').ruleStationIds).toEqual(['A'])
    expect(byId('clip_published', 'pub_dec').stationIds).toEqual(['A'])
    expect(byId('clip_instruction', 'ass').ruleStationIds).toEqual([])
    expect(byId('clip_published', 'pub_ass').stationIds).toEqual([])
    // Mise au poste à la main : elle y reste.
    expect(byId('clip_published', 'pub_main').stationIds).toEqual(['A'])
    expect(byId('clip_station', 'A').rule).toEqual({ labels: { dept: ['Découpe'] } })
  })

  it('une valeur renommée suit dans les instructions et dans les règles des postes', async () => {
    const data = memoryData({ clip_instruction: [instr('i1', { labels: { dept: ['Découpe'] } })], clip_published: [pub('i1')], clip_station: [station('A', { labels: { dept: ['Découpe'] } })] })
    expect(await relabelValue(data, 'dept', 'Découpe', 'Coupe')).toBe(1)
    expect(data.store.clip_instruction[0].json_data.labels).toEqual({ dept: ['Coupe'] })
    expect(data.store.clip_published[0].json_data.labels).toEqual({ dept: ['Coupe'] })
    expect((data.store.clip_station[0].json_data.rule as Station['rule'])?.labels).toEqual({ dept: ['Coupe'] })
  })

  it('les postes par règle à refaire quand la catégorie change', () => {
    const stations = [station('N', { labels: {}, categories: ['nettoyage'] })]
    expect(staleRuleStations({ labels: {}, ruleStationIds: [], category: 'nettoyage', draft: null }, stations)).toEqual(['N'])
    expect(staleRuleStations({ labels: {}, ruleStationIds: ['N'], category: 'nettoyage', draft: null }, stations)).toBeNull()
  })
})
