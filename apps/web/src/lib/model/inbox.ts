/**
 * « À voir » (toggle `notify`) : ce qui attend la personne, tiré des données de l'usine, sans rien
 * écrire de plus. Une instruction à approuver ou à signer, des changements demandés sur la sienne,
 * un danger signalé au poste, un écart relevé. Le plus récent d'abord.
 */
import type { Doc } from '../gateway/data'
import { canSign } from './approvals'
import type { ApprovalGroup, Execution, Feedback, Instruction } from './types'

export type InboxKind = 'review' | 'changes' | 'danger' | 'deviation'

export interface InboxItem {
  id: string
  kind: InboxKind
  /** L'instruction en cause. */
  title: string
  /** Qui, ou ce qui a été dit. */
  who?: string | null
  text?: string | null
  at: string
  href: string
}

export interface InboxInput {
  userId: string
  instructions: Doc<Instruction>[]
  feedback: Doc<Feedback>[]
  executions: Doc<Execution>[]
  /** Les groupes qui signent (approbation à plusieurs), sinon vide. */
  groups: ApprovalGroup[]
  can: { approve: boolean; feedback: boolean }
}

export function buildInbox(x: InboxInput): InboxItem[] {
  const items: InboxItem[] = []
  for (const d of x.instructions) {
    const i = d.json_data
    const r = i.review
    if (i.status === 'review' && r && x.can.approve && r.requestedBy !== x.userId) {
      // À plusieurs : seulement si un de mes groupes n'a pas encore signé.
      const signed = new Set((r.signatures ?? []).map((s) => s.groupId))
      const mine = x.groups.length ? x.groups.some((g) => !signed.has(g.id) && canSign(g, x.userId, true)) : true
      if (mine) items.push({ id: `review:${d._id}:${r.requestedAt}`, kind: 'review', title: i.title, who: r.requestedByName, text: r.note ?? null, at: r.requestedAt, href: `/instructions/${d._id}` })
    }
    const c = r?.changesRequested
    if (c && i.status !== 'review' && (r?.requestedBy === x.userId || i.authorId === x.userId) && c.by !== x.userId)
      items.push({ id: `changes:${d._id}:${c.at}`, kind: 'changes', title: i.title, who: c.byName, text: c.comment, at: c.at, href: `/instructions/${d._id}` })
  }
  if (x.can.feedback) {
    for (const d of x.feedback) {
      const f = d.json_data
      if (f.kind !== 'danger' || f.status !== 'new') continue
      items.push({ id: `danger:${d._id}`, kind: 'danger', title: f.instructionTitle ?? '', who: f.operatorName ?? f.authorName ?? null, text: f.comment ?? null, at: f.createdAt, href: `/retours` })
    }
    for (const d of x.executions) {
      const e = d.json_data
      if (!e.deviations) continue
      const first = e.answers.find((a) => a.ok === false)
      items.push({ id: `deviation:${d._id}`, kind: 'deviation', title: e.instructionTitle, who: e.operatorName ?? e.userName ?? null, text: first ? first.label : null, at: e.finishedAt, href: `/registre?ecarts=1` })
    }
  }
  return items.sort((a, b) => b.at.localeCompare(a.at))
}

/** Ce qui est arrivé depuis la dernière visite. */
export const unseenCount = (items: InboxItem[], seenAt: string): number => items.filter((i) => i.at > seenAt).length
