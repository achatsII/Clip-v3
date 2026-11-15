import type { CapturedMedia } from '../bridge/protocol'

/**
 * Le cœur de « parler pendant les photos », sans module natif (testé seul) : ouvrir le micro, le
 * mettre en pause, lire l'instant d'une photo, rendre ou jeter la note. Le hook `useNarration`
 * (`narration.ts`) le branche sur l'enregistreur d'expo-audio et sur l'écran.
 */
export interface RecorderLike {
  record(): void
  pause(): void
  stop(): Promise<void>
  prepareToRecordAsync(): Promise<void>
  getStatus(): { isRecording: boolean; durationMillis: number }
  readonly uri: string | null
}

export interface Permission {
  granted: boolean
  canAskAgain: boolean
}

export interface NarrationDeps {
  getPermission(): Promise<Permission>
  requestPermission(): Promise<Permission>
  /** Le mode audio de l'app : enregistrer (et jouer en mode silencieux), ou plus. */
  audioMode(recording: boolean): Promise<void>
  /** Inscrit le fichier enregistré comme note de la série (`narration: true`). */
  finalize(uri: string, seconds: number): Promise<CapturedMedia>
  removeFile(uri: string): void
  /** Retient le dernier geste sur la pastille. */
  remember(on: boolean): void
  onDenied(denied: { canAsk: boolean } | null): void
  onFull(): void
  log(error: unknown, action: string): void
  /** Durée au plus, en secondes (celle d'une note vocale). */
  maxSeconds: number
}

/** En dessous, rien d'utile n'a été dit : on ne rend pas de note. */
export const MIN_SECONDS = 1

export function narrationController(recorder: RecorderLike, deps: NarrationDeps) {
  let started = false
  // La série est finie (rendue, jetée, ou l'écran fermé) : le micro ne démarre plus.
  let ended = false
  let full = false
  let busy = false

  async function open(): Promise<boolean> {
    let p = await deps.getPermission()
    if (!p.granted && p.canAskAgain) p = await deps.requestPermission()
    if (ended) return false
    if (!p.granted) {
      deps.onDenied({ canAsk: p.canAskAgain })
      return false
    }
    deps.onDenied(null)
    if (!started) {
      await deps.audioMode(true)
      await recorder.prepareToRecordAsync()
      // Fermé pendant qu'il démarrait : il ne se met pas à enregistrer après coup.
      if (ended) return false
      started = true
    }
    recorder.record()
    return true
  }

  async function stop(): Promise<{ uri: string | null; seconds: number }> {
    const seconds = recorder.getStatus().durationMillis / 1000
    ended = true
    await recorder.stop()
    await deps.audioMode(false).catch(() => undefined)
    return { uri: recorder.uri, seconds }
  }

  return {
    /** À l'ouverture de la caméra, si la personne n'a pas fermé le micro la dernière fois. */
    async start(wanted: boolean) {
      if (!wanted || started || ended) return
      await open().catch((e) => deps.log(e, 'voice.start'))
    },

    /** L'instant présent dans l'enregistrement (secondes, au dixième), ou `undefined` micro fermé. */
    mark(): number | undefined {
      if (!started || ended) return undefined
      try {
        const s = recorder.getStatus()
        return s.isRecording ? Math.round(s.durationMillis / 100) / 10 : undefined
      } catch {
        return undefined
      }
    },

    /** Ouvre ou ferme le micro (une pause : elle n'est pas dans le fichier), et retient le geste. */
    async toggle() {
      if (busy || ended || full) return
      busy = true
      try {
        if (started && recorder.getStatus().isRecording) {
          recorder.pause()
          deps.remember(false)
        } else if (await open()) deps.remember(true)
      } catch (e) {
        deps.log(e, 'voice.toggle')
      } finally {
        busy = false
      }
    },

    /** Suivi de la durée : au plus `maxSeconds`, puis le micro se ferme de lui-même. */
    tick(status: { isRecording: boolean; durationMillis: number }) {
      if (full || !status.isRecording || status.durationMillis < deps.maxSeconds * 1000) return
      full = true
      recorder.pause()
      deps.onFull()
    },

    /** Arrête et rend la note de la série, ou null s'il n'y a rien d'utile. */
    async finish(): Promise<CapturedMedia | null> {
      if (ended) return null
      if (!started) {
        ended = true
        return null
      }
      try {
        const { uri, seconds } = await stop()
        if (!uri) return null
        if (seconds < MIN_SECONDS) {
          deps.removeFile(uri)
          return null
        }
        return await deps.finalize(uri, Math.min(seconds, deps.maxSeconds))
      } catch (e) {
        // La note est perdue, pas les photos : elles partent seules.
        deps.log(e, 'voice.finish')
        return null
      }
    },

    /** Arrête et jette l'enregistrement. */
    async discard() {
      if (ended) return
      if (!started) {
        ended = true
        return
      }
      try {
        const { uri } = await stop()
        if (uri) deps.removeFile(uri)
      } catch (e) {
        deps.log(e, 'voice.discard')
      }
    },

    /** L'écran se ferme sans avoir rendu la note : le micro ne reste pas ouvert. */
    close() {
      const recording = started && !ended
      ended = true
      if (recording) void recorder.stop().catch(() => undefined)
      void deps.audioMode(false).catch(() => undefined)
    },
  }
}

export type NarrationController = ReturnType<typeof narrationController>
