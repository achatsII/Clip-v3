/**
 * Le répertoire des rapports (toggle `reports`), inspiré de K2 Cadence : des modèles prêts, chacun
 * répond à une question d'une personne de l'usine, sur une période, un lieu et un quart. Chaque
 * rapport est une suite de blocs (chiffres clés, barres par jour, tableaux, « à regarder ») que le code
 * calcule (`facts.ts`) ; l'IA ne fait que les commenter (`narrative.ts`). Fonctions pures, testées.
 */
import { messages, num } from '../i18n'
import type { MemberRole } from '../model/types'
import type { Execution, Feedback, FeedbackKind, Qualification, Training, UsageEvent } from '../model/types'
import { formatDate, formatDuration } from '../util/cn'
import {
  changeOf,
  completionsOf,
  deviationRate,
  durationsOf,
  executionsOf,
  feedbackOf,
  groupBy,
  inPeriod,
  inScope,
  median,
  perDay,
  ratio,
  viewsOf,
  type Completion,
  type Period,
  type PeriodDays,
  type Scope,
} from './facts'

/* ───────────────────────── Les blocs ───────────────────────── */

export type Tone = 'good' | 'bad' | 'neutral'

export interface Kpi {
  id: string
  label: string
  value: string
  /** La valeur brute (pour l'IA et l'analyse automatique) ; null : pas de données. */
  raw: number | null
  previous: string | null
  delta: { text: string; tone: Tone } | null
  hint?: string
}

export interface Cell {
  text: string
  /** Pour trier et pour l'export (un nombre reste un nombre). */
  sort: number | string | null
  tone?: Tone
  /** Peu de données : la cellule le dit. */
  low?: boolean
}

export interface Column {
  key: string
  label: string
  numeric?: boolean
}

export interface Row {
  id: string
  href?: string
  cells: Record<string, Cell>
}

export type Block =
  | { kind: 'kpis'; id: string; items: Kpi[] }
  | { kind: 'bars'; id: string; title: string; days: Array<{ date: string; value: number }>; unit: string }
  | { kind: 'table'; id: string; title: string; hint?: string; columns: Column[]; rows: Row[]; link?: { href: string; label: string } }
  | { kind: 'list'; id: string; title: string; items: Array<{ text: string; tone: Tone; href?: string }>; empty: string }

/* ───────────────────────── Ce qu'un rapport lit ───────────────────────── */

export interface CardInfo {
  title: string
  number: string | null
  /** Le temps prévu, en minutes (la fiche de l'instruction). */
  durationMin: number | null
  version: number | null
  stationIds: string[]
  publishedAt: string | null
}

export interface TrainingFacts {
  /** Les instructions qui ont des questions, et la version à partir de laquelle il faut les avoir réussies. */
  catalog: Map<string, { trainingVersion: number }>
  trainings: Training[]
  /** Le journal de l'Académie ; null sans le module. */
  qualifications: Qualification[] | null
  /** Les qualifications à revalider ; null sans le module. */
  due: number | null
}

export interface LibraryFacts {
  published: number
  review: number
  draft: number
  renew: number
}

export interface ReportContext {
  period: Period
  previous: Period
  scope: Scope
  /** Les événements des deux périodes (ouvertures, instructions faites). */
  events: UsageEvent[]
  executions: Execution[]
  feedback: Feedback[]
  cards: Map<string, CardInfo>
  stations: Map<string, { name: string; area: string | null }>
  training?: TrainingFacts | null
  library?: LibraryFacts | null
}

export type ReportKey = 'semaine' | 'temps' | 'personnes' | 'postes' | 'ecarts' | 'revision' | 'formation' | 'retours' | 'bibliotheque'
export type Family = 'floor' | 'quality' | 'training' | 'library' | 'direction'
export type Need = 'events' | 'executions' | 'feedback' | 'training' | 'library'

export interface ReportDef {
  key: ReportKey
  family: Family
  defaultDays: PeriodDays
  needs: Need[]
  /** Ouvert à tous les plans (les autres viennent avec les statistiques d'adoption). */
  free?: boolean
  /** Montré d'abord (« Pour vous ») à ces rôles. */
  forRoles: MemberRole[]
  /** false : le quart ne change rien à ce rapport (retours, bibliothèque), le filtre ne se montre pas. */
  byShift?: false
  build: (c: ReportContext) => Block[]
}

/* ───────────────────────── La mise en forme ───────────────────────── */

const t = () => messages().reports

/** Une durée lisible : « 45 s », « 4 min 05 », « 2 h 10 » ; « — » sans valeur. */
export function timeText(sec: number | null): string {
  if (sec === null || !Number.isFinite(sec) || sec <= 0) return t().none
  const s = Math.round(sec)
  if (s >= 3600) return t().hours(Math.floor(s / 3600), Math.round((s % 3600) / 60))
  return formatDuration(s)
}

const pct = (r: number | null) => (r === null ? t().none : t().pct(r))
const opposite = (tone: Tone): Tone => (tone === 'good' ? 'bad' : tone === 'bad' ? 'good' : 'neutral')

