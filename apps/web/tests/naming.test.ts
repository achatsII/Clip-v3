/**
 * Le modèle de nom (toggle `nameTemplate`, Réglages › Classement) : les valeurs des familles choisies
 * devant le titre, « Découpe – Presse P-12 – Changer le filtre ». Le titre reste l'action ; la version
 * publiée garde le début du nom pour le poste (un lien ne lit pas les réglages de l'usine).
 */
import { describe, expect, it } from 'vitest'
import type { DataApi, Doc } from '@/lib/gateway/data'
import { renamePublished, saveClassification } from '@/lib/model/classification'
import { displayName, MAX_NAMING, namePrefix, readNomenclature, type Nomenclature } from '@/lib/model/nomenclature'
import type { Instruction, Published } from '@/lib/model/types'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'

const NOM: Nomenclature = {
  families: [
    { id: 'dept', name: 'Département', kind: 'list', multiple: false, values: [{ label: 'Découpe' }, { label: 'Assemblage' }] },
    { id: 'mach', name: 'Machine', kind: 'list', multiple: true, values: [{ label: 'Presse P-12' }, { label: 'Presse P-14' }] },
    { id: 'prod', name: 'Produit', kind: 'free', multiple: true, values: [] },
  ],
  naming: ['dept', 'mach'],
}

/** Une Gateway en mémoire : assez pour le classement et les pages de 10 000. */
function memoryData(seed: Record<string, Array<Doc<Record<string, unknown>>>>) {
  const store = seed
  const patches: string[] = []
  const api = {
    store,
    patches,
    async filter(type: string, opts: { limit?: number; skip?: number } = {}) {
      const all = store[type] ?? []
      return all.slice(opts.skip ?? 0, (opts.skip ?? 0) + (opts.limit ?? all.length))
    },
    async get(type: string, id: string) {
      return (store[type] ?? []).find((d) => d._id === id) ?? null
    },
    async patch(type: string, id: string, partial: Record<string, unknown>) {
      patches.push(`${type}/${id}`)
      const d = (store[type] ?? []).find((x) => x._id === id)
      if (d) d.json_data = { ...d.json_data, ...partial }
    },
  }
  return api as unknown as DataApi & { store: typeof store; patches: string[] }
}
const pub = (id: string, labels: Record<string, string[]>, namePrefix?: string | null): Doc<Record<string, unknown>> => ({ _id: `pub_${id}`, json_data: { instructionId: id, version: 1, stationIds: [], labels, ...(namePrefix !== undefined ? { namePrefix } : {}), content: { title: id, steps: [] }, branding: {}, publishedAt: '' } })

describe('le nom des instructions', () => {
  it('allumé par le serveur ; le repli ne l’active jamais', () => {
    expect(DEFAULT_TOGGLES.nameTemplate).toBe(true)
    expect(FALLBACK_TOGGLES.nameTemplate).toBe(false)
  })

  it('les valeurs des familles choisies, dans leur ordre, devant le titre ; plusieurs valeurs d’une famille ensemble', () => {
    const prefix = namePrefix({ dept: ['Découpe'], mach: ['Presse P-12', 'Presse P-14'], prod: ['12345'] }, NOM)
    expect(prefix).toBe('Découpe – Presse P-12 / Presse P-14')
    expect(displayName('Changer le filtre', prefix)).toBe('Découpe – Presse P-12 / Presse P-14 – Changer le filtre')
    // Une famille sans valeur ne laisse pas de trou ; sans modèle, le titre seul.
    expect(namePrefix({ mach: ['Presse P-12'] }, NOM)).toBe('Presse P-12')
    expect(displayName('Changer le filtre', namePrefix({ dept: ['Découpe'] }, { families: NOM.families }))).toBe('Changer le filtre')
    // Un titre qui porte déjà le début du nom ne le répète pas.
    expect(displayName('Découpe – Changer le filtre', 'Découpe')).toBe('Découpe – Changer le filtre')
  })

  it('le modèle lu des réglages : des familles qui existent, une fois chacune, trois au plus', () => {
    const raw = { families: NOM.families, naming: ['mach', 'gone', 'mach', 'dept', 'prod', 'dept'] }
    expect(readNomenclature(raw).naming).toEqual(['mach', 'dept', 'prod'])
    expect(MAX_NAMING).toBe(3)
    expect(readNomenclature({ families: NOM.families, naming: ['x'] }).naming).toBeUndefined()
  })

  it('un classement qui change : la version publiée garde le nouveau début du nom, pour le poste', async () => {
    const doc: Doc<Instruction> = { _id: 'i1', json_data: { title: 'Changer le filtre', kind: 'procedure', category: 'maintenance', tags: [], stationIds: [], status: 'published', sources: [], draft: null, publishedVersion: 1, publishedId: 'pub_i1', authorId: 'u', authorName: 'U', createdAt: '', updatedAt: '' } as Instruction }
    const data = memoryData({ clip_instruction: [doc as unknown as Doc<Record<string, unknown>>], clip_published: [pub('i1', {})] })
    await saveClassification(data, doc, { labels: { dept: ['Découpe'], mach: ['Presse P-12'] }, nomenclature: NOM, stations: [] })
    expect((data.store.clip_published[0].json_data as unknown as Published).namePrefix).toBe('Découpe – Presse P-12')
  })

  it('le modèle change : seules les versions publiées dont le nom change s’écrivent', async () => {
    const data = memoryData({ clip_published: [pub('a', { dept: ['Découpe'] }, 'Découpe'), pub('b', { dept: ['Assemblage'], mach: ['Presse P-14'] }, 'Assemblage'), pub('c', {})] })
    const n = await renamePublished(data, NOM)
    expect(n).toBe(1)
    expect(data.patches).toEqual(['clip_published/pub_b'])
    expect((data.store.clip_published[1].json_data as unknown as Published).namePrefix).toBe('Assemblage – Presse P-14')
    // Le modèle retiré : le début du nom s'efface partout où il y en avait un.
    const off = await renamePublished(data, { families: NOM.families })
    expect(off).toBe(2)
    expect(data.store.clip_published.map((p) => (p.json_data as unknown as Published).namePrefix ?? null)).toEqual([null, null, null])
  })
})
