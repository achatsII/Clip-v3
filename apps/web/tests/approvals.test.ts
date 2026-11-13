import { describe, expect, it } from 'vitest'
import { dataApi } from '@/lib/gateway/data'
import { addSignatures, approvalsOf, canSign, contentHash, groupsToSign, needsApproval, signingGroups, signingState } from '@/lib/model/approvals'
import { emptyContent } from '@/lib/model/repo'
import { requestChanges, requestReview, saveSignatures } from '@/lib/model/service'
import type { ApprovalGroup, Instruction, OrgSettings, ReviewRequest } from '@/lib/model/types'
import { fakeGateway } from './fakeClient'

const quality: ApprovalGroup = { id: 'g_q', name: 'Qualité', memberIds: ['nathalie'] }
const shop: ApprovalGroup = { id: 'g_s', name: 'Chef d’atelier', memberIds: [] }
const org = (mode: 'none' | 'one' | 'all', groups: ApprovalGroup[] = [quality, shop]) => ({ approval: { mode, approverIds: ['a1'], groups } }) as Pick<OrgSettings, 'approval'>
const content = emptyContent({ title: 'Changer la matrice', steps: [{ id: 'st_1', title: 'Cadenasser', text: '', media: [] }] })
const later = { ...content, steps: [{ ...content.steps[0], text: 'Poser le cadenas.' }] }

describe('approbation à plusieurs : qui doit signer', () => {
  it('seulement en mode « plusieurs signatures », toggle allumé, groupes nommés', () => {
    expect(signingGroups(org('all'), true).map((g) => g.id)).toEqual(['g_q', 'g_s'])
    expect(signingGroups(org('all', [quality, { id: 'g_x', name: '  ', memberIds: [] }]), true).map((g) => g.id)).toEqual(['g_q'])
    expect(signingGroups(org('one'), true)).toEqual([])
    expect(signingGroups(org('all'), false)).toEqual([])
  })

  it('à plusieurs, même un approbateur fait signer ; toggle coupé, comme une seule approbation', () => {
    expect(needsApproval(org('none'), 'author', true)).toBe(false)
    expect(needsApproval(org('one'), 'author', true)).toBe(true)
    expect(needsApproval(org('one'), 'approver', true)).toBe(false)
    expect(needsApproval(org('all'), 'approver', true)).toBe(true)
    expect(needsApproval(org('all'), 'admin', true)).toBe(true)
    expect(needsApproval(org('all'), 'approver', false)).toBe(false)
    expect(needsApproval(org('all'), 'author', false)).toBe(true)
  })

  it('un membre signe pour son groupe ; un groupe sans membre, tout approbateur', () => {
    expect(canSign(quality, 'nathalie', true)).toBe(true)
    expect(canSign(quality, 'luc', true)).toBe(false)
    expect(canSign(shop, 'luc', true)).toBe(true)
    expect(canSign(shop, 'luc', false)).toBe(false)
  })
})

describe('les signatures', () => {
  const groups = [quality, shop]
  const at = '2026-11-13T10:00:00Z'

  it('valent pour le contenu signé : modifié ensuite, à refaire', () => {
    const hash = contentHash(content)
    const { signatures, complete } = addSignatures([], groups, [quality], { id: 'nathalie', name: 'Nathalie Roy' }, hash, at)
    expect(complete).toBe(false)
    const review = { signatures } as ReviewRequest
    const now = signingState(groups, review, content)
    expect(now.map((s) => [s.group.id, !!s.signature, s.stale])).toEqual([
      ['g_q', true, false],
      ['g_s', false, false],
    ])
    const changed = signingState(groups, review, later)
    expect(changed[0]).toMatchObject({ signature: null, stale: true })
    // Nathalie ne signe que pour la Qualité ; Luc, pour l'atelier sans membre.
    expect(groupsToSign(now, 'nathalie', true).map((g) => g.id)).toEqual(['g_s'])
    expect(groupsToSign(changed, 'nathalie', true).map((g) => g.id)).toEqual(['g_q', 'g_s'])
    expect(groupsToSign(now, 'luc', true).map((g) => g.id)).toEqual(['g_s'])
  })

  it('la dernière signature complète ; une nouvelle signature du groupe remplace l’ancienne', () => {
    const hash = contentHash(content)
    const first = addSignatures([], groups, [quality], { id: 'nathalie', name: 'Nathalie Roy' }, 'vieux', at).signatures
    // Une signature sur un contenu d'avant ne compte pas : la publication attend.
    expect(addSignatures(first, groups, [shop], { id: 'luc', name: 'Luc Gagnon' }, hash, at).complete).toBe(false)
    const again = addSignatures(first, groups, [quality], { id: 'nathalie', name: 'Nathalie Roy' }, hash, at).signatures
    expect(again.filter((s) => s.groupId === 'g_q')).toHaveLength(1)
    const done = addSignatures(again, groups, [shop], { id: 'luc', name: 'Luc Gagnon' }, hash, at)
    expect(done.complete).toBe(true)
    expect(approvalsOf(done.signatures, groups, hash).line).toBe('Nathalie Roy (Qualité), Luc Gagnon (Chef d’atelier)')
  })
})

describe('la revue, rangée dans l’instruction', () => {
  const doc = { _id: 'i1', json_data: { status: 'draft', publishedVersion: null } as unknown as Instruction }

  it('une demande nomme les membres des groupes et repart sans signature', async () => {
    const gw = fakeGateway(() => ({ success: true }))
    await requestReview(dataApi(gw), doc, { ...org('all', [quality, { ...shop, memberIds: ['luc', 'nathalie'] }]) } as OrgSettings, { id: 'mel', name: 'Mélanie' })
    const review = (gw.calls[0].options.body as { json_data: { review: ReviewRequest } }).json_data.review
    expect(review.approverIds.sort()).toEqual(['luc', 'nathalie'])
    expect(review.signatures).toEqual([])
  })

  it('des changements demandés effacent les signatures', async () => {
    const gw = fakeGateway(() => ({ success: true }))
    const inReview = { _id: 'i1', json_data: { status: 'review', publishedVersion: 2, review: { requestedBy: 'mel', requestedByName: 'Mélanie', requestedAt: '', approverIds: [], signatures: [{ groupId: 'g_q', groupName: 'Qualité', by: 'n', byName: 'N', at: '', hash: 'h' }] } } as unknown as Instruction }
    await requestChanges(dataApi(gw), inReview, { id: 'luc', name: 'Luc' }, 'La pression manque')
    const json = (gw.calls[0].options.body as { json_data: { review: ReviewRequest; status: string } }).json_data
    expect(json.review.signatures).toEqual([])
    expect(json.status).toBe('published')
  })

  it('une signature posée par quelqu’un d’autre entre-temps reste', async () => {
    const theirs = { groupId: 'g_s', groupName: 'Chef d’atelier', by: 'luc', byName: 'Luc', at: '', hash: 'h' }
    const gw = fakeGateway((endpoint, options) => (options.method === 'PATCH' ? { success: true } : { result: { _id: 'i1', json_data: { app_identifier: 'clip-v3', review: { signatures: [theirs] } } } }))
    const mine = { groupId: 'g_q', groupName: 'Qualité', by: 'nathalie', byName: 'Nathalie', at: '', hash: 'h' }
    const all = await saveSignatures(dataApi(gw), 'i1', [mine])
    expect(all.map((s) => s.groupId).sort()).toEqual(['g_q', 'g_s'])
    const patch = gw.calls.find((c) => c.options.method === 'PATCH')!.options.body as { json_data: Record<string, unknown> }
    expect(patch.json_data['review.signatures']).toEqual(all)
  })
})