/** Un chiffre clé qui se compte : sa valeur, celle d'avant, et le changement en %. `upIs` : ce que veut dire une hausse. */
function countKpi(id: string, label: string, cur: number, prev: number, upIs: Tone, hint?: string): Kpi {
  const c = changeOf(cur, prev)
  return { id, label, value: num(cur), raw: cur, previous: num(prev), delta: c && c.trend !== 'flat' && c.pct !== null ? { text: t().deltaPct(c.pct), tone: c.trend === 'up' ? upIs : opposite(upIs) } : null, hint }
}

/** Un chiffre clé en temps : une hausse est une mauvaise nouvelle. */
function timeKpi(id: string, label: string, cur: number | null, prev: number | null, hint?: string): Kpi {
  const c = changeOf(cur, prev)
  return { id, label, value: timeText(cur), raw: cur, previous: prev === null ? null : timeText(prev), delta: c && c.trend !== 'flat' ? { text: t().deltaTime(Math.sign(c.delta), timeText(Math.abs(c.delta))), tone: c.trend === 'up' ? 'bad' : 'good' } : null, hint }
}

/** Un chiffre clé en taux : l'écart se dit en points. */
function rateKpi(id: string, label: string, cur: number | null, prev: number | null, upIs: Tone, hint?: string): Kpi {
  const c = changeOf(cur, prev)
  return { id, label, value: pct(cur), raw: cur, previous: prev === null ? null : pct(prev), delta: c && Math.abs(c.delta) >= 0.005 ? { text: t().points(c.delta), tone: c.delta > 0 ? upIs : opposite(upIs) } : null, hint }
}

const textCell = (text: string): Cell => ({ text, sort: text.toLocaleLowerCase() })
const numCell = (n: number): Cell => ({ text: num(n), sort: n })
const timeCell = (sec: number | null, low = false): Cell => ({ text: timeText(sec), sort: sec, low })
const rateCell = (r: number | null, tone?: Tone): Cell => ({ text: pct(r), sort: r, tone })
const dateCell = (iso: string | null): Cell => ({ text: iso ? formatDate(iso) : t().none, sort: iso })
/** Une cellule en rouge quand elle signale un problème. */
const bad = (c: Cell, when: boolean): Cell => (when ? { ...c, tone: 'bad' } : c)

/** Le titre de chaque instruction : sa fiche publiée, sinon ce qu'en disent les traces. */
function titles(c: ReportContext): (id: string) => string {
  const m = new Map<string, string>()
  for (const e of c.executions) m.set(e.instructionId, e.instructionTitle)
  for (const f of c.feedback) if (f.instructionTitle) m.set(f.instructionId, f.instructionTitle)
  for (const [id, card] of c.cards) m.set(id, card.number ? `${card.number} · ${card.title}` : card.title)
  return (id) => m.get(id) ?? t().removed
}

const stationText = (c: ReportContext, id: string | null) => {
  if (!id) return t().list.postes.noStation
  const s = c.stations.get(id)
  return s ? (s.area ? `${s.name} · ${s.area}` : s.name) : t().none
}

/** Les écarts d'une liste de travaux, par instruction. */
function deviationsBy(executions: Execution[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const e of executions) m.set(e.instructionId, (m.get(e.instructionId) ?? 0) + e.deviations)
  return m
}

/* ───────────────────────── Les rapports ───────────────────────── */

