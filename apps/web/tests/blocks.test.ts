import { describe, expect, it } from 'vitest'
import { AgentOpError, applyOp } from '@/lib/ai/agent'
import { ApiError } from '@/lib/gateway/client'
import { dataApi, type Doc } from '@/lib/gateway/data'
import { blockRuns, copyBlock, copyId, detachBlock, insertBlock, makeBlock, propagateBlock, removeBlock, replaceBlock } from '@/lib/model/blocks'
import { emptyContent } from '@/lib/model/repo'
import { libraryFilter } from '@/lib/model/search'
import { duplicateInstruction, publishInstruction } from '@/lib/model/service'
import type { Instruction, InstructionContent, OrgSettings, Step, Version } from '@/lib/model/types'
import { fakeGateway } from './fakeClient'

const step = (id: string, title = id, extra: Partial<Step> = {}): Step => ({ id, title, text: `Texte ${id}`, media: [], ...extra })
const lockout = { id: 'blk1', version: 2, title: 'Cadenasser la presse' }
const content = (steps: Step[], over: Partial<InstructionContent> = {}): InstructionContent => emptyContent({ title: 'Changer la matrice', language: 'fr', steps, ...over })
const org = { name: 'Usine', approval: { mode: 'none', approverIds: [] } } as unknown as OrgSettings
const actor = { id: 'u1', name: 'Mel' }
const cp = (id: string) => copyId('blk1', id)
const tr = (ids: string[]) => ({ title: 'Change', summary: '', safety: [], steps: ids.map((id) => ({ id, title: `EN ${id}`, text: '' })) })
const question = (stepId: string) => ({ id: 'q1', question: 'Quoi ?', choices: ['x', 'y'], answer: 0, stepId })

describe('les étapes d’un bloc dans une instruction', () => {
  it('se copient marquées, se regroupent, s’insèrent une seule fois', () => {
    const copies = copyBlock(lockout, [step('b1'), step('b2')])
    expect(copies.map((s) => [s.id, s.fromBlock?.id, s.fromBlock?.version])).toEqual([[cp('b1'), 'blk1', 2], [cp('b2'), 'blk1', 2]])
    const c = insertBlock(content([step('a'), step('z')]), 0, copies)!
    expect(c.steps.map((s) => s.id)).toEqual(['a', cp('b1'), cp('b2'), 'z'])
    expect(blockRuns(c.steps)).toEqual([{ ...lockout, start: 1, end: 3 }])
    expect(insertBlock(c, 3, copies)).toBeNull()
    // −1 : au début.
    expect(insertBlock(content([step('a')]), -1, copies)!.steps.map((s) => s.id)).toEqual([cp('b1'), cp('b2'), 'a'])
  })

  it('ne se confondent jamais avec les étapes d’une instruction dupliquée, ni avec un autre bloc fait des mêmes étapes', () => {
    // Une instruction dupliquée avant qu'on fasse le bloc garde les identifiants de ses étapes.
    const copy = content([step('b1'), step('b2')])
    const c = insertBlock(copy, 1, copyBlock(lockout, [step('b1'), step('b2')]))!
    expect(new Set(c.steps.map((s) => s.id)).size).toBe(4)
    const other = insertBlock(c, 3, copyBlock({ id: 'blk2', version: 1, title: 'Autre' }, [step('b1')]))!
    expect(new Set(other.steps.map((s) => s.id)).size).toBe(5)
  })

  it('se détachent (elles deviennent celles de l’instruction, traductions et questions comprises) ou partent ensemble', () => {
    const c = content([step('a'), ...copyBlock(lockout, [step('b1'), step('b2')])], { translations: { en: tr(['a', cp('b1'), cp('b2')]) }, quiz: [question(cp('b2'))] })
    const d = detachBlock(c, 'blk1')
    expect(d.steps.some((s) => s.fromBlock)).toBe(false)
    expect(d.steps.map((s) => s.title)).toEqual(['a', 'b1', 'b2'])
    expect(d.steps[1].id).not.toBe(cp('b1'))
    expect(d.translations!.en.steps.map((s) => s.id)).toEqual(d.steps.map((s) => s.id))
    expect(d.quiz![0].stepId).toBe(d.steps[2].id)
    // Le bloc peut revenir.
    const back = insertBlock(d, 2, copyBlock(lockout, [step('b1'), step('b2')]))!
    expect(new Set(back.steps.map((s) => s.id)).size).toBe(5)
    expect(removeBlock(c, 'blk1').steps.map((s) => s.id)).toEqual(['a'])
  })
})

