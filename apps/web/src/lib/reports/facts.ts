/**
 * Les mesures des rapports (toggle `reports`) : le code calcule chaque chiffre, toujours de la même
 * façon, et l'IA ne fait que les commenter. Fonctions pures, testées.
 *
 * - Une période : les N derniers jours de calendrier, aujourd'hui compris (jusqu'à maintenant) ; la
 *   précédente est la même fenêtre, N jours plus tôt (même longueur, même heure du jour).
 * - Un « fait » (une instruction terminée au poste) vient de l'événement `complete` : qui, où, quelle
 *   version, combien de temps. Une durée de moins de 10 s ou de plus de 12 h ne compte pas dans les
 *   temps (une tablette oubliée), mais la réalisation compte.
 * - Un taux se calcule en somme sur somme (jamais une moyenne de taux) ; sans données, « — ».
 * - Un temps se dit en médiane (le temps habituel) et au 90e centile (9 fois sur 10, moins que ça) ;
 *   sous 5 réalisations, l'échantillon est faible et le rapport le dit.
 */
import type { Execution, Feedback, Shift, UsageEvent } from '../model/types'

export const DAY = 86_400_000
export const PERIOD_CHOICES = [7, 30, 90] as const
export type PeriodDays = (typeof PERIOD_CHOICES)[number]
export const MIN_SAMPLE = 5
const MIN_SEC = 10
const MAX_SEC = 12 * 3600

export interface Period {
  from: number
  to: number
  days: number
}

/** Le début du jour local d'un instant. */
export function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Les N derniers jours de calendrier, aujourd'hui compris, jusqu'à maintenant. */
export function periodOf(days: number, now = Date.now()): Period {
  const d = new Date(startOfDay(now))
  d.setDate(d.getDate() - (days - 1))
  return { from: d.getTime(), to: now, days }
}

/** La même fenêtre, N jours plus tôt. */
export function previousOf(p: Period): Period {
  const shift = (ms: number) => {
    const d = new Date(ms)
    d.setDate(d.getDate() - p.days)
    return d.getTime()
  }
  return { from: shift(p.from), to: shift(p.to), days: p.days }
}
export const inPeriod = (iso: string | null | undefined, p: Period): boolean => {
  if (!iso) return false
  const t = Date.parse(iso)
  return t >= p.from && t < p.to
}

/** Le jour local d'un instant : « 2026-11-13 ». */
export function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Chaque jour de la période, le plus ancien d'abord (pour les barres). */
export function daysOf(p: Period): string[] {
  const out: string[] = []
  const d = new Date(p.from)
  for (let i = 0; i < p.days; i++) {
    out.push(dayKey(d.getTime()))
    d.setDate(d.getDate() + 1)
  }
  return out
}

/* ───────────────────────── Le périmètre (lieu, quart) ───────────────────────── */

export interface Scope {
  /** Les postes du lieu choisi ; null : partout. */
  stationIds: Set<string> | null
  shift: Shift | 'none' | 'all'
  /** Le quart de chaque personne de l'équipe (pour le filtre par quart). */
  shiftOf: Map<string, Shift | 'none'>
}

export const EVERYWHERE: Scope = { stationIds: null, shift: 'all', shiftOf: new Map() }

/** Dans le lieu et le quart choisis. Sans poste connu, un fait n'est d'aucun lieu ; sans personne, d'aucun quart. */
export function inScope(x: { stationId?: string | null; operatorId?: string | null }, s: Scope): boolean {
  if (s.stationIds && !(x.stationId && s.stationIds.has(x.stationId))) return false
  if (s.shift !== 'all') {
    if (!x.operatorId) return false
    if ((s.shiftOf.get(x.operatorId) ?? 'none') !== s.shift) return false
  }
  return true
}

/* ───────────────────────── Les faits ───────────────────────── */

export interface Completion {
  instructionId: string
  stationId: string | null
  operatorId: string | null
  operatorName: string | null
  version: number | null
  /** La durée qui compte dans les temps ; null : hors bornes ou inconnue. */
  sec: number | null
  at: string
}

