/**
 * Images dans le navigateur : réduction avant l'envoi (mêmes préréglages que la coquille native)
 * et vignettes.
 */
import { CAPTURE_PRESETS } from '@clip/bridge'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image illisible'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality))
}

/**
 * Ramène une photo à 1920 px au plus (JPEG ~0,72). Un format que le navigateur ne sait pas
 * décoder (HEIC sur un poste Windows) est envoyé tel quel : l'IA le lit quand même.
 */
export async function compressImage(file: Blob, maxDimension: number = CAPTURE_PRESETS.photo.maxDimension, quality: number = CAPTURE_PRESETS.photo.jpegQuality): Promise<{ blob: Blob; width?: number; height?: number }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    if (scale === 1 && file.type === 'image/jpeg' && file.size < 900 * 1024) return { blob: file, width: w, height: h }
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return { blob: file }
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
    return { blob: blob && blob.size < file.size ? blob : file, width: w, height: h }
  } catch {
    return { blob: file }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function thumbnailFromImage(src: string, size = 480): Promise<Blob | null> {
  try {
    const img = await loadImage(src)
    const scale = Math.min(1, size / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvasToBlob(canvas, 'image/jpeg', 0.7)
  } catch {
    return null
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',')
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'image/jpeg'
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** Lit les métadonnées d'une vidéo locale et en tire une vignette. */
export function videoInfo(file: Blob): Promise<{ durationSec?: number; width?: number; height?: number; thumbnail?: Blob | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    v.playsInline = true
    let done = false
    const finish = (out: { durationSec?: number; width?: number; height?: number; thumbnail?: Blob | null }) => {
      if (done) return
      done = true
      URL.revokeObjectURL(url)
      resolve(out)
    }
    const timer = setTimeout(() => finish({}), 8000)
    v.onloadedmetadata = () => {
      const durationSec = Number.isFinite(v.duration) ? v.duration : undefined
      v.currentTime = Math.min(1, (durationSec ?? 2) / 3)
      v.onseeked = async () => {
        clearTimeout(timer)
        try {
          const scale = Math.min(1, 480 / Math.max(v.videoWidth, v.videoHeight))
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, Math.round(v.videoWidth * scale))
          canvas.height = Math.max(1, Math.round(v.videoHeight * scale))
          canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height)
          const thumbnail = await canvasToBlob(canvas, 'image/jpeg', 0.7)
          finish({ durationSec, width: v.videoWidth, height: v.videoHeight, thumbnail })
        } catch {
          finish({ durationSec, width: v.videoWidth, height: v.videoHeight })
        }
      }
    }
    v.onerror = () => {
      clearTimeout(timer)
      finish({})
    }
    v.src = url
  })
}

export function audioDuration(file: Blob): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const a = document.createElement('audio')
    a.preload = 'metadata'
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url)
      resolve(undefined)
    }, 5000)
    a.onloadedmetadata = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(a.duration) ? a.duration : undefined)
    }
    a.onerror = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(undefined)
    }
    a.src = url
  })
}

/** Nombre de pages d'un PDF, par lecture rapide de sa structure (approximatif, sans dépendance). */
export async function pdfPageCount(file: Blob): Promise<number | undefined> {
  try {
    const text = new TextDecoder('latin1').decode(await file.arrayBuffer())
    const n = (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length
    return n > 0 ? n : undefined
  } catch {
    return undefined
  }
}