describe('une nouvelle version du bloc', () => {
  it('remplace ses étapes à leur place ; la traduction de ce qui a changé tombe, le reste la garde', () => {
    const c = content([step('a'), ...copyBlock(lockout, [step('b1'), step('b2')]), step('z')], { translations: { en: tr(['a', cp('b1'), cp('b2'), 'z']) } })
    const v3 = copyBlock({ ...lockout, version: 3 }, [step('b1'), step('b2', 'b2', { text: 'Nouveau texte' }), step('b3')])
    const next = replaceBlock(c, 'blk1', v3)!
    expect(next.steps.map((s) => s.id)).toEqual(['a', cp('b1'), cp('b2'), cp('b3'), 'z'])
    expect(next.steps[2].text).toBe('Nouveau texte')
    expect(next.translations!.en.steps.map((s) => s.id)).toEqual(['a', cp('b1'), 'z'])
  })

  it('rien ne change : rien à faire ; une copie en double part', () => {
    const copies = copyBlock(lockout, [step('b1')])
    expect(replaceBlock(content([step('a'), ...copies]), 'blk1', copies)).toBeNull()
    expect(replaceBlock(content([step('a')]), 'blk1', copies)).toBeNull()
    const twice = content([...copies, step('a'), ...copies])
    expect(replaceBlock(twice, 'blk1', copyBlock({ ...lockout, version: 3 }, [step('b1')]))!.steps.map((s) => s.id)).toEqual([cp('b1'), 'a'])
  })
})