function weekly(c: ReportContext): Block[] {
  const w = t().list.semaine
  const title = titles(c)
  const cur = completionsOf(c.events, c.period, c.scope)
  const prev = completionsOf(c.events, c.previous, c.scope)
  const people = (xs: Completion[]) => new Set(xs.map((x) => x.operatorId).filter(Boolean)).size
  const ex = executionsOf(c.executions, c.period, c.scope)
  const dev = deviationRate(ex)
  const devPrev = deviationRate(executionsOf(c.executions, c.previous, c.scope))
  const fb = feedbackOf(c.feedback, c.period, c.scope)
  const fbPrev = feedbackOf(c.feedback, c.previous, c.scope)
  const danger = fb.filter((f) => f.kind === 'danger').length
  const devBy = deviationsBy(ex)
  const byInstr = [...groupBy(cur, (x) => x.instructionId)].sort((a, b) => b[1].length - a[1].length)

  const watch: Array<{ text: string; tone: Tone; href?: string }> = []
  for (const [id, list] of byInstr) {
    const d = durationsOf(list)
    const planned = c.cards.get(id)?.durationMin
    if (!d.low && d.median !== null && planned && d.median > planned * 60 * 1.25) watch.push({ text: w.slower(title(id), timeText(d.median), timeText(planned * 60)), tone: 'bad', href: '/rapports/temps' })
  }
  const checks = new Map<string, { label: string; instructionId: string; judged: number; deviations: number }>()
  for (const e of ex)
    for (const a of e.answers) {
      if (a.ok === null) continue
      const k = `${e.instructionId}:${a.checkId}`
      const g = checks.get(k) ?? { label: a.label, instructionId: e.instructionId, judged: 0, deviations: 0 }
      g.judged++
      if (a.ok === false) g.deviations++
      checks.set(k, g)
    }
  for (const g of [...checks.values()].filter((g) => g.deviations > 0).sort((a, b) => b.deviations - a.deviations).slice(0, 3)) watch.push({ text: w.deviation(g.label, title(g.instructionId), g.deviations, g.judged), tone: 'bad', href: `/registre?ecarts=1&q=${encodeURIComponent(title(g.instructionId))}` })
  for (const f of fb.filter((f) => f.kind === 'danger' && f.status === 'new').slice(0, 3)) watch.push({ text: w.danger(title(f.instructionId)), tone: 'bad', href: '/retours' })
  if (c.training?.due) watch.push({ text: w.due(c.training.due), tone: 'neutral', href: '/equipe?vue=competences' })
  const unnamed = cur.filter((x) => !x.operatorId).length
  if (cur.length >= 5 && unnamed / cur.length >= 0.5) watch.push({ text: w.unnamed(pct(unnamed / cur.length)), tone: 'neutral', href: '/equipe' })

  return [
    {
      kind: 'kpis',
      id: 'k',
      items: [
        countKpi('done', w.kpiDone, cur.length, prev.length, 'good'),
        countKpi('people', w.kpiPeople, people(cur), people(prev), 'good'),
        { ...countKpi('deviations', w.kpiDeviations, dev.deviations, devPrev.deviations, 'bad'), hint: dev.rate === null ? undefined : w.kpiDeviationsHint(pct(dev.rate)) },
        countKpi('feedback', w.kpiFeedback, fb.length, fbPrev.length, 'neutral', w.kpiFeedbackHint(danger)),
      ],
    },
    { kind: 'bars', id: 'days', title: w.bars, days: perDay(cur, c.period), unit: w.barsUnit },
    {
      kind: 'table',
      id: 'top',
      title: w.top,
      columns: [
        { key: 'instruction', label: t().col.instruction },
        { key: 'done', label: t().col.done, numeric: true },
        { key: 'typical', label: t().col.typical, numeric: true },
        { key: 'deviations', label: t().col.deviations, numeric: true },
      ],
      rows: byInstr.slice(0, 5).map(([id, list]) => {
        const d = durationsOf(list)
        return { id, href: `/instructions/${id}`, cells: { instruction: textCell(title(id)), done: numCell(list.length), typical: timeCell(d.median, d.low), deviations: bad(numCell(devBy.get(id) ?? 0), !!(devBy.get(id))) } }
      }),
    },
    { kind: 'list', id: 'watch', title: w.watch, items: watch.slice(0, 6), empty: w.watchEmpty },
  ]
}

function timePerInstruction(c: ReportContext): Block[] {
  const w = t().list.temps
  const title = titles(c)
  const cur = completionsOf(c.events, c.period, c.scope)
  const prev = completionsOf(c.events, c.previous, c.scope)
  const prevBy = groupBy(prev, (x) => x.instructionId)
  const all = durationsOf(cur)
  const allPrev = durationsOf(prev)
  let slower = 0
  const rows: Row[] = [...groupBy(cur, (x) => x.instructionId)]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([id, list]) => {
      const d = durationsOf(list)
      const dp = durationsOf(prevBy.get(id) ?? [])
      const planned = c.cards.get(id)?.durationMin ? c.cards.get(id)!.durationMin! * 60 : null
      const vs = planned && d.median !== null ? (d.median - planned) / planned : null
      if (vs !== null && vs > 0.25 && !d.low) slower++
      const change = d.median !== null && dp.median !== null && !d.low && !dp.low ? d.median - dp.median : null
      return {
        id,
        href: `/instructions/${id}`,
        cells: {
          instruction: textCell(title(id)),
          done: numCell(list.length),
          typical: timeCell(d.median, d.low),
          p90: timeCell(d.p90, d.low),
          planned: timeCell(planned),
          vsPlanned: { text: vs === null ? t().none : t().deltaPct(vs), sort: vs, tone: vs === null ? undefined : vs > 0.25 ? 'bad' : vs < -0.25 ? 'good' : 'neutral' },
          change: { text: change === null || Math.abs(change) < 1 ? t().none : t().deltaTime(Math.sign(change), timeText(Math.abs(change))), sort: change, tone: change === null || Math.abs(change) < 1 ? undefined : change > 0 ? 'bad' : 'good' },
        },
      }
    })
  return [
    {
      kind: 'kpis',
      id: 'k',
      items: [countKpi('timed', w.kpiTimed, all.n, allPrev.n, 'good'), timeKpi('typical', w.kpiTypical, all.median, allPrev.median, w.kpiTypicalHint), { ...countKpi('slower', w.kpiSlower, slower, slower, 'bad', w.kpiSlowerHint), previous: null, delta: null }],
    },
    {
      kind: 'table',
      id: 'instructions',
      title: w.table,
      hint: w.tableHint,
      columns: [
        { key: 'instruction', label: t().col.instruction },
        { key: 'done', label: t().col.done, numeric: true },
        { key: 'typical', label: t().col.typical, numeric: true },
        { key: 'p90', label: t().col.p90, numeric: true },
        { key: 'planned', label: t().col.planned, numeric: true },
        { key: 'vsPlanned', label: t().col.vsPlanned, numeric: true },
        { key: 'change', label: t().col.change, numeric: true },
      ],
      rows,
    },
  ]
}

