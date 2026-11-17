'use client'

/**
 * Enregistrer l'écran depuis le navigateur (toggle `screenCapture`), sans rien installer : le partage
 * d'écran du navigateur (`getDisplayMedia`) filme la fenêtre ou l'écran choisi, le micro en option
 * dit le pourquoi, et l'app garde une image nette à chaque action (`screenShots.ts`).
 *
 * Les images se lisent hors de la boucle de l'onglet quand le navigateur le permet
 * (`MediaStreamTrackProcessor`, Chrome et Edge) : l'onglet de CLIP passe en arrière-plan pendant
 * qu'on travaille dans l'autre logiciel, et ses minuteries y sont ralenties. Ailleurs, une minuterie
 * suffit tant que l'onglet est visible ; la vidéo, elle, s'enregistre toujours en entier.
 */
import { openMic, startRecording, stopStream, type Recording } from './recorder'
import { PROBE_H, PROBE_W, ShotPicker, toGray } from './screenShots'

/** Dix minutes au plus, comme une vidéo filmée : assez pour une tâche, léger à envoyer. */
export const SCREEN_MAX_SEC = 600
/** Une petite image toutes les 150 ms : un clic rapide n'échappe pas. */
const SAMPLE_MS = 150

export interface ScreenShot {
  blob: Blob
  /** L'instant, en secondes depuis le début de l'enregistrement. */
  at: number
  width: number
  height: number
}

export interface ScreenResult {
  video: Blob
  mime: string
  durationSec: number
  shots: ScreenShot[]
  withVoice: boolean
}

export interface ScreenSession {
  /** Le flux de l'écran choisi, pour l'aperçu. */
  stream: MediaStream
  withVoice: boolean
  /** Secondes enregistrées. */
  seconds(): number
  shots(): number
  /** Arrête et rend la vidéo et ses images. */
  stop(): Promise<ScreenResult>
  cancel(): void
  /** Le partage arrêté par le navigateur (« Arrêter le partage »). */
  onEnded(fn: () => void): void
}

/** Un ordinateur qui partage son écran : jamais au téléphone ni à la tablette (le navigateur ne le permet pas). */
export function canRecordScreen(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  if (typeof navigator.mediaDevices?.getDisplayMedia !== 'function' || typeof MediaRecorder === 'undefined') return false
  return window.matchMedia?.('(any-pointer: fine)').matches ?? true
}

type FrameSource = CanvasImageSource & { close?: () => void }
type TrackProcessor = new (init: { track: MediaStreamTrack }) => { readable: ReadableStream<FrameSource & { displayWidth: number; displayHeight: number }> }

/**
 * Ouvre le choix de l'écran (dans le geste de la personne), puis le micro si on le veut. Rend `null`
 * si la personne ferme le choix sans rien partager.
 */
