/**
 * La génération au serveur (toggle `serverGeneration`, réglage `OrgSettings.generation.server`).
 *
 * L'appareil prépare la requête AskAI v4 (la même que sur l'appareil, `prepareGeneration`) et la
 * confie à `POST /api/v1/ai/job/start`. La branche clip-v3 du workflow n8n Job_start la roule et
 * écrit son état et le résultat dans `clip_job`, avec les droits de la personne qui l'a lancée.
 * L'appareil peut alors se fermer. Le premier appareil ouvert qui voit le travail fini termine
 * l'instruction avec le code de l'app (mise en forme, vignettes, repères, enregistrement) et
 * débite le coût réel, une seule fois (`jobDebitKey`).
 */
import type { DataApi, Doc } from '../gateway/data'
import { messages } from '../i18n'
import { T } from '../model/repo'
import type { GeneratingInfo, ServerJob } from '../model/types'

/**
 * Les champs de la requête AskAI v4 que la branche clip-v3 relaie à Ask_AI_V4 (nœud « Run AskAI V4 »
 * de Job_Generate_CLIP_V3, dans n8n). Une requête de génération qui en emploie un autre doit d'abord
 * être reportée dans ce nœud : sinon le serveur l'ignorerait en silence (test `server-generation`).
 * `effort` n'est relayé ni par la Gateway ni par la branche : Ask_AI_V4 ne le lit pas.
 */
export const JOB_RELAYED_FIELDS = ['provider', 'level', 'prompt', 'system_instruction', 'json_schema', 'thinking', 'files', 'history', 'useSearch', 'fileUrl', 'mediaResolution', 'videoMode', 'fps', 'maxFileProcessingPolls', 'fileProcessingWaitSeconds', 'maxOutputTokens'] as const
export const JOB_IGNORED_FIELDS = ['effort'] as const

/** Un travail encore à l'étape de départ après 3 minutes : le serveur ne l'a jamais pris. */
export const SERVER_PICKUP_MS = 3 * 60_000
/** Un appareil qui termine l'instruction la garde 5 minutes ; passé ce délai, un autre peut la reprendre. */
export const FINISH_LOCK_MS = 5 * 60_000

export type JobOutcome =
  | { kind: 'running' }
  /** Déjà terminée par un appareil. */
  | { kind: 'done' }
  | { kind: 'completed'; json: unknown; model: string | null; costCad: number | null }
  | { kind: 'failed'; message: string; costCad: number | null; reason: 'error' | 'stuck' | 'missing' }

function costOf(job: ServerJob): number | null {
  const cad = job.result?.billing?.costs?.cad
  return typeof cad === 'number' && Number.isFinite(cad) && cad >= 0 ? cad : null
}

/** Où en est un travail au serveur, et ce qu'il faut en faire. */
export function jobOutcome(job: ServerJob | null | undefined, now = Date.now()): JobOutcome {
  const t = messages().capture.progress
  if (!job) return { kind: 'failed', message: t.serverLost, costCad: null, reason: 'missing' }
  if (job.finalizedAt) return { kind: 'done' }
  if (job.status === 'completed') return { kind: 'completed', json: job.result?.json ?? null, model: job.result?.model ?? null, costCad: costOf(job) }
  if (job.status === 'failed') return { kind: 'failed', message: t.serverFailed, costCad: costOf(job), reason: 'error' }
  const started = Date.parse(job.startedAt)
  if (job.stage === 'start' && Number.isFinite(started) && now - started > SERVER_PICKUP_MS) return { kind: 'failed', message: t.serverNotTaken, costCad: null, reason: 'stuck' }
  return { kind: 'running' }
}

/** Ce verrou est-il encore tenu par un autre appareil ? */
export function lockedByOther(info: Pick<GeneratingInfo, 'finishing'> | null | undefined, me: string, now = Date.now()): boolean {
  const lock = info?.finishing
  if (!lock || lock.by === me) return false
  const at = Date.parse(lock.at)
  return Number.isFinite(at) && now - at < FINISH_LOCK_MS
}

/** Le travail au serveur ; null s'il n'existe plus. */
export function readServerJob(data: Pick<DataApi, 'get'>, id: string): Promise<Doc<ServerJob> | null> {
  return data.get<ServerJob>(T.serverJob, id)
}

/** Les travaux au serveur d'une liste de créations en cours (la petite lecture de `useCreations`). */
export function serverJobIds(creations: Array<Pick<Doc<{ generating?: GeneratingInfo | null }>, 'json_data'>>): string[] {
  const ids: string[] = []
  for (const c of creations) {
    const g = c.json_data.generating
    if (g?.mode === 'server' && g.jobId && !ids.includes(g.jobId)) ids.push(g.jobId)
  }
  return ids
}

/** Un identifiant pour cet onglet : il dit qui tient le verrou de fin. */
export const DEVICE_ID = (() => {
  const raw = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  return `tab_${raw.replace(/-/g, '').slice(0, 16)}`
})()