function whoDidWhat(c: ReportContext): Block[] {
  const w = t().list.personnes
  const cur = completionsOf(c.events, c.period, c.scope)
  const prev = completionsOf(c.events, c.previous, c.scope)
  const people = (xs: Completion[]) => new Set(xs.map((x) => x.operatorId).filter(Boolean)).size
  const ex = executionsOf(c.executions, c.period, c.scope)
  const devByPerson = new Map<string, number>()
  for (const e of ex) if (e.operatorId) devByPerson.set(e.operatorId, (devByPerson.get(e.operatorId) ?? 0) + e.deviations)
  const unnamed = cur.filter((x) => !x.operatorId).length
  const unnamedPrev = prev.filter((x) => !x.operatorId).length
  const rows: Row[] = [...groupBy(cur, (x) => x.operatorId ?? '')]
    .map(([id, list]) => {
      const name = id ? (list.find((x) => x.operatorName)?.operatorName ?? t().none) : w.unnamedRow
      const total = list.reduce((s, x) => s + (x.sec ?? 0), 0)
      const last = list.reduce((m, x) => (x.at > m ? x.at : m), list[0].at)
      return {
        id: id || 'unnamed',
        href: id ? `/registre?q=${encodeURIComponent(name)}` : undefined,
        cells: { person: textCell(name), done: numCell(list.length), distinct: numCell(new Set(list.map((x) => x.instructionId)).size), total: timeCell(total || null), deviations: bad(numCell(devByPerson.get(id) ?? 0), !!(devByPerson.get(id))), last: dateCell(last) },
      }
    })
    // Par ordre alphabétique (un registre, pas un palmarès) ; « personne de nommé » à la fin.
    .sort((a, b) => (a.id === 'unnamed' ? 1 : b.id === 'unnamed' ? -1 : String(a.cells.person.sort).localeCompare(String(b.cells.person.sort))))
  return [
    {
      kind: 'kpis',
      id: 'k',
      items: [countKpi('people', w.kpiPeople, people(cur), people(prev), 'good'), countKpi('done', w.kpiDone, cur.length, prev.length, 'good'), rateKpi('unnamed', w.kpiUnnamed, ratio(unnamed, cur.length), ratio(unnamedPrev, prev.length), 'bad', w.kpiUnnamedHint)],
    },
    {
      kind: 'table',
      id: 'people',
      title: w.table,
      hint: w.tableHint,
      columns: [
        { key: 'person', label: t().col.person },
        { key: 'done', label: t().col.done, numeric: true },
        { key: 'distinct', label: t().col.distinct, numeric: true },
        { key: 'total', label: t().col.total, numeric: true },
        { key: 'deviations', label: t().col.deviations, numeric: true },
        { key: 'last', label: t().col.last },
      ],
      rows,
    },
  ]
}

function byStation(c: ReportContext): Block[] {
  const w = t().list.postes
  const cur = completionsOf(c.events, c.period, c.scope)
  const prev = completionsOf(c.events, c.previous, c.scope)
  const ex = executionsOf(c.executions, c.period, c.scope)
  const fb = feedbackOf(c.feedback, c.period, c.scope)
  const fbPrev = feedbackOf(c.feedback, c.previous, c.scope)
  const exBy = groupBy(ex, (e) => e.stationId ?? '')
  const fbBy = groupBy(fb, (f) => f.stationId ?? '')
  const active = (xs: Completion[]) => new Set(xs.map((x) => x.stationId).filter(Boolean)).size
  const total = c.scope.stationIds ? c.scope.stationIds.size : c.stations.size
  const rows: Row[] = [...groupBy(cur, (x) => x.stationId ?? '')]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([id, list]) => {
      const d = durationsOf(list)
      const dev = deviationRate(exBy.get(id) ?? [])
      return {
        id: id || 'none',
        cells: {
          station: textCell(stationText(c, id || null)),
          done: numCell(list.length),
          people: numCell(new Set(list.map((x) => x.operatorId).filter(Boolean)).size),
          typical: timeCell(d.median, d.low),
          rate: rateCell(dev.rate, dev.rate !== null && dev.rate > 0.1 ? 'bad' : undefined),
          feedback: numCell(fbBy.get(id)?.length ?? 0),
        },
      }
    })
  return [
    {
      kind: 'kpis',
      id: 'k',
      items: [{ ...countKpi('active', w.kpiActive, active(cur), active(prev), 'good'), hint: w.kpiActiveHint(total) }, countKpi('done', w.kpiDone, cur.length, prev.length, 'good'), countKpi('feedback', w.kpiFeedback, fb.length, fbPrev.length, 'neutral')],
    },
    {
      kind: 'table',
      id: 'stations',
      title: w.table,
      columns: [
        { key: 'station', label: t().col.station },
        { key: 'done', label: t().col.done, numeric: true },
        { key: 'people', label: t().col.people, numeric: true },
        { key: 'typical', label: t().col.typical, numeric: true },
        { key: 'rate', label: t().col.rate, numeric: true },
        { key: 'feedback', label: t().col.feedback, numeric: true },
      ],
      rows,
    },
  ]
}