describe('publier un bloc', () => {
  const gateway = (instructions: Array<Doc<Instruction>> = [], failOn = '') =>
    fakeGateway((endpoint, options) => {
      if (failOn && endpoint.includes(failOn) && options.method === 'PATCH') return new ApiError('panne', 500, null)
      if (endpoint.includes('clip_instruction/filter')) return { results: instructions }
      if (endpoint.includes('clip_org/filter')) return { results: [{ _id: 'org1', json_data: { app_identifier: 'clip-v3', name: 'U', numbering: { prefix: 'IT', next: 5 } } }] }
      if (endpoint.includes('/filter')) return { results: [] }
      if (options.method === 'POST') return { results: [{ inserted_id: endpoint.includes('clip_instruction') ? 'blkNew' : 'v1', json_data: {} }] }
      if (!options.method || options.method === 'GET') return { result: null }
      return { success: true }
    })

  it('un bloc ne va à aucun poste et n’a pas de numéro de document', async () => {
    const gw = gateway()
    const block = { _id: 'blk1', json_data: { title: 'Cadenasser', block: true, status: 'draft', stationIds: [], draft: content([step('b1')]), publishedVersion: null, publishedId: null } as unknown as Instruction }
    const r = await publishInstruction(dataApi(gw), block, org, actor)
    expect(r).toMatchObject({ number: 1, publishedId: null, docNumber: null })
    expect(gw.calls.some((c) => c.endpoint.includes('clip_published'))).toBe(false)
    expect(gw.calls.some((c) => c.endpoint.includes('clip_org'))).toBe(false)
    expect(gw.calls.some((c) => c.endpoint === '/api/v1/data/clip_version')).toBe(true)
  })

  it('« Faire un bloc commun » : le bloc est créé et publié, ses étapes prennent leur place, verrouillées', async () => {
    const gw = gateway()
    const source = content([step('a'), step('b'), step('c'), step('d')], { translations: { en: tr(['a', 'b', 'c', 'd']) }, quiz: [question('c')] })
    const { block, content: next } = await makeBlock(dataApi(gw), org, actor, source, ['b', 'c'], 'Cadenasser la presse')
    const created = gw.calls.find((c) => c.endpoint === '/api/v1/data/clip_instruction' && c.options.method === 'POST')!.options.body as { json_data: Instruction }
    expect(created.json_data).toMatchObject({ block: true, title: 'Cadenasser la presse' })
    expect(created.json_data.draft!.steps.map((s) => s.id)).toEqual(['b', 'c'])
    expect(gw.calls.some((c) => c.endpoint === '/api/v1/data/clip_version')).toBe(true)
    expect(block._id).toBe('blkNew')
    const mine = (id: string) => copyId('blkNew', id)
    expect(next.steps.map((s) => [s.id, s.fromBlock?.id ?? null])).toEqual([['a', null], [mine('b'), 'blkNew'], [mine('c'), 'blkNew'], ['d', null]])
    // Leurs traductions et leurs questions les suivent.
    expect(next.translations!.en.steps.map((s) => s.id)).toEqual(['a', mine('b'), mine('c'), 'd'])
    expect(next.quiz![0].stepId).toBe(mine('c'))
  })

  it('chaque instruction qui l’utilise suit : à jour, republiée ; en cours, son brouillon seulement', async () => {
    const old = copyBlock(lockout, [step('b1')])
    const uses = (id: string, over: Partial<Instruction>): Doc<Instruction> => ({ _id: id, json_data: { app_identifier: 'clip-v3', title: id, status: 'published', stationIds: ['s1'], draft: content([step('a'), ...old]), publishedVersion: 4, publishedId: `p-${id}`, number: 'IT-0001', ...over } as Instruction })
    const gw = gateway([uses('live', {}), uses('dirty', { dirty: true }), uses('review', { status: 'review' })])
    const r = await propagateBlock(dataApi(gw), org, actor, { ...lockout, version: 3, steps: [step('b1', 'Nouveau')] })
    expect(r).toEqual({ republished: 1, drafts: 2, failed: 0 })
    const version = gw.calls.find((c) => c.endpoint === '/api/v1/data/clip_version')!.options.body as { json_data: Version }
    expect(version.json_data).toMatchObject({ instructionId: 'live', number: 5 })
    expect(version.json_data.changelog.startsWith('Bloc commun « Cadenasser la presse » v3.')).toBe(true)
    const drafts = gw.calls.filter((c) => c.options.method === 'PATCH' && /clip_instruction\/one\/(dirty|review)/.test(c.endpoint)).map((c) => (c.options.body as { json_data: { draft: InstructionContent } }).json_data.draft.steps[1])
    expect(drafts.map((s) => [s.title, s.fromBlock?.version])).toEqual([['Nouveau', 3], ['Nouveau', 3]])
  })

  it('dupliquer un bloc donne un bloc', async () => {
    const gw = gateway()
    const block = { _id: 'blk1', json_data: { title: 'Cadenasser', block: true, status: 'published', stationIds: [], draft: content([step('b1')]), publishedVersion: 2, publishedId: null } as unknown as Instruction }
    await duplicateInstruction(dataApi(gw), block, actor)
    const created = gw.calls.find((c) => c.endpoint === '/api/v1/data/clip_instruction' && c.options.method === 'POST')!.options.body as { json_data: Instruction }
    expect(created.json_data.block).toBe(true)
  })

  it('une instruction qui n’a pas pu suivre est comptée, les autres continuent', async () => {
    const old = copyBlock(lockout, [step('b1')])
    const uses = (id: string): Doc<Instruction> => ({ _id: id, json_data: { app_identifier: 'clip-v3', title: id, status: 'draft', stationIds: [], draft: content([...old]), publishedVersion: null, publishedId: null } as unknown as Instruction })
    const gw = gateway([uses('bad'), uses('ok')], 'clip_instruction/one/bad')
    expect(await propagateBlock(dataApi(gw), org, actor, { ...lockout, version: 3, steps: [step('b1', 'Nouveau')] })).toEqual({ republished: 0, drafts: 1, failed: 1 })
  })
})

describe('ailleurs', () => {
  it('l’assistant d’édition ne modifie pas une étape empruntée à un bloc', () => {
    const c = content([step('a'), ...copyBlock(lockout, [step('b1')])])
    expect(() => applyOp(c, { op: 'update_step', step: cp('b1'), title: 'Autre' }, new Map())).toThrow(AgentOpError)
    expect(() => applyOp(c, { op: 'update_step', step: cp('b1'), title: 'Autre' }, new Map())).toThrow(/Cadenasser la presse/)
    expect(applyOp(c, { op: 'update_step', step: 'a', title: 'Autre' }, new Map()).content.steps[0].title).toBe('Autre')
  })

  it('la liste ne montre les blocs que dans leur vue', () => {
    expect(JSON.stringify(libraryFilter({}, []))).toContain('"json_data.block":{"$ne":true}')
    expect(JSON.stringify(libraryFilter({ blocks: true }, []))).toContain('"json_data.block":{"$eq":true}')
  })
})
