/**
 * Les chiffres d'adoption d'une période (consultations, réalisations, IA) et la valeur estimée
 * selon les hypothèses de l'usine. Fonctions pures : la page Statistiques et le dossier pour la
 * direction disent les mêmes chiffres.
 */
import type { Doc } from '../gateway/data'
import type { Feedback, Instruction, Station, UsageEvent } from '../model/types'

export interface Roi {
  hoursSavedPerInstruction: number
  hourlyRate: number
  minutesSavedPerCompletion: number
}

export interface AdoptionStats {
  days: { date: string; value: number }[]
  views: number
  completions: number
  completionRate: number
  generations: number
  imports: number
  perInstruction: Map<string, number>
  bySource: { kiosk: number; link: number; app: number }
  /** En secondes ; 0 sans réalisation chronométrée. */
  medianDuration: number
}

const DAY = 86400_000

export function adoptionStats(events: UsageEvent[], days: number, now = Date.now()): AdoptionStats {
  const byDay = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) byDay.set(new Date(now - i * DAY).toISOString().slice(0, 10), 0)
  const views = events.filter((e) => e.type === 'view')
  const completions = events.filter((e) => e.type === 'complete')
  const generations = events.filter((e) => e.type === 'ai' && e.operation?.startsWith('generate'))
  const imports = events.filter((e) => e.type === 'ai' && e.operation?.startsWith('import'))
  for (const v of views) {
    const k = v.at.slice(0, 10)
    if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + 1)
  }
  const perInstruction = new Map<string, number>()
  for (const v of views) if (v.instructionId) perInstruction.set(v.instructionId, (perInstruction.get(v.instructionId) ?? 0) + 1)
  const bySource = { kiosk: 0, link: 0, app: 0 }
  for (const v of views) bySource[v.source] = (bySource[v.source] ?? 0) + 1
  const durations = completions
    .map((c) => c.durationSec ?? 0)
    .filter((d) => d > 0)
    .sort((a, b) => a - b)
  return {
    days: [...byDay.entries()].map(([date, value]) => ({ date, value })),
    views: views.length,
    completions: completions.length,
    completionRate: views.length ? Math.round((completions.length / views.length) * 100) : 0,
    generations: generations.length,
    imports: imports.length,
    perInstruction,
    bySource,
    medianDuration: durations.length ? durations[Math.floor(durations.length / 2)] : 0,
  }
}

/** Le temps gagné à rédiger chaque instruction créée et à chaque réalisation guidée, et sa valeur. */
export function valueOf(created: number, completions: number, roi: Roi): { hours: number; value: number } {
  const hours = created * roi.hoursSavedPerInstruction + (completions * roi.minutesSavedPerCompletion) / 60
  return { hours, value: Math.round(hours * roi.hourlyRate) }
}

export interface PeriodFacts {
  /** Instructions créées dans la période, avec au moins une étape. */
  created: number
  published: number
  top: { id: string; title: string; views: number }[]
  /** Publiées depuis plus d'une semaine et jamais consultées dans la période. */
  unseen: number
  /** Retours de la période (`total`, `done`) ; `open` : tous ceux qui attendent, d'hier ou d'avant. */
  feedback: { total: number; done: number; open: number }
  /** Les postes, et ceux qui ont au moins une instruction publiée. */
  stations: { total: number; covered: number }
}

/** Ce qui s'est passé dans la période, tiré des instructions, des postes et des retours. */
export function periodFacts(
  input: { instructions: Doc<Instruction>[]; stations?: Doc<Station>[]; feedback: Doc<Feedback>[]; perInstruction: Map<string, number>; since: string; now?: number },
  topN = 8,
): PeriodFacts {
  const now = input.now ?? Date.now()
  const published = input.instructions.filter((d) => d.json_data.publishedVersion)
  const top = published
    .map((d) => ({ id: d._id, title: d.json_data.title, views: input.perInstruction.get(d._id) ?? 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, topN)
  const unseen = published.filter((d) => !input.perInstruction.get(d._id) && now - Date.parse(d.json_data.publishedAt ?? d.json_data.updatedAt) > 7 * DAY).length
  const recent = input.feedback.filter((f) => f.json_data.createdAt >= input.since)
  const covered = new Set(published.flatMap((d) => d.json_data.stationIds))
  return {
    created: input.instructions.filter((d) => d.json_data.createdAt >= input.since && (d.json_data.stepCount ?? 0) > 0).length,
    published: published.length,
    top,
    unseen,
    feedback: { total: recent.length, done: recent.filter((f) => f.json_data.status !== 'new').length, open: input.feedback.filter((f) => f.json_data.status === 'new').length },
    stations: { total: input.stations?.length ?? 0, covered: (input.stations ?? []).filter((s) => covered.has(s._id)).length },
  }
}
