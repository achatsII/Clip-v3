/**
 * Le module Relevés, au registre : chaque mesure relevée dans le temps, avec ses limites (une série
 * par instruction et par relevé), et l'export du travail fait en CSV pour la qualité et l'audit.
 * Fonctions pures, testées.
 */
import type { Doc } from '../gateway/data'
import { csvNumber, toCsv, type CsvSep } from '../util/csv'
import type { Execution, ExecutionAnswer, ItemState } from './types'

export interface TrendPoint {
  at: string
  /** La valeur : la mesure, ou la moyenne des lectures d'une mesure répétée. */
  value: number
  ok: boolean | null
  who: string | null
  /** Une mesure répétée : la plus basse et la plus haute lecture. */
  low?: number
  high?: number
}

export interface Trend {
  key: string
  instructionId: string
  instructionTitle: string
  label: string
  unit: string
  /** Les limites du relevé le plus récent. */
  min: number | null
  max: number | null
  points: TrendPoint[]
  deviations: number
}

const who = (e: Execution) => e.operatorName || e.userName || null

/** Les séries de mesures (mesure simple ou répétée), la plus ancienne valeur d'abord ; triées par instruction puis par relevé. */
export function trendsOf(docs: Array<Doc<Execution>>): Trend[] {
  const map = new Map<string, Trend>()
  const sorted = [...docs].sort((a, b) => a.json_data.finishedAt.localeCompare(b.json_data.finishedAt))
  for (const { json_data: e } of sorted) {
    for (const a of e.answers) {
      if ((a.kind !== 'measure' && a.kind !== 'measures') || typeof a.value !== 'number') continue
      const key = `${e.instructionId}:${a.checkId}`
      const t = map.get(key) ?? { key, instructionId: e.instructionId, instructionTitle: e.instructionTitle, label: a.label, unit: a.unit ?? '', min: null, max: null, points: [], deviations: 0 }
      t.label = a.label
      t.unit = a.unit ?? t.unit
      t.min = typeof a.min === 'number' ? a.min : null
      t.max = typeof a.max === 'number' ? a.max : null
      t.points.push({ at: e.finishedAt, value: a.value, ok: a.ok, who: who(e), ...(a.values?.length ? { low: Math.min(...a.values), high: Math.max(...a.values) } : {}) })
      if (a.ok === false) t.deviations++
      map.set(key, t)
    }
  }
  return [...map.values()].sort((a, b) => a.instructionTitle.localeCompare(b.instructionTitle) || a.label.localeCompare(b.label))
}

export interface CsvWords {
  head: string[]
  /** Le séparateur du tableur dans la langue de l'outil (`csvSeparator`). */
  sep: CsvSep
  /** Le texte d'une réponse qui n'est pas une mesure (oui ou non, choix, liste, photo…). */
  text: (a: ExecutionAnswer) => string
  /** Un point d'une liste et son état : « Garde en place : Conforme ». */
  item: (label: string, state: ItemState) => string
  verdict: (ok: boolean | null) => string
  date: (iso: string) => string
  station: (id: string | null | undefined) => string
}

const isMeasure = (a: ExecutionAnswer) => (a.kind === 'measure' || a.kind === 'measures') && typeof a.value === 'number'

/** Le détail d'une réponse : chaque lecture d'une mesure répétée, chaque point d'une liste, le lien des photos. */
function detail(a: ExecutionAnswer, w: CsvWords): string {
  if (a.values?.length) return a.values.map((n) => csvNumber(n, w.sep)).join(' | ')
  if (a.items?.length) return a.items.map((i) => w.item(i.label, i.state)).join(' | ')
  if (a.kind === 'photo') return (a.photos?.length ? a.photos : typeof a.value === 'string' ? [a.value] : []).join(' ')
  return ''
}

/**
 * Le travail fait, en CSV : une ligne par relevé, du plus récent au plus ancien. Une mesure s'écrit
 * en nombre (la moyenne d'une mesure répétée), son unité et ses limites à côté, pour calculer et
 * tracer dans le tableur.
 */
export function executionsCsv(docs: Array<Doc<Execution>>, w: CsvWords): string {
  const rows: unknown[][] = [w.head]
  for (const { json_data: e } of [...docs].sort((a, b) => b.json_data.finishedAt.localeCompare(a.json_data.finishedAt)))
    for (const a of e.answers)
      rows.push([w.date(e.finishedAt), e.instructionTitle, w.station(e.stationId), who(e) ?? '', a.stepTitle, a.label, isMeasure(a) ? a.value : w.text(a), a.unit ?? '', a.min ?? '', a.max ?? '', w.verdict(a.ok), detail(a, w), a.note ?? '', a.authorizedBy ?? ''])
  return toCsv(rows, w.sep)
}