function deviations(c: ReportContext): Block[] {
  const w = t().list.ecarts
  const title = titles(c)
  const ex = executionsOf(c.executions, c.period, c.scope)
  const exPrev = executionsOf(c.executions, c.previous, c.scope)
  const dev = deviationRate(ex)
  const devPrev = deviationRate(exPrev)
  const authorized = (xs: Execution[]) => xs.reduce((n, e) => n + e.answers.filter((a) => a.ok === false && !!a.authorizedBy).length, 0)
  const checks = new Map<string, { label: string; instructionId: string; judged: number; deviations: number; last: string | null }>()
  for (const e of ex)
    for (const a of e.answers) {
      if (a.ok === null) continue
      const k = `${e.instructionId}:${a.checkId}`
      const g = checks.get(k) ?? { label: a.label, instructionId: e.instructionId, judged: 0, deviations: 0, last: null }
      g.judged++
      if (a.ok === false) {
        g.deviations++
        if (!g.last || e.finishedAt > g.last) g.last = e.finishedAt
      }
      checks.set(k, g)
    }
  return [
    {
      kind: 'kpis',
      id: 'k',
      items: [countKpi('work', w.kpiWork, ex.length, exPrev.length, 'good'), rateKpi('rate', w.kpiRate, dev.rate, devPrev.rate, 'bad', w.kpiRateHint), countKpi('authorized', w.kpiAuthorized, authorized(ex), authorized(exPrev), 'neutral')],
    },
    {
      kind: 'table',
      id: 'checks',
      title: w.checks,
      columns: [
        { key: 'check', label: t().col.check },
        { key: 'instruction', label: t().col.instruction },
        { key: 'readings', label: t().col.readings, numeric: true },
        { key: 'deviations', label: t().col.deviations, numeric: true },
        { key: 'rate', label: t().col.rate, numeric: true },
        { key: 'last', label: t().col.lastDeviation },
      ],
      rows: [...checks.entries()]
        .filter(([, g]) => g.deviations > 0)
        .sort((a, b) => b[1].deviations - a[1].deviations)
        .slice(0, 30)
        .map(([k, g]) => ({ id: k, href: `/registre?ecarts=1&q=${encodeURIComponent(title(g.instructionId))}`, cells: { check: textCell(g.label), instruction: textCell(title(g.instructionId)), readings: numCell(g.judged), deviations: bad(numCell(g.deviations), true), rate: rateCell(g.deviations / g.judged), last: dateCell(g.last) } })),
      link: { href: '/registre?ecarts=1', label: t().seeRegister },
    },
    {
      kind: 'table',
      id: 'stations',
      title: w.stations,
      columns: [
        { key: 'station', label: t().col.station },
        { key: 'readings', label: t().col.readings, numeric: true },
        { key: 'deviations', label: t().col.deviations, numeric: true },
        { key: 'rate', label: t().col.rate, numeric: true },
      ],
      rows: [...groupBy(ex, (e) => e.stationId ?? '')]
        .map(([id, list]) => {
          const d = deviationRate(list)
          return { id: id || 'none', cells: { station: textCell(stationText(c, id || null)), readings: numCell(d.judged), deviations: bad(numCell(d.deviations), !!(d.deviations)), rate: rateCell(d.rate) } } as Row
        })
        .sort((a, b) => Number(b.cells.deviations.sort) - Number(a.cells.deviations.sort)),
    },
  ]
}

/** Une version, vue sur la période : son temps habituel, son taux d'écart, ses retours pour 100 réalisations. */
export interface VersionSide {
  median: number | null
  low: boolean
  rate: number | null
  fb: number
}

/** Ce que chaque mesure est devenue d'une version à l'autre (seuils : 10 % du temps, 2 points d'écart, 5 retours pour 100). */
export function movesOf(a: VersionSide, b: VersionSide): { time: Tone; dev: Tone; fb: Tone } {
  const move = (better: boolean, worse: boolean): Tone => (worse ? 'bad' : better ? 'good' : 'neutral')
  return {
    time: a.median === null || b.median === null ? 'neutral' : move(b.median <= a.median * 0.9, b.median >= a.median * 1.1),
    dev: a.rate === null || b.rate === null ? 'neutral' : move(b.rate < a.rate - 0.02, b.rate > a.rate + 0.02),
    fb: move(b.fb < a.fb - 5, b.fb > a.fb + 5),
  }
}

/**
 * Le bilan d'une révision : une seule mesure qui se dégrade la met « à surveiller » (plus rapide mais
 * plus d'écarts ou plus de questions, ce n'est pas mieux) ; sinon, une qui s'améliore la dit « mieux ».
 * Sans assez de données, on ne dit rien.
 */
export function verdictOf(a: VersionSide, b: VersionSide): 'better' | 'same' | 'worse' | 'low' {
  if (a.low || b.low || a.median === null || b.median === null) return 'low'
  const moves = Object.values(movesOf(a, b))
  return moves.includes('bad') ? 'worse' : moves.includes('good') ? 'better' : 'same'
}

