/**
 * Lecture d'un code QR ou d'un code-barres : la coquille native d'abord (tous les formats),
 * sinon le navigateur (BarcodeDetector, ou jsQR pour les codes QR).
 */
import { callNative, hasCapability, NativeError } from '../bridge/native'

export function canScan(): boolean {
  if (hasCapability('scan')) return true
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

export async function scanNative(prompt?: string): Promise<string | null> {
  try {
    const r = await callNative('scan', { formats: ['qr', 'code128', 'code39', 'ean13', 'datamatrix'], prompt })
    return r.value
  } catch (e) {
    if (e instanceof NativeError && e.code === 'cancelled') return null
    throw e
  }
}

type Detector = { detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>> }

export function createDetector(): ((video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>) {
  const BD = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector
  let detector: Detector | null = null
  if (BD) {
    try {
      detector = new BD({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix'] })
    } catch {
      detector = null
    }
  }
  let jsqr: ((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null
  return async (video, canvas) => {
    if (video.readyState < 2) return null
    if (detector) {
      try {
        const found = await detector.detect(video)
        if (found[0]?.rawValue) return found[0].rawValue
        return null
      } catch {
        detector = null
      }
    }
    if (!jsqr) jsqr = (await import('jsqr')).default as unknown as typeof jsqr
    const w = Math.min(640, video.videoWidth)
    const h = Math.round((video.videoHeight / video.videoWidth) * w)
    if (!w || !h) return null
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, w, h)
    const img = ctx.getImageData(0, 0, w, h)
    return jsqr!(img.data, w, h)?.data ?? null
  }
}

/** Une valeur scannée qui pointe vers CLIP (poste ou instruction) devient un chemin de l'app. */
export function clipPathFromScan(value: string): string | null {
  try {
    const u = new URL(value)
    if (typeof window !== 'undefined' && u.origin !== window.location.origin && !/\/(p|i)\/[0-9a-f-]{20,}/i.test(u.pathname)) return null
    const m = /\/(p|i)\/([0-9a-f-]{20,})/i.exec(u.pathname)
    return m ? `/${m[1]}/${m[2]}` : null
  } catch {
    return null
  }
}
