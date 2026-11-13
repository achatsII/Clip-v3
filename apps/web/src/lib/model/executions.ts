/**
 * Le travail fait (`clip_execution`, toggle `records`) : bâti à la fin d'une instruction à partir des
 * réponses aux relevés, écrit une fois et jamais modifié. Si l'écriture échoue (réseau), la trace
 * attend dans l'appareil et repart au prochain chargement d'une instruction : elle ne se perd pas.
 */
import type { DataApi, Doc } from '../gateway/data'
import type { Messages } from '../i18n/core'
import { answered, liveChecks, readingsStats, verdict, type Answers } from './checks'
import { nowIso, T } from './repo'
import type { Check, Execution, ExecutionAnswer, InstructionContent, ItemState } from './types'
import { outbox } from '../util/outbox'

export type ExecutionMeta = Omit<Execution, 'answers' | 'deviations' | 'instructionTitle' | 'finishedAt'> & { finishedAt?: string }

/** Ce que la trace garde d'une réponse, selon le genre : la valeur lisible, et le détail des genres du module. */
function recorded(c: Check, v: NonNullable<Answers[string]>['value']): Pick<ExecutionAnswer, 'value' | 'values' | 'items' | 'photos'> {
  switch (c.kind) {
    case 'choice':
      return { value: c.options?.find((o) => o.id === v)?.label ?? null }
    case 'measures': {
      const values = (v as number[]).slice(0, c.count ?? undefined)
      return { value: readingsStats(values)?.mean ?? null, values }
    }
    case 'checklist': {
      const states = v as Record<string, ItemState>
      return { value: null, items: (c.items ?? []).map((i) => ({ label: i.label, state: states[i.id] })) }
    }
    case 'photo':
      return Array.isArray(v) ? { value: (v as string[]).find((x) => !!x) ?? null, photos: (v as string[]).filter(Boolean) } : { value: v as string }
    default:
      return { value: v as number | boolean | string }
  }
}

/**
 * La trace, à partir du contenu dans sa langue d'origine (celle que lit le responsable) et des
 * réponses. Un relevé facultatif laissé vide n'y figure pas ; un choix s'écrit par son libellé ; une
 * proposition de l'IA pas encore gardée n'existe pas au poste.
 */
export function buildExecution(content: InstructionContent, answers: Answers, meta: ExecutionMeta): Execution {
  const list: ExecutionAnswer[] = []
  for (const step of content.steps)
    for (const c of liveChecks(step)) {
      const a = answers[c.id]
      const v = a?.value ?? null
      if (!answered(c, v)) continue
      const ok = verdict(c, v)
      list.push({
        stepId: step.id,
        stepTitle: step.title,
        checkId: c.id,
        label: c.label,
        kind: c.kind,
        ...recorded(c, v),
        ...(c.unit ? { unit: c.unit } : {}),
        ...(c.kind === 'measure' || c.kind === 'measures' ? { min: c.min ?? null, max: c.max ?? null } : {}),
        ok,
        ...(a?.note?.trim() ? { note: a.note.trim() } : {}),
        ...(ok === false && c.authorize && a?.authorizedBy?.trim() ? { authorizedBy: a.authorizedBy.trim() } : {}),
      })
    }
  const { finishedAt, ...rest } = meta
  return { ...rest, instructionTitle: content.title, finishedAt: finishedAt ?? nowIso(), answers: list, deviations: list.filter((x) => x.ok === false).length }
}

/* ───────────────────────── L'attente dans l'appareil ───────────────────────── */

/** Au plus 50 traces en attente, gardées 30 jours ; une trace se reconnaît à son instruction, sa fin et son appareil. */
const queue = outbox<Execution, DataApi>({
  storageKey: 'clip_exec_queue',
  send: (e, data) => data.insert<Execution>(T.execution, e, e.instructionTitle),
  at: (e) => e.finishedAt,
  keyOf: (e) => `${e.instructionId}|${e.finishedAt}|${e.deviceId ?? ''}`,
})

/** Le nombre de traces qui attendent dans cet appareil. */
export const pendingExecutions = (): number => queue.pending()

/** Écrit la trace ; si elle ne part pas, elle attend dans l'appareil. */
export const saveExecution = (data: DataApi, e: Execution): Promise<'saved' | 'queued'> => queue.save(e, data)

/** Renvoie les traces en attente ; rend le nombre parti. Une seule reprise à la fois. */
export const flushExecutions = (data: DataApi): Promise<number> => queue.flush(data)

/* ───────────────────────── Le registre ───────────────────────── */

export interface ExecutionFilter {
  instructionId?: string | null
  stationId?: string | null
  operatorId?: string | null
  /** Seulement le travail qui a des écarts. */
  deviations?: boolean
  /** Depuis cette date (ISO). */
  since?: string | null
  limit?: number
}

/** Le travail fait, du plus récent au plus ancien. */
export async function listExecutions(data: DataApi, f: ExecutionFilter = {}): Promise<Doc<Execution>[]> {
  const filter: Record<string, unknown> = {}
  if (f.instructionId) filter['json_data.instructionId'] = { $eq: f.instructionId }
  if (f.stationId) filter['json_data.stationId'] = { $eq: f.stationId }
  if (f.operatorId) filter['json_data.operatorId'] = { $eq: f.operatorId }
  if (f.deviations) filter['json_data.deviations'] = { $gt: 0 }
  if (f.since) filter['json_data.finishedAt'] = { $gte: f.since }
  return data.filter<Execution>(T.execution, { filter, sort: { 'json_data.finishedAt': -1 }, limit: f.limit ?? 300 })
}

/** Qui a fait le travail, pour l'afficher : la personne de l'équipe, sinon la personne connectée. */
export const doneBy = (e: Execution): string | null => e.operatorName || e.userName || null

/* ───────────────────────── La lecture d'une réponse ───────────────────────── */

type RecordsText = Messages['records']

/** La valeur relevée, lisible : « 4,8 bar », « Oui », « Sale », le texte ; une photo se montre à part. */
export function answerValue(a: ExecutionAnswer, t: RecordsText): string {
  if (a.kind === 'measure' && typeof a.value === 'number') return t.value(a.value, a.unit ?? '')
  if (a.kind === 'measures' && a.values?.length) return t.readingList(a.values, a.unit ?? "")
  if (a.kind === 'checklist' && a.items) return t.checklistSummary(a.items.filter((i) => i.state === 'ok').length, a.items.filter((i) => i.state === 'ko').length, a.items.filter((i) => i.state === 'na').length)
  if (a.kind === 'yesno' && typeof a.value === 'boolean') return a.value ? t.yes : t.no
  if (a.kind === 'photo') return t.photo
  return typeof a.value === 'string' ? a.value : ''
}

/** Les limites d'une mesure au moment du travail : « entre 4,5 et 5,5 bar » ; null sans limites. */
export function answerLimits(a: ExecutionAnswer, t: RecordsText): string | null {
  if (a.kind !== 'measure' && a.kind !== 'measures') return null
  const unit = a.unit ?? ''
  const lo = typeof a.min === 'number' ? a.min : null
  const hi = typeof a.max === 'number' ? a.max : null
  if (lo !== null && hi !== null) return t.between(lo, hi, unit)
  if (lo !== null) return t.atLeast(lo, unit)
  if (hi !== null) return t.atMost(hi, unit)
  return null
}
