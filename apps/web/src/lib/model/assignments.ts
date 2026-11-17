/**
 * Qui doit être formé, à quel poste, et pour quand (Académie). Une personne doit tenir ses postes
 * habituels (`Operator.stationIds`) et ceux où on l'envoie se former (`clip_assignment`, avec une
 * échéance). C'est ce qui rend la matrice lisible (une case compte seulement là où quelque chose est
 * attendu) et ce qui fait la liste « À faire » : chaque personne à former, la plus pressée d'abord.
 *
 * Pas un LMS (VISION.md) : le parcours d'un poste reste ses instructions publiées, et leurs questions
 * se répondent au poste ; l'affectation dit seulement qui doit le suivre.
 */
import type { DataApi, Doc } from '../gateway/data'
import type { Standing } from './academy'
import { T } from './repo'
import type { Assignment, Operator } from './types'

export const ASSIGNMENTS_KEY = ['assignments'] as const
const DAY = 86_400_000
/** Une échéance dans la semaine se signale (avant, elle attend sans bruit). */
export const DUE_WARN_DAYS = 7

const pair = (operatorId: string, stationId: string) => `${operatorId}:${stationId}`

/** Le journal des affectations, le plus récent d'abord. */
export function listAssignments(data: DataApi): Promise<Array<Doc<Assignment>>> {
  return data.filter<Assignment>(T.assignment, { sort: { 'json_data.at': -1 }, limit: 5000 })
}

/** L'affectation qui fait foi pour chaque personne et chaque poste (sans celles qu'on a retirées). */
export function latestAssignments(docs: Array<Doc<Assignment>>): Map<string, Assignment> {
  const latest = new Map<string, Assignment>()
  for (const { json_data: a } of docs) {
    const k = pair(a.operatorId, a.stationId)
    const prev = latest.get(k)
    if (!prev || a.at > prev.at) latest.set(k, a)
  }
  for (const [k, a] of latest) if (a.removed) latest.delete(k)
  return latest
}

export const assignmentOf = (latest: Map<string, Assignment>, operatorId: string, stationId: string) => latest.get(pair(operatorId, stationId))

/** Ce qu'on attend d'une personne à un poste : son poste habituel, ou une formation demandée. */
export function requiredOf(op: Doc<Operator>, stationId: string, latest: Map<string, Assignment>): 'usual' | 'assigned' | null {
  if (latest.has(pair(op._id, stationId))) return 'assigned'
  return op.json_data.stationIds?.includes(stationId) ? 'usual' : null
}

type Actor = { id: string; name: string }
type Who = { id: string; name: string }

/** Envoie des personnes se former à un poste, d'ici une date (ou sans échéance). */
export function assignTraining(data: DataApi, people: Who[], station: Who, due: string | null, by: Actor, at = new Date().toISOString()): Promise<Array<Doc<Assignment>>> {
  const items: Assignment[] = people.map((p) => ({ operatorId: p.id, operatorName: p.name, stationId: station.id, stationName: station.name, due, byId: by.id, byName: by.name, at }))
  return data.insertMany<Assignment>(T.assignment, items, station.name)
}

/** Retire une personne de « À faire » à ce poste (le journal le garde). */
export function removeAssignment(data: DataApi, a: Assignment, by: Actor, at = new Date().toISOString()): Promise<Doc<Assignment>> {
  return data.insert<Assignment>(T.assignment, { ...a, byId: by.id, byName: by.name, at, removed: true }, a.stationName)
}

/** L'échéance d'un jour (AAAA-MM-JJ) : dépassée, proche (dans la semaine), ou loin. */
export function dueState(due: string | null | undefined, now: number): 'none' | 'overdue' | 'soon' | 'later' {
  if (!due) return 'none'
  const end = Date.parse(`${due}T23:59:59`)
  if (!Number.isFinite(end)) return 'none'
  if (end < now) return 'overdue'
  return end - now <= DUE_WARN_DAYS * DAY ? 'soon' : 'later'
}

export interface TodoItem {
  operator: Doc<Operator>
  station: { id: string; name: string }
  standing: Standing
  /** Pourquoi c'est attendu : un poste habituel, ou une formation demandée (avec son échéance). */
  reason: 'usual' | 'assigned'
  due: string | null
  dueState: ReturnType<typeof dueState>
  /** Toutes les questions du poste sont répondues : il reste à valider sur le terrain. */
  ready: boolean
}

const RANK = { overdue: 0, soon: 1, later: 2, none: 3 } as const

/**
 * « À faire » : chaque personne qui doit tenir un poste et n'y est pas qualifiée (ou plus) ; en
 * retard d'abord, puis par échéance, puis celles prêtes à valider, puis par nom.
 */
export function todoList(operators: Array<Doc<Operator>>, stations: Array<{ id: string; name: string }>, latest: Map<string, Assignment>, standing: (operatorId: string, stationId: string) => Standing, now: number): TodoItem[] {
  const out: TodoItem[] = []
  for (const op of operators) {
    if (op.json_data.active === false) continue
    for (const st of stations) {
      const reason = requiredOf(op, st.id, latest)
      if (!reason) continue
      const s = standing(op._id, st.id)
      if (s.level === 'qualified' || s.level === 'trainer') continue
      const due = reason === 'assigned' ? (assignmentOf(latest, op._id, st.id)?.due ?? null) : null
      out.push({ operator: op, station: st, standing: s, reason, due, dueState: dueState(due, now), ready: s.required > 0 && s.done >= s.required })
    }
  }
  return out.sort(
    (a, b) =>
      RANK[a.dueState] - RANK[b.dueState] ||
      (a.due && b.due ? a.due.localeCompare(b.due) : 0) ||
      Number(b.ready) - Number(a.ready) ||
      a.operator.json_data.name.localeCompare(b.operator.json_data.name) ||
      a.station.name.localeCompare(b.station.name),
  )
}

export interface LateTraining {
  operatorId: string
  operatorName: string
  stationId: string
  stationName: string
  due: string
}

/**
 * Les formations en retard (« À voir », à qui valide) : une échéance passée, et la personne pas
 * qualifiée au poste selon le registre (ou plus : échue) ; seulement les personnes encore dans l'équipe.
 */
export function lateTrainings(latest: Map<string, Assignment>, qualifiedAt: (operatorId: string, stationId: string) => boolean, operators: Array<Doc<Operator>>, now: number): LateTraining[] {
  const active = new Set(operators.filter((o) => o.json_data.active !== false).map((o) => o._id))
  const out: LateTraining[] = []
  for (const a of latest.values()) {
    if (!a.due || !active.has(a.operatorId) || dueState(a.due, now) !== 'overdue' || qualifiedAt(a.operatorId, a.stationId)) continue
    out.push({ operatorId: a.operatorId, operatorName: a.operatorName, stationId: a.stationId, stationName: a.stationName, due: a.due })
  }
  return out.sort((x, y) => x.due.localeCompare(y.due))
}

/** Une échéance par défaut : dans 30 jours (AAAA-MM-JJ, jour local). */
export function defaultDue(now = new Date()): string {
  const d = new Date(now.getTime() + 30 * DAY)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