export async function startScreen(opts: { voice: boolean; onShot?: (count: number) => void }): Promise<{ session: ScreenSession; voiceDenied: boolean } | null> {
  let display: MediaStream
  try {
    display = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 15, max: 30 }, width: { max: 1920 }, height: { max: 1080 } },
      audio: false,
      // Ces choix aident le navigateur à proposer le bon partage ; les anciens les ignorent.
      ...({ selfBrowserSurface: 'exclude', surfaceSwitching: 'include', monitorTypeSurfaces: 'include' } as object),
    })
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return null
    throw e
  }
  const track = display.getVideoTracks()[0]
  let mic: MediaStream | null = null
  let voiceDenied = false
  if (opts.voice) {
    try {
      mic = await openMic()
    } catch {
      voiceDenied = true
    }
  }

  const recorded = new MediaStream([track, ...(mic?.getAudioTracks() ?? [])])
  const rec: Recording = startRecording(recorded, 'video')
  const t0 = performance.now()
  const picker = new ShotPicker()
  const shots: ScreenShot[] = []
  const encoding: Array<Promise<void>> = []
  let stopped = false
  const ended = new Set<() => void>()
  track.addEventListener('ended', () => ended.forEach((fn) => fn()))

  const probe = document.createElement('canvas')
  probe.width = PROBE_W
  probe.height = PROBE_H
  const probeCtx = probe.getContext('2d', { willReadFrequently: true })
  /** L'image d'avant, prête à être gardée si l'écran change maintenant. */
  let prevAt = 0
  let keepPrev: (() => void) | null = null

  /** Garde une image pleine grandeur : copiée tout de suite, encodée ensuite. */
  function keep(src: CanvasImageSource, w: number, h: number, atMs: number) {
    const copy = document.createElement('canvas')
    copy.width = w
    copy.height = h
    copy.getContext('2d')?.drawImage(src, 0, 0, w, h)
    const at = Math.max(0, (atMs - t0) / 1000)
    encoding.push(
      new Promise<void>((resolve) => {
        copy.toBlob(
          (blob) => {
            if (blob) shots.push({ blob, at, width: w, height: h })
            resolve()
          },
          'image/jpeg',
          0.9,
        )
      }),
    )
    opts.onShot?.(picker.count)
  }

  /** Regarde une image de l'écran : `keepNow` la garde, et elle devient « l'image d'avant ». */
  function look(src: CanvasImageSource, now: number, keepNow: () => void, becomePrev: () => () => void) {
    if (!probeCtx) return
    probeCtx.drawImage(src, 0, 0, PROBE_W, PROBE_H)
    const decision = picker.feed(toGray(probeCtx.getImageData(0, 0, PROBE_W, PROBE_H).data), now)
    if (decision === 'now') keepNow()
    else if (decision === 'before') keepPrev?.()
    keepPrev = becomePrev()
    prevAt = now
  }

  // Les images de l'écran : chacune, hors de la boucle de l'onglet si le navigateur le permet (un
  // écran qui ne bouge pas n'en donne parfois aucune, un menu ouvert un instant n'en donne qu'une) ;
  // sinon, une minuterie.
  let stopSampling: () => void
  const Processor = (globalThis as unknown as { MediaStreamTrackProcessor?: TrackProcessor }).MediaStreamTrackProcessor
  if (Processor) {
    const copy = track.clone()
    const reader = new Processor({ track: copy }).readable.getReader()
    // L'image d'avant reste ouverte jusqu'à la suivante : on la dessine seulement si on la garde.
    let held: (FrameSource & { displayWidth: number; displayHeight: number }) | null = null
    void (async () => {
      for (;;) {
        const { value: frame, done } = await reader.read().catch(() => ({ value: undefined, done: true as const }))
        if (done || !frame) break
        if (stopped || picker.full) {
          frame.close?.()
          continue
        }
        const now = performance.now()
        try {
          look(
            frame,
            now,
            () => keep(frame, frame.displayWidth, frame.displayHeight, now),
            () => {
              held?.close?.()
              held = frame
              const at = now
              return () => keep(frame, frame.displayWidth, frame.displayHeight, at)
            },
          )
        } catch {
          // Une image illisible ne coupe pas l'enregistrement.
          if (held !== frame) frame.close?.()
        }
      }
    })()
    stopSampling = () => {
      void reader.cancel().catch(() => undefined)
      copy.stop()
      held?.close?.()
      held = null
    }
  } else {
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.srcObject = new MediaStream([track])
    void v.play().catch(() => undefined)
    // Deux images pleine grandeur qui alternent : la courante et celle d'avant.
    const full = [document.createElement('canvas'), document.createElement('canvas')]
    let idx = 0
    const timer = setInterval(() => {
      if (stopped || picker.full || v.readyState < 2 || !v.videoWidth) return
      const w = v.videoWidth
      const h = v.videoHeight
      const cur = full[idx]
      if (cur.width !== w || cur.height !== h) {
        cur.width = w
        cur.height = h
      }
      cur.getContext('2d')?.drawImage(v, 0, 0, w, h)
      const now = performance.now()
      try {
        look(
          cur,
          now,
          () => keep(cur, w, h, now),
          () => {
            idx = 1 - idx
            return () => keep(cur, w, h, now)
          },
        )
      } catch {
        /* idem */
      }
    }, SAMPLE_MS)
    stopSampling = () => {
      clearInterval(timer)
      v.srcObject = null
    }
  }

  const seconds = () => (performance.now() - t0) / 1000
  const release = () => {
    stopped = true
    stopSampling()
    stopStream(display)
    stopStream(mic)
  }

  return {
    voiceDenied,
    session: {
      stream: display,
      withVoice: !!mic,
      seconds,
      shots: () => picker.count,
      onEnded: (fn) => void ended.add(fn),
      cancel: () => {
        rec.cancel()
        release()
      },
      async stop() {
        const durationSec = seconds()
        // L'écran d'arrivée : ce que la tâche a donné.
        if (!stopped && picker.finish(prevAt)) keepPrev?.()
        stopped = true
        const video = await rec.stop()
        release()
        await Promise.all(encoding)
        shots.sort((a, b) => a.at - b.at)
        return { video, mime: rec.mime, durationSec, shots, withVoice: !!mic }
      },
    },
  }
}
