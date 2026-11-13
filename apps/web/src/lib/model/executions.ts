/**
 * Le travail fait (`clip_execution`, toggle `records`) : bâti à la fin d'une instruction à partir des
 * réponses aux relevés, écrit une fois et jamais modifié. Si l'écriture échoue (réseau), la trace
 * attend dans l'appareil et repart au prochain chargement d'une instruction : elle ne se perd pas.
 */
import type { DataApi, Doc } from '../gateway/data'
import type { Messages } from '../i18n/core'
import { answered, verdict, type Answers } from './checks'
import { nowIso, T } from './repo'
import type { Execution, ExecutionAnswer, InstructionContent } from './types'

export type ExecutionMeta = Omit<Execution, 'answers' | 'deviations' | 'instructionTitle' | 'finishedAt'> & { finishedAt?: string }

/**
 * La trace, à partir du contenu dans sa langue d'origine (celle que lit le responsable) et des
 * réponses. Un relevé facultatif laissé vide n'y figure pas ; un choix s'écrit par son libellé.
 */
export function buildExecution(content: InstructionContent, answers: Answers, meta: ExecutionMeta): Execution {
  const list: ExecutionAnswer[] = []
  for (const step of content.steps)
    for (const c of step.checks ?? []) {
      const a = answers[c.id]
      const v = a?.value ?? null
      if (!answered(c, v)) continue
      list.push({
        stepId: step.id,
        stepTitle: step.title,
        checkId: c.id,
        label: c.label,
        kind: c.kind,
        value: c.kind === 'choice' ? (c.options?.find((o) => o.id === v)?.label ?? null) : v,
        ...(c.unit ? { unit: c.unit } : {}),
        ...(c.kind === 'measure' ? { min: c.min ?? null, max: c.max ?? null } : {}),
        ok: verdict(c, v),
        ...(a?.note?.trim() ? { note: a.note.trim() } : {}),
      })
    }
  const { finishedAt, ...rest } = meta
  return { ...rest, instructionTitle: content.title, finishedAt: finishedAt ?? nowIso(), answers: list, deviations: list.filter((x) => x.ok === false).length }
}

/* ───────────────────────── L'attente dans l'appareil ───────────────────────── */

const QUEUE = 'clip_exec_queue'
/** Au plus 50 traces en attente, gardées 30 jours. */
const MAX_QUEUED = 50
const KEEP_MS = 30 * 86400_000

function readQueue(): Execution[] {
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE) ?? '[]') as unknown
    return Array.isArray(raw) ? (raw as Execution[]) : []
  } catch {
    return []
  }
}

function writeQueue(list: Execution[], now = Date.now()) {
  try {
    const kept = list.filter((e) => now - Date.parse(e.finishedAt) < KEEP_MS).slice(-MAX_QUEUED)
    if (kept.length) localStorage.setItem(QUEUE, JSON.stringify(kept))
    else localStorage.removeItem(QUEUE)
  } catch {
    /* sans stockage, la trace ne peut pas attendre */
  }
}

/** Le nombre de traces qui attendent dans cet appareil. */
export const pendingExecutions = (): number => readQueue().length

/** Écrit la trace ; si elle ne part pas, elle attend dans l'appareil. */
export async function saveExecution(data: DataApi, e: Execution): Promise<'saved' | 'queued'> {
  try {
    await data.insert<Execution>(T.execution, e, e.instructionTitle)
    return 'saved'
  } catch {
    writeQueue([...readQueue(), e])
    return 'queued'
  }
}

/** Une trace se reconnaît à son instruction, sa fin et son appareil (elle passe par du JSON). */
const keyOf = (e: Execution) => `${e.instructionId}|${e.finishedAt}|${e.deviceId ?? ''}`

let flushing: Promise<number> | null = null

/** Renvoie les traces en attente ; rend le nombre parti. Une seule reprise à la fois. */
export function flushExecutions(data: DataApi): Promise<number> {
  if (flushing) return flushing
  flushing = (async () => {
    const sent = new Set<string>()
    for (const e of readQueue()) {
      try {
        await data.insert<Execution>(T.execution, e, e.instructionTitle)
        sent.add(keyOf(e))
      } catch {
        /* elle attend la prochaine fois */
      }
    }
    // Relue à la fin : ce qui s'est ajouté pendant l'envoi reste dans la file.
    if (sent.size) writeQueue(readQueue().filter((e) => !sent.has(keyOf(e))))
    return sent.size
  })().finally(() => {
    flushing = null
  })
  return flushing
}

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
  if (a.kind === 'yesno' && typeof a.value === 'boolean') return a.value ? t.yes : t.no
  if (a.kind === 'photo') return t.photo
  return typeof a.value === 'string' ? a.value : ''
}

/** Les limites d'une mesure au moment du travail : « entre 4,5 et 5,5 bar » ; null sans limites. */
export function answerLimits(a: ExecutionAnswer, t: RecordsText): string | null {
  if (a.kind !== 'measure') return null
  const unit = a.unit ?? ''
  const lo = typeof a.min === 'number' ? a.min : null
  const hi = typeof a.max === 'number' ? a.max : null
  if (lo !== null && hi !== null) return t.between(lo, hi, unit)
  if (lo !== null) return t.atLeast(lo, unit)
  if (hi !== null) return t.atMost(hi, unit)
  return null
}
