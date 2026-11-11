/**
 * Une génération se voit sur tous les appareils. Elle tourne dans l'appareil qui l'a lancée ;
 * celui-ci écrit son état dans l'instruction (`generating`) : au départ, à chaque nouvelle étape,
 * et un signe de vie toutes les 30 secondes. Les autres appareils le lisent par une petite
 * requête, souvent pendant une création, rarement sinon. Sans signe de vie depuis deux minutes
 * (app fermée, téléphone en veille), la génération est « interrompue » : on peut la relancer.
 */
import type { DataApi } from '../gateway/data'
import { messages } from '../i18n'
import { T } from '../model/repo'
import type { GeneratingInfo, Instruction } from '../model/types'

export const HEARTBEAT_MS = 30_000
export const STALE_MS = 120_000
/** Relire les créations : toutes les 10 s pendant l'une d'elles, toutes les 60 s sinon (accueil et liste). */
export const POLL_BUSY_MS = 10_000
export const POLL_IDLE_MS = 60_000

export type CreationState = { kind: 'none' } | { kind: 'running'; info: GeneratingInfo } | { kind: 'stale'; info: GeneratingInfo }

export function creationOf(i: Pick<Instruction, 'generating'> | null | undefined, now = Date.now()): CreationState {
  const info = i?.generating
  if (!info) return { kind: 'none' }
  const last = Date.parse(info.heartbeatAt || info.startedAt)
  return Number.isFinite(last) && now - last <= STALE_MS ? { kind: 'running', info } : { kind: 'stale', info }
}

/** Les créations apparues et disparues entre deux lectures. */
export function diffCreations(before: ReadonlySet<string>, after: ReadonlySet<string>): { started: string[]; finished: string[] } {
  return { started: [...after].filter((id) => !before.has(id)), finished: [...before].filter((id) => !after.has(id)) }
}

/** Les étapes d'une création. Leur clé s'écrit dans l'instruction ; leur libellé se lit au rendu. */
export const STAGE_KEYS = ['prepare', 'analyze', 'finish'] as const
export type StageKey = (typeof STAGE_KEYS)[number]

/** Ce que dit une étape, dans la langue de chaque appareil (celui qui génère comme les autres). */
export function stageLabel(stage: string): string | undefined {
  return (STAGE_KEYS as readonly string[]).includes(stage) ? messages().capture.progress.stages[stage as StageKey] : undefined
}

/**
 * Le détail d'une étape s'écrit lui aussi sans mots, pour se lire dans la langue de chaque
 * appareil : « 2/5 » (la source qu'on prépare, sur le total) ou les vignettes des extraits.
 */
export const DETAIL_THUMBNAILS = 'thumbnails'
export const sourceDetail = (index: number, total: number) => `${index}/${total}`

/** Ce que dit le détail d'une étape ; un détail déjà écrit en mots (version antérieure) passe tel quel. */
export function detailLabel(detail?: string | null): string | undefined {
  if (!detail) return undefined
  const t = messages().capture.progress
  const source = /^(\d+)\/(\d+)$/.exec(detail)
  if (source) return t.sourceOf(Number(source[1]), Number(source[2]))
  if (detail === DETAIL_THUMBNAILS) return t.thumbnails
  return detail
}

export interface CreationClock {
  now: () => number
  every: (fn: () => void, ms: number) => () => void
}

const realClock: CreationClock = {
  now: () => Date.now(),
  every: (fn, ms) => {
    const id = setInterval(fn, ms)
    return () => clearInterval(id)
  },
}

/**
 * Ce que l'appareil qui génère écrit. Les écritures partent l'une après l'autre, dans l'ordre :
 * un signe de vie n'arrive jamais avant l'état de départ. Une écriture ratée ne gêne jamais la
 * génération. La fin réussie efface `generating` avec le brouillon (`saveDraft`), après `settle`.
 */
export function creationReporter(data: Pick<DataApi, 'patch'>, id: string, who: { name?: string | null; device: 'app' | 'web' }, clock: CreationClock = realClock) {
  let stage = 'prepare'
  let detail: string | null = null
  let stopBeat: (() => void) | null = null
  let chain: Promise<unknown> = Promise.resolve()
  const iso = () => new Date(clock.now()).toISOString()
  const write = (patch: Record<string, unknown>) => {
    chain = chain.then(() => data.patch(T.instruction, id, patch)).catch(() => undefined)
    return chain
  }
  const stop = () => {
    stopBeat?.()
    stopBeat = null
  }
  return {
    start() {
      const at = iso()
      void write({ generating: { startedAt: at, heartbeatAt: at, stage, detail: null, byName: who.name ?? null, device: who.device }, generationError: null })
      stopBeat = clock.every(() => void write({ 'generating.heartbeatAt': iso(), 'generating.stage': stage, 'generating.detail': detail }), HEARTBEAT_MS)
    },
    /**
     * Une nouvelle étape s'écrit tout de suite ; un simple détail attend le prochain signe de vie.
     * Rend vrai si l'étape a changé (l'écriture part ; `settle` dit quand elle est faite).
     */
    stage(next: string, nextDetail?: string): boolean {
      const changed = next !== stage
      stage = next
      detail = nextDetail ?? null
      if (changed && stopBeat) void write({ 'generating.stage': stage, 'generating.detail': detail, 'generating.heartbeatAt': iso() })
      return changed
    },
    stop,
    /** Attend que les écritures en cours soient parties (avant la dernière). */
    settle: () => chain,
    async fail(message: string) {
      stop()
      await write({ generating: null, generationError: { at: iso(), message } })
    },
  }
}