function revisions(c: ReportContext): Block[] {
  const w = t().list.revision
  const title = titles(c)
  const cur = completionsOf(c.events, c.period, c.scope)
  const ex = executionsOf(c.executions, c.period, c.scope)
  const fb = feedbackOf(c.feedback, c.period, c.scope).filter((f) => f.kind === 'unclear' || f.kind === 'error')
  const counts = { compared: 0, better: 0, worse: 0 }
  const rows: Row[] = []
  for (const [id, list] of groupBy(cur, (x) => x.instructionId)) {
    const versions = [...new Set(list.map((x) => x.version).filter((v): v is number => v !== null))].sort((a, b) => b - a)
    if (versions.length < 2) continue
    const [after, before] = versions
    const side = (v: number) => {
      const done = list.filter((x) => x.version === v)
      const d = durationsOf(done)
      const rate = deviationRate(ex.filter((e) => e.instructionId === id && e.version === v)).rate
      const per100 = done.length ? (fb.filter((f) => f.instructionId === id && f.version === v).length / done.length) * 100 : 0
      return { median: d.median, low: d.low, rate, fb: per100 }
    }
    const a = side(before)
    const b = side(after)
    const verdict = verdictOf(a, b)
    // La couleur de chaque mesure, seulement quand l'échantillon permet de juger.
    const moves = verdict === 'low' ? null : movesOf(a, b)
    const toned = (tone: Tone | undefined) => (tone && tone !== 'neutral' ? tone : undefined)
    counts.compared++
    if (verdict === 'better') counts.better++
    if (verdict === 'worse') counts.worse++
    const arrow = (x: string, y: string) => `${x} → ${y}`
    rows.push({
      id,
      href: `/instructions/${id}`,
      cells: {
        instruction: textCell(title(id)),
        versions: { text: arrow(`v${before}`, `v${after}`), sort: after },
        time: { text: arrow(timeText(a.median), timeText(b.median)), sort: a.median !== null && b.median !== null ? b.median - a.median : null, tone: toned(moves?.time), low: a.low || b.low },
        dev: { text: arrow(pct(a.rate), pct(b.rate)), sort: a.rate !== null && b.rate !== null ? b.rate - a.rate : null, tone: toned(moves?.dev) },
        fb: { text: arrow(num(Math.round(a.fb)), num(Math.round(b.fb))), sort: b.fb - a.fb, tone: toned(moves?.fb) },
        verdict: { text: t().verdicts[verdict], sort: verdict, tone: verdict === 'better' ? 'good' : verdict === 'worse' ? 'bad' : 'neutral' },
      },
    })
  }
  return [
    {
      kind: 'kpis',
      id: 'k',
      items: [
        { id: 'compared', label: w.kpiRevised, value: num(counts.compared), raw: counts.compared, previous: null, delta: null },
        { id: 'better', label: w.kpiBetter, value: num(counts.better), raw: counts.better, previous: null, delta: null },
        { id: 'worse', label: w.kpiWorse, value: num(counts.worse), raw: counts.worse, previous: null, delta: null },
      ],
    },
    {
      kind: 'table',
      id: 'revisions',
      title: w.table,
      hint: w.tableHint,
      columns: [
        { key: 'instruction', label: t().col.instruction },
        { key: 'versions', label: t().col.versions },
        { key: 'time', label: t().col.timeBeforeAfter },
        { key: 'dev', label: t().col.devBeforeAfter },
        { key: 'fb', label: t().col.fbBeforeAfter },
        { key: 'verdict', label: t().col.verdict },
      ],
      rows: rows.sort((x, y) => String(x.cells.instruction.sort).localeCompare(String(y.cells.instruction.sort))),
    },
  ]
}

/** La personne était-elle formée (questions réussies sur la version à jour, avant le travail) ? */
function trainedAt(f: TrainingFacts, operatorId: string, instructionId: string, at: string): boolean {
  const need = f.catalog.get(instructionId)?.trainingVersion ?? 0
  return f.trainings.some((x) => x.passed && x.operatorId === operatorId && x.instructionId === instructionId && (x.version ?? 0) >= need && x.at <= at)
}

/** La personne était-elle qualifiée à ce poste au moment du travail (la plus récente signature d'avant) ? */
function qualifiedAt(quals: Qualification[], operatorId: string, stationId: string, at: string): boolean {
  let last: Qualification | null = null
  for (const q of quals) if (q.operatorId === operatorId && q.stationId === stationId && q.at <= at && (!last || q.at > last.at)) last = q
  return !!last && last.level !== 'none' && (!last.validUntil || last.validUntil > at)
}