/** Les instructions terminées dans la période et le périmètre. */
export function completionsOf(events: UsageEvent[], p: Period, s: Scope): Completion[] {
  const out: Completion[] = []
  for (const e of events) {
    if (e.type !== 'complete' || !e.instructionId || !inPeriod(e.at, p) || !inScope(e, s)) continue
    const sec = typeof e.durationSec === 'number' && e.durationSec >= MIN_SEC && e.durationSec <= MAX_SEC ? e.durationSec : null
    out.push({ instructionId: e.instructionId, stationId: e.stationId ?? null, operatorId: e.operatorId ?? null, operatorName: e.operatorName ?? null, version: e.version ?? null, sec, at: e.at })
  }
  return out
}

/** Les instructions ouvertes (consultées) dans la période et le périmètre. */
export const viewsOf = (events: UsageEvent[], p: Period, s: Scope): UsageEvent[] => events.filter((e) => e.type === 'view' && inPeriod(e.at, p) && inScope(e, s))

export const executionsOf = (docs: Execution[], p: Period, s: Scope): Execution[] => docs.filter((e) => inPeriod(e.finishedAt, p) && inScope(e, s))

export const feedbackOf = (docs: Feedback[], p: Period, s: Scope): Feedback[] => docs.filter((f) => inPeriod(f.createdAt, p) && (!s.stationIds || (!!f.stationId && s.stationIds.has(f.stationId))))

/* ───────────────────────── Les calculs ───────────────────────── */

export function quantile(values: number[], q: number): number | null {
  if (!values.length) return null
  const v = [...values].sort((a, b) => a - b)
  const pos = (v.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return v[lo] + (v[hi] - v[lo]) * (pos - lo)
}

export const median = (values: number[]) => quantile(values, 0.5)

export interface Durations {
  /** Le nombre de durées qui comptent. */
  n: number
  median: number | null
  p90: number | null
  /** Moins de 5 durées : à lire avec prudence. */
  low: boolean
}

export function durationsOf(items: Array<{ sec: number | null }>): Durations {
  const secs = items.map((c) => c.sec).filter((s): s is number => s !== null)
  return { n: secs.length, median: median(secs), p90: quantile(secs, 0.9), low: secs.length < MIN_SAMPLE }
}

/** Le taux d'écart : écarts ÷ relevés jugés (somme sur somme) ; null sans relevé jugé. */
export function deviationRate(executions: Execution[]): { judged: number; deviations: number; rate: number | null } {
  let judged = 0
  let deviations = 0
  for (const e of executions)
    for (const a of e.answers)
      if (a.ok !== null) {
        judged++
        if (a.ok === false) deviations++
      }
  return { judged, deviations, rate: judged ? deviations / judged : null }
}

/** Un ratio somme sur somme ; null sans dénominateur. */
export const ratio = (num: number, den: number): number | null => (den > 0 ? num / den : null)

export type Trend = 'up' | 'down' | 'flat'

/** Le changement d'une valeur depuis la période précédente ; null si l'une manque. */
export function changeOf(current: number | null, previous: number | null): { delta: number; pct: number | null; trend: Trend } | null {
  if (current === null || previous === null) return null
  const delta = current - previous
  const pct = previous !== 0 ? delta / Math.abs(previous) : null
  const trend: Trend = Math.abs(delta) < 1e-9 || (pct !== null && Math.abs(pct) < 0.02) ? 'flat' : delta > 0 ? 'up' : 'down'
  return { delta, pct, trend }
}

/** Regroupe par clé, dans l'ordre d'arrivée. */
export function groupBy<T>(items: T[], key: (x: T) => string | null): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const x of items) {
    const k = key(x)
    if (k === null) continue
    const list = out.get(k)
    if (list) list.push(x)
    else out.set(k, [x])
  }
  return out
}

/** Le nombre de faits par jour de la période. */
export function perDay(items: Array<{ at: string }>, p: Period): Array<{ date: string; value: number }> {
  const counts = new Map<string, number>()
  for (const x of items) counts.set(dayKey(Date.parse(x.at)), (counts.get(dayKey(Date.parse(x.at))) ?? 0) + 1)
  return daysOf(p).map((date) => ({ date, value: counts.get(date) ?? 0 }))
}
