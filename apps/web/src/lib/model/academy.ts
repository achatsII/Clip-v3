/**
 * L'Académie (module ; toggle `academy`, feature `academy`) : former chaque personne et la garder
 * qualifiée, poste par poste.
 *
 * - Le parcours d'un poste, ce sont ses instructions publiées : prêt d'avance, rien à monter. Les
 *   questions de chacune se valident au poste, comme sans le module.
 * - Une personne est qualifiée quand un superviseur la valide sur le terrain (`clip_qualification`) :
 *   un journal où la plus récente signature par personne et par poste fait foi, et qui sert de
 *   registre pour l'audit. « Peut former » est un cran de plus ; retirer la qualification aussi signe.
 * - Une qualification vaut le temps que l'usine a choisi (`OrgSettings.academy.revalidateMonths`),
 *   puis il faut revalider ; un mois avant, « À voir » le rappelle.
 *
 * Pas un LMS : ni cours libres, ni catalogue, ni palmarès (VISION.md).
 */
import type { DataApi, Doc } from '../gateway/data'
import { toCsv, type CsvSep } from '../util/csv'
import { T } from './repo'
import type { MatrixCell } from './training'
import type { Operator, OrgSettings, Qualification, QualificationLevel, Shift } from './types'

/** La clé de cache du registre (l'Académie, « À voir », l'attestation). */
export const QUALIFICATIONS_KEY = ['qualifications'] as const

export const DEFAULT_REVALIDATE_MONTHS = 12
/** Les choix de l'usine : tous les 6, 12 ou 24 mois, ou jamais (0). */
export const REVALIDATE_CHOICES = [6, 12, 24, 0] as const
/** Un mois avant l'échéance, la revalidation se rappelle. */
export const DUE_SOON_DAYS = 30
const DAY = 86400_000

export const revalidateMonths = (org: Pick<OrgSettings, 'academy'>): number => org.academy?.revalidateMonths ?? DEFAULT_REVALIDATE_MONTHS

/** Jusqu'à quand vaut une qualification signée à `at` ; null : sans échéance. */
export function validUntilOf(at: string, months: number): string | null {
  if (!months) return null
  const d = new Date(at)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  // Le 31 janvier + 1 mois : le dernier jour de février, pas le 3 mars.
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return d.toISOString()
}

export type Level = 'none' | 'learning' | 'qualified' | 'trainer' | 'expired'

export interface Standing {
  level: Level
  /** La signature qui fait foi (même échue) ; null : jamais qualifiée, ou qualification retirée. */
  current: Qualification | null
  /** Qualifiée, mais l'échéance tombe dans moins d'un mois. */
  dueSoon: boolean
  /** Les questions du poste : validées, en tout, et s'il faut en refaire (« Il faut se re-former »). */
  done: number
  required: number
  retrain: boolean
}

const key = (operatorId: string, stationId: string) => `${operatorId}:${stationId}`

/** La plus récente signature par personne et par poste. */
export function latestQualifications(docs: Array<Doc<Qualification>>): Map<string, Qualification> {
  const out = new Map<string, Qualification>()
  for (const { json_data: q } of docs) {
    const k = key(q.operatorId, q.stationId)
    const prev = out.get(k)
    if (!prev || q.at > prev.at) out.set(k, q)
  }
  return out
}

/** Où en est une personne à un poste : ses questions (la matrice) et sa qualification. */
export function standingOf(cell: MatrixCell | undefined, q: Qualification | undefined, now: number): Standing {
  const required = cell?.required.length ?? 0
  const done = cell?.done ?? 0
  const retrain = !!cell?.required.some((r) => r.state === 'outdated')
  const base = { done, required, retrain }
  if (q && q.level !== 'none') {
    const until = q.validUntil ? Date.parse(q.validUntil) : null
    if (until !== null && until <= now) return { level: 'expired', current: q, dueSoon: false, ...base }
    return { level: q.level, current: q, dueSoon: until !== null && until - now <= DUE_SOON_DAYS * DAY, ...base }
  }
  return { level: done > 0 ? 'learning' : 'none', current: null, dueSoon: false, ...base }
}

export const isQualified = (s: Standing) => s.level === 'qualified' || s.level === 'trainer'

/* ───────────────────────── La couverture par quart ───────────────────────── */

export type ShiftKey = Shift | 'none'
export interface CoverageCell {
  people: Array<{ id: string; name: string; level: 'qualified' | 'trainer' }>
  /** Personne, une seule (fragile), ou au moins deux. */
  tone: 'none' | 'fragile' | 'ok'
}