function training(c: ReportContext): Block[] {
  const w = t().list.formation
  const title = titles(c)
  const f = c.training
  const cur = completionsOf(c.events, c.period, c.scope)
  if (!f) return []
  const relevant = (xs: Completion[]) => xs.filter((x) => x.operatorId && f.catalog.has(x.instructionId))
  const trainedShare = (xs: Completion[]) => {
    const r = relevant(xs)
    return ratio(r.filter((x) => trainedAt(f, x.operatorId!, x.instructionId, x.at)).length, r.length)
  }
  const prev = completionsOf(c.events, c.previous, c.scope)
  const quals = f.qualifications
  const qualifiedShare = (xs: Completion[]) => {
    if (!quals) return null
    const r = xs.filter((x) => x.operatorId && x.stationId)
    return ratio(r.filter((x) => qualifiedAt(quals, x.operatorId!, x.stationId!, x.at)).length, r.length)
  }
  const passed = (p: Period) => f.trainings.filter((x) => x.passed && inPeriod(x.at, p) && inScope(x, c.scope)).length
  const untrained = new Map<string, { person: string; instructionId: string; times: number }>()
  for (const x of relevant(cur))
    if (!trainedAt(f, x.operatorId!, x.instructionId, x.at)) {
      const k = `${x.operatorId}:${x.instructionId}`
      const g = untrained.get(k) ?? { person: x.operatorName ?? t().none, instructionId: x.instructionId, times: 0 }
      g.times++
      untrained.set(k, g)
    }
  const kpis: Kpi[] = [rateKpi('trained', w.kpiTrained, trainedShare(cur), trainedShare(prev), 'good', w.kpiTrainedHint)]
  if (quals) kpis.push(rateKpi('qualified', w.kpiQualified, qualifiedShare(cur), qualifiedShare(prev), 'good', w.kpiQualifiedHint))
  kpis.push(countKpi('passed', w.kpiPassed, passed(c.period), passed(c.previous), 'good'))
  if (f.due !== null) kpis.push({ id: 'due', label: w.kpiDue, value: num(f.due), raw: f.due, previous: null, delta: null })
  const columns: Column[] = [
    { key: 'station', label: t().col.station },
    { key: 'named', label: t().col.named, numeric: true },
    { key: 'trained', label: t().col.trained, numeric: true },
    ...(quals ? [{ key: 'qualified', label: t().col.qualified, numeric: true }] : []),
  ]
  return [
    { kind: 'kpis', id: 'k', items: kpis },
    {
      kind: 'table',
      id: 'stations',
      title: w.stations,
      columns,
      rows: [...groupBy(cur.filter((x) => x.operatorId), (x) => x.stationId ?? '')]
        .sort((a, b) => b[1].length - a[1].length)
        .map(([id, list]) => {
          const tr = trainedShare(list)
          const q = qualifiedShare(list)
          return { id: id || 'none', cells: { station: textCell(stationText(c, id || null)), named: numCell(list.length), trained: rateCell(tr, tr !== null && tr < 0.8 ? 'bad' : undefined), ...(quals ? { qualified: rateCell(q, q !== null && q < 0.8 ? 'bad' : undefined) } : {}) } }
        }),
    },
    {
      kind: 'table',
      id: 'untrained',
      title: w.untrained,
      columns: [
        { key: 'person', label: t().col.person },
        { key: 'instruction', label: t().col.instruction },
        { key: 'times', label: t().col.times, numeric: true },
      ],
      rows: [...untrained.entries()]
        .sort((a, b) => b[1].times - a[1].times)
        .slice(0, 30)
        .map(([k, g]) => ({ id: k, href: `/equipe?vue=competences&q=${encodeURIComponent(g.person)}`, cells: { person: textCell(g.person), instruction: textCell(title(g.instructionId)), times: bad(numCell(g.times), true) } })),
    },
  ]
}

const KINDS: FeedbackKind[] = ['danger', 'error', 'unclear', 'idea', 'praise']

function operatorFeedback(c: ReportContext): Block[] {
  const w = t().list.retours
  const title = titles(c)
  const fb = feedbackOf(c.feedback, c.period, c.scope)
  const fbPrev = feedbackOf(c.feedback, c.previous, c.scope)
  const responses = (xs: Feedback[]) => xs.filter((f) => f.resolvedAt).map((f) => Date.parse(f.resolvedAt!) - Date.parse(f.createdAt))
  const dayText = (ms: number | null) => (ms === null ? t().none : ms < 86_400_000 ? w.lessThanDay : w.days(Math.round(ms / 86_400_000)))
  const kindName = messages().catalog.feedbackKinds
  const r = median(responses(fb))
  const rPrev = median(responses(fbPrev))
  const respChange = changeOf(r, rPrev)
  return [
    {
      kind: 'kpis',
      id: 'k',
      items: [
        countKpi('received', w.kpiReceived, fb.length, fbPrev.length, 'neutral'),
        { id: 'open', label: w.kpiOpen, value: num(fb.filter((f) => f.status === 'new').length), raw: fb.filter((f) => f.status === 'new').length, previous: null, delta: null },
        { id: 'response', label: w.kpiResponse, value: dayText(r), raw: r, previous: rPrev === null ? null : dayText(rPrev), delta: respChange && respChange.trend !== 'flat' && Math.abs(respChange.delta) >= 86_400_000 / 2 ? { text: dayText(Math.abs(respChange.delta)), tone: respChange.trend === 'up' ? 'bad' : 'good' } : null },
        countKpi('danger', w.kpiDanger, fb.filter((f) => f.kind === 'danger').length, fbPrev.filter((f) => f.kind === 'danger').length, 'bad'),
      ],
    },
    {
      kind: 'table',
      id: 'kinds',
      title: w.kinds,
      columns: [
        { key: 'kind', label: t().col.kind },
        { key: 'received', label: t().col.received, numeric: true },
        { key: 'handled', label: t().col.handled, numeric: true },
        { key: 'response', label: t().col.responseTime, numeric: true },
      ],
      rows: KINDS.map((k) => ({ k, list: fb.filter((f) => f.kind === k) }))
        .filter((x) => x.list.length)
        .map(({ k, list }) => ({ id: k, cells: { kind: textCell(kindName[k].label), received: numCell(list.length), handled: numCell(list.filter((f) => f.status !== 'new').length), response: { text: dayText(median(responses(list))), sort: median(responses(list)) } } })),
    },
    {
      kind: 'table',
      id: 'instructions',
      title: w.instructions,
      columns: [
        { key: 'instruction', label: t().col.instruction },
        { key: 'feedback', label: t().col.feedback, numeric: true },
        { key: 'unclear', label: t().col.unclear, numeric: true },
        { key: 'errors', label: t().col.errors, numeric: true },
        { key: 'danger', label: t().col.danger, numeric: true },
        { key: 'open', label: t().col.open, numeric: true },
      ],
      rows: [...groupBy(fb, (f) => f.instructionId)]
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 30)
        .map(([id, list]) => {
          const n = (k: FeedbackKind) => list.filter((f) => f.kind === k).length
          return { id, href: `/instructions/${id}`, cells: { instruction: textCell(title(id)), feedback: numCell(list.length), unclear: numCell(n('unclear')), errors: numCell(n('error')), danger: bad(numCell(n('danger')), !!(n('danger'))), open: numCell(list.filter((f) => f.status === 'new').length) } }
        }),
    },
  ]
}

