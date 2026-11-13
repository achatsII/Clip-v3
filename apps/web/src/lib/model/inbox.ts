/**
 * « À voir » (toggle `notify`) : ce qui attend la personne, tiré des données de l'usine, sans rien
 * écrire de plus. Une instruction à approuver ou à signer, des changements demandés sur la sienne,
 * un danger signalé au poste, un écart relevé. Le plus récent d'abord.
 */
import { FEATURE_LABELS, featureLabel, type FeatureKey } from '../billing/catalog'
import { messages } from '../i18n/core'
import { formatDate } from '../util/cn'
import { DUE_SOON_DAYS, type Due } from './academy'
import type { Doc } from '../gateway/data'
import { canSign } from './approvals'
import type { ApprovalGroup, Execution, Feedback, Instruction, UpgradeRequest } from './types'

export type InboxKind = 'review' | 'changes' | 'danger' | 'deviation' | 'request' | 'requalify'

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
  can: { approve: boolean; feedback: boolean; buy?: boolean }
  /** Les demandes à l'administrateur des 30 derniers jours (conseiller d'achat). */
  requests?: Doc<UpgradeRequest>[]
  /** Ce que l'usine a déjà (l'état de facturation) : une demande comblée disparaît. */
  granted?: Record<string, boolean>
  /** L'Académie : les qualifications à revalider (échues, ou dans le mois). */
  due?: Due[]
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
  // L'Académie : à qui valide, les qualifications à revalider ; « nouvelles » dès que le rappel commence.
  if (x.can.approve) {
    const t = messages().academy.inbox
    for (const d of x.due ?? []) {
      const until = Date.parse(d.validUntil)
      const start = new Date(d.expired ? until : until - DUE_SOON_DAYS * 86400_000).toISOString()
      items.push({ id: `requalify:${d.operatorId}:${d.stationId}:${d.validUntil}`, kind: 'requalify', title: d.operatorName, text: (d.expired ? t.expired : t.due)(d.stationName, formatDate(d.validUntil)), at: start, href: `/equipe?vue=competences&q=${encodeURIComponent(d.operatorName)}` })
    }
  }

  // Les demandes à l'administrateur : une ligne par fonction, tant que l'usine ne l'a pas.
  if (x.can.buy) {
    const byFeature = new Map<string, Array<Doc<UpgradeRequest>>>()
    for (const d of x.requests ?? []) {
      if (x.granted?.[d.json_data.feature]) continue
      byFeature.set(d.json_data.feature, [...(byFeature.get(d.json_data.feature) ?? []), d])
    }
    for (const [feature, docs] of byFeature) {
      const latest = docs.reduce((a, b) => (b.json_data.at > a.json_data.at ? b : a))
      const names = [...new Set(docs.map((d) => d.json_data.byName))]
      const label = feature in FEATURE_LABELS ? featureLabel(feature as FeatureKey) : feature
      // Ce qui l'ouvrirait (« Avec Usine ») ; rien quand c'est le module lui-même.
      const target = latest.json_data.targetName
      const text = target && !label.startsWith(target) ? messages().inbox.comesWith(target) : null
      items.push({ id: `request:${feature}:${latest.json_data.at}`, kind: 'request', title: label, who: names.slice(0, 3).join(', '), text, at: latest.json_data.at, href: '/reglages/abonnement' })
    }
  }
  return items.sort((a, b) => b.at.localeCompare(a.at))
}

/** Ce qui est arrivé depuis la dernière visite. */
export const unseenCount = (items: InboxItem[], seenAt: string): number => items.filter((i) => i.at > seenAt).length
