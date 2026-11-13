import { describe, expect, it } from 'vitest'
import { dataApi, type Doc } from '@/lib/gateway/data'
import { buildInbox, unseenCount } from '@/lib/model/inbox'
import type { Contact, Execution, Feedback, Instruction } from '@/lib/model/types'
import { addPushToken, ensureContact } from '@/lib/notify'
import { fakeGateway } from './fakeClient'

const instr = (id: string, over: Partial<Instruction>): Doc<Instruction> => ({ _id: id, json_data: { title: `Instruction ${id}`, status: 'draft', authorId: 'mel', ...over } as Instruction })
const review = (by: string, at: string, signatures: Array<{ groupId: string }> = []) => ({ requestedBy: by, requestedByName: by === 'luc' ? 'Luc' : 'Mel', requestedAt: at, approverIds: [], signatures: signatures.map((s) => ({ ...s, groupName: '', by: 'x', byName: 'X', at, hash: 'h' })) })

const base = {
  instructions: [
    instr('a', { status: 'review', review: review('luc', '2026-11-13T09:00:00Z') }),
    instr('b', { status: 'review', review: review('mel', '2026-11-13T08:00:00Z') }),
    instr('c', { status: 'draft', authorId: 'mel', review: { ...review('mel', '2026-11-12T08:00:00Z'), changesRequested: { by: 'nat', byName: 'Nathalie', at: '2026-11-13T10:00:00Z', comment: 'Ajouter la pression' } } }),
  ],
  feedback: [
    { _id: 'f1', json_data: { kind: 'danger', status: 'new', instructionTitle: 'Presse', comment: 'Garde brisé', operatorName: 'Julie', createdAt: '2026-11-13T11:00:00Z' } as Feedback },
    { _id: 'f2', json_data: { kind: 'idea', status: 'new', createdAt: '2026-11-13T11:30:00Z' } as Feedback },
  ],
  executions: [
    { _id: 'e1', json_data: { instructionTitle: 'Rails', deviations: 1, operatorName: 'Kevin', finishedAt: '2026-11-13T07:00:00Z', answers: [{ ok: false, label: 'Graisse' }] } as unknown as Execution },
    { _id: 'e2', json_data: { instructionTitle: 'Rails', deviations: 0, finishedAt: '2026-11-13T12:00:00Z', answers: [] } as unknown as Execution },
  ],
}

describe('« À voir »', () => {
  it('montre ce qui m’attend, le plus récent d’abord, jamais ma propre demande', () => {
    const items = buildInbox({ ...base, userId: 'mel', groups: [], can: { approve: true, feedback: true } })
    expect(items.map((i) => [i.kind, i.title])).toEqual([
      ['danger', 'Presse'],
      ['changes', 'Instruction c'],
      ['review', 'Instruction a'],
      ['deviation', 'Rails'],
    ])
    expect(items[0]).toMatchObject({ who: 'Julie', text: 'Garde brisé', href: '/retours' })
    expect(items[3]).toMatchObject({ who: 'Kevin', text: 'Graisse' })
  })

  it('selon les droits : sans approbation ni retours, seulement mes changements demandés', () => {
    const items = buildInbox({ ...base, userId: 'mel', groups: [], can: { approve: false, feedback: false } })
    expect(items.map((i) => i.kind)).toEqual(['changes'])
  })

  it('à plusieurs signatures : seulement ce que mes groupes n’ont pas signé', () => {
    const signed = { ...base, instructions: [instr('a', { status: 'review', review: review('luc', '2026-11-13T09:00:00Z', [{ groupId: 'g_q' }]) })] }
    const groups = [{ id: 'g_q', name: 'Qualité', memberIds: ['mel'] }, { id: 'g_p', name: 'Production', memberIds: ['nat'] }]
    expect(buildInbox({ ...signed, userId: 'mel', groups, can: { approve: true, feedback: false } })).toEqual([])
    expect(buildInbox({ ...signed, userId: 'nat', groups, can: { approve: true, feedback: false } }).map((i) => i.kind)).toEqual(['review'])
  })

  it('compte ce qui est arrivé depuis la dernière visite', () => {
    const items = buildInbox({ ...base, userId: 'mel', groups: [], can: { approve: true, feedback: true } })
    expect(unseenCount(items, '2026-11-13T08:30:00Z')).toBe(3)
    expect(unseenCount(items, '2026-11-14T00:00:00Z')).toBe(0)
  })
})

describe('la fiche de contact', () => {
  it('se crée à la première visite, puis suit le nom, le courriel et la langue', async () => {
    const empty = fakeGateway((endpoint) => (endpoint.endsWith('/filter') ? { results: [] } : { results: [{ inserted_id: 'c1', json_data: {} }] }))
    const created = await ensureContact(dataApi(empty), { userId: 'mel', name: 'Mélanie', email: 'mel@usine.ca' }, 'fr')
    expect(created?._id).toBe('c1')
    expect((empty.calls[1].options.body as { json_data: Contact }).json_data).toMatchObject({ userId: 'mel', email: 'mel@usine.ca', lang: 'fr', emails: true, push: true, pushTokens: [] })

    const existing = { _id: 'c1', json_data: { app_identifier: 'clip-v3', userId: 'mel', name: 'Mélanie', email: 'mel@usine.ca', lang: 'fr', emails: false, push: true, pushTokens: [], updatedAt: '' } }
    const same = fakeGateway(() => ({ results: [existing] }))
    await ensureContact(dataApi(same), { userId: 'mel', name: 'Mélanie', email: 'mel@usine.ca' }, 'fr')
    expect(same.calls).toHaveLength(1)
    const changed = fakeGateway((endpoint, options) => (options.method === 'PATCH' ? { success: true } : { results: [existing] }))
    await ensureContact(dataApi(changed), { userId: 'mel', name: 'Mélanie', email: 'mel@usine.ca' }, 'en')
    const patch = changed.calls.find((c) => c.options.method === 'PATCH')!.options.body as { json_data: Record<string, unknown> }
    // Sa langue change ; ce qu'elle a choisi de recevoir, non.
    expect(patch.json_data).toMatchObject({ lang: 'en' })
    expect(patch.json_data).not.toHaveProperty('emails')
  })

  it('garde cinq téléphones au plus, sans doublon, le plus récent à la fin', async () => {
    const tokens = Array.from({ length: 5 }, (_, i) => ({ token: `T${i}`, platform: 'ios' as const, updatedAt: '' }))
    const gw = fakeGateway(() => ({ success: true }))
    await addPushToken(dataApi(gw), { _id: 'c1', json_data: { pushTokens: tokens } as unknown as Contact }, 'T2', 'android')
    const body = gw.calls[0].options.body as { json_data: { pushTokens: Array<{ token: string }>; push: boolean } }
    expect(body.json_data.pushTokens.map((p) => p.token)).toEqual(['T0', 'T1', 'T3', 'T4', 'T2'])
    expect(body.json_data.push).toBe(true)
  })
})