function library(c: ReportContext): Block[] {
  const w = t().list.bibliotheque
  const title = titles(c)
  const lib = c.library
  const done = new Set(completionsOf(c.events, c.period, c.scope).map((x) => x.instructionId))
  const seen = new Set(viewsOf(c.events, c.period, c.scope).map((e) => e.instructionId))
  const unused = [...c.cards.entries()]
    .filter(([id, card]) => !done.has(id) && !seen.has(id) && (!c.scope.stationIds || card.stationIds.some((s) => c.scope.stationIds!.has(s))))
    .sort((a, b) => String(a[1].publishedAt ?? '').localeCompare(String(b[1].publishedAt ?? '')))
    .slice(0, 50)
  const kpi = (id: string, label: string, n: number | undefined): Kpi => ({ id, label, value: n === undefined ? t().none : num(n), raw: n ?? null, previous: null, delta: null })
  return [
    { kind: 'kpis', id: 'k', items: [kpi('published', w.kpiPublished, lib?.published), kpi('review', w.kpiReview, lib?.review), kpi('draft', w.kpiDraft, lib?.draft), kpi('renew', w.kpiRenew, lib?.renew)] },
    {
      kind: 'table',
      id: 'unused',
      title: w.unused,
      hint: w.unusedHint,
      columns: [
        { key: 'instruction', label: t().col.instruction },
        { key: 'station', label: t().col.station },
        { key: 'published', label: t().col.published },
      ],
      rows: unused.map(([id, card]) => ({ id, href: `/instructions/${id}`, cells: { instruction: textCell(title(id)), station: textCell(card.stationIds.map((s) => c.stations.get(s)?.name).filter(Boolean).join(', ') || t().none), published: dateCell(card.publishedAt) } })),
    },
  ]
}

/** Le répertoire : l'ordre est celui de la page. */
export const REPORTS: readonly ReportDef[] = [
  { key: 'semaine', family: 'floor', defaultDays: 7, needs: ['events', 'executions', 'feedback', 'training'], free: true, forRoles: ['admin', 'approver'], build: weekly },
  { key: 'temps', family: 'floor', defaultDays: 30, needs: ['events'], forRoles: ['author', 'admin'], build: timePerInstruction },
  { key: 'personnes', family: 'floor', defaultDays: 30, needs: ['events', 'executions'], forRoles: ['admin', 'approver'], build: whoDidWhat },
  { key: 'postes', family: 'floor', defaultDays: 30, needs: ['events', 'executions', 'feedback'], forRoles: ['admin'], build: byStation },
  { key: 'ecarts', family: 'quality', defaultDays: 30, needs: ['executions'], forRoles: ['approver'], build: deviations },
  { key: 'revision', family: 'quality', defaultDays: 90, needs: ['events', 'executions', 'feedback'], forRoles: ['author', 'approver'], build: revisions },
  { key: 'formation', family: 'training', defaultDays: 30, needs: ['events', 'training'], forRoles: ['admin', 'approver'], build: training },
  { key: 'retours', family: 'library', defaultDays: 30, needs: ['feedback'], forRoles: ['author'], byShift: false, build: operatorFeedback },
  { key: 'bibliotheque', family: 'library', defaultDays: 30, needs: ['events', 'library'], forRoles: ['author', 'admin'], byShift: false, build: library },
]

export const reportOf = (key: string | null | undefined): ReportDef | null => REPORTS.find((r) => r.key === key) ?? null