const SHIFT_ORDER: ShiftKey[] = ['jour', 'soir', 'nuit', 'fds', 'rotation', 'none']

/**
 * Qui peut tenir chaque poste, quart par quart : les personnes qualifiées (ou qui peuvent former).
 * Les quarts sont ceux de l'équipe ; « sans quart » seulement si quelqu'un n'en a pas.
 */
export function coverage(operators: Array<Doc<Operator>>, stationIds: string[], standing: (operatorId: string, stationId: string) => Standing): { shifts: ShiftKey[]; cells: Record<string, Partial<Record<ShiftKey, CoverageCell>>> } {
  const active = operators.filter((o) => o.json_data.active !== false)
  const present = new Set<ShiftKey>(active.map((o) => o.json_data.shift ?? 'none'))
  const shifts = SHIFT_ORDER.filter((s) => present.has(s))
  const cells: Record<string, Partial<Record<ShiftKey, CoverageCell>>> = {}
  for (const st of stationIds) {
    cells[st] = {}
    for (const sh of shifts) {
      const people = active
        .filter((o) => (o.json_data.shift ?? 'none') === sh)
        .map((o) => ({ o, s: standing(o._id, st) }))
        .filter(({ s }) => isQualified(s))
        .map(({ o, s }) => ({ id: o._id, name: o.json_data.name, level: s.level as 'qualified' | 'trainer' }))
        .sort((a, b) => (a.level === b.level ? a.name.localeCompare(b.name) : a.level === 'trainer' ? -1 : 1))
      cells[st][sh] = { people, tone: people.length === 0 ? 'none' : people.length === 1 ? 'fragile' : 'ok' }
    }
  }
  return { shifts, cells }
}

/* ───────────────────────── Les rappels ───────────────────────── */

export interface Due {
  operatorId: string
  operatorName: string
  stationId: string
  stationName: string
  validUntil: string
  expired: boolean
}

/** Les qualifications à revalider : échues, ou dans le mois ; celles des personnes encore dans l'équipe. */
export function dueQualifications(latest: Map<string, Qualification>, operators: Array<Doc<Operator>>, now: number): Due[] {
  const active = new Set(operators.filter((o) => o.json_data.active !== false).map((o) => o._id))
  const out: Due[] = []
  for (const q of latest.values()) {
    if (q.level === 'none' || !q.validUntil || !active.has(q.operatorId)) continue
    const until = Date.parse(q.validUntil)
    if (until - now > DUE_SOON_DAYS * DAY) continue
    out.push({ operatorId: q.operatorId, operatorName: q.operatorName, stationId: q.stationId, stationName: q.stationName, validUntil: q.validUntil, expired: until <= now })
  }
  return out.sort((a, b) => a.validUntil.localeCompare(b.validUntil))
}

/* ───────────────────────── Le registre ───────────────────────── */

/**
 * Le registre pour l'audit, en CSV : chaque signature, la plus récente d'abord (le journal entier).
 * Les questions en deux colonnes de nombres : « 2/3 » deviendrait une date dans le tableur.
 */
export function registerCsv(docs: Array<Doc<Qualification>>, head: string[], levelName: (l: QualificationLevel) => string, date: (iso: string | null) => string, sep: CsvSep = ','): string {
  const rows = [...docs].sort((a, b) => b.json_data.at.localeCompare(a.json_data.at)).map(({ json_data: q }) => [q.operatorName, q.stationName, levelName(q.level), q.byName, date(q.at), date(q.validUntil), q.trainingsDone, q.trainingsRequired, q.note ?? ''])
  return toCsv([head, ...rows], sep)
}

/* ───────────────────────── Lire, signer ───────────────────────── */

/** Le journal des qualifications (le registre), le plus récent d'abord. */
export function listQualifications(data: DataApi): Promise<Array<Doc<Qualification>>> {
  return data.filter<Qualification>(T.qualification, { sort: { 'json_data.at': -1 }, limit: 5000 })
}

/**
 * Valide une personne à un poste sur le terrain (ou retire sa qualification, `level: 'none'`) : une
 * nouvelle signature au journal, avec l'échéance que l'usine a choisie.
 */
export function signOff(data: DataApi, q: Omit<Qualification, 'at' | 'validUntil'>, months: number, at = new Date().toISOString()): Promise<Doc<Qualification>> {
  const validUntil = q.level === 'none' ? null : validUntilOf(at, months)
  return data.insert<Qualification>(T.qualification, { ...q, at, validUntil }, `${q.operatorName} · ${q.stationName}`)
}
