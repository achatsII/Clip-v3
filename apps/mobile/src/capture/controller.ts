import { BridgeError } from '../bridge/errors'
import type { BridgeRequestMap } from '../bridge/protocol'
import { strings } from '../i18n'

/**
 * Les écrans de capture natifs, ouverts par le pont et rendus par-dessus la WebView.
 * Une seule capture à la fois ; la promesse se résout quand l'écran rend son résultat.
 */
type CaptureMap = {
  photo: BridgeRequestMap['camera.photo']
  video: BridgeRequestMap['camera.video']
  audio: BridgeRequestMap['audio.record']
  scan: BridgeRequestMap['scan']
}

export type CaptureKind = keyof CaptureMap

export interface ActiveCapture<K extends CaptureKind = CaptureKind> {
  id: number
  kind: K
  payload: CaptureMap[K]['payload']
}

interface Pending {
  capture: ActiveCapture
  resolve: (value: unknown) => void
  reject: (error: BridgeError) => void
}

type Listener = (capture: ActiveCapture | null) => void

class CaptureController {
  private pending: Pending | null = null
  private nextId = 1
  private listeners = new Set<Listener>()

  open<K extends CaptureKind>(kind: K, payload: CaptureMap[K]['payload']): Promise<CaptureMap[K]['result']> {
    if (this.pending) {
      return Promise.reject(new BridgeError('failed', strings().errors.captureOpen))
    }
    return new Promise((resolve, reject) => {
      const capture: ActiveCapture = { id: this.nextId++, kind, payload }
      this.pending = { capture, resolve: resolve as (v: unknown) => void, reject }
      this.emit()
    })
  }

  complete(id: number, result: unknown): void {
    if (!this.pending || this.pending.capture.id !== id) return
    const { resolve } = this.pending
    this.pending = null
    this.emit()
    resolve(result)
  }

  fail(id: number, error: BridgeError): void {
    if (!this.pending || this.pending.capture.id !== id) return
    const { reject } = this.pending
    this.pending = null
    this.emit()
    reject(error)
  }

  get current(): ActiveCapture | null {
    return this.pending?.capture ?? null
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit() {
    const current = this.current
    for (const l of this.listeners) l(current)
  }
}

export const captureController = new CaptureController()
