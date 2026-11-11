import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { File } from 'expo-file-system'
import * as VideoThumbnails from 'expo-video-thumbnails'

import { CAPTURE_PRESETS } from '../bridge/protocol'
import { logError } from '../logging/log'

const THUMB_WIDTH = 240

/** Ramène une photo à `CAPTURE_PRESETS.photo` (côté long ≤ 1920 px, JPEG ~0,72). */
export async function compressPhoto(
  uri: string,
  width: number,
  height: number,
): Promise<{ uri: string; width: number; height: number }> {
  const { maxDimension, jpegQuality } = CAPTURE_PRESETS.photo
  const ctx = ImageManipulator.manipulate(uri)
  if (Math.max(width, height) > maxDimension) {
    ctx.resize(width >= height ? { width: maxDimension } : { height: maxDimension })
  }
  const ref = await ctx.renderAsync()
  const saved = await ref.saveAsync({ compress: jpegQuality, format: SaveFormat.JPEG })
  return { uri: saved.uri, width: saved.width, height: saved.height }
}

/** Petite vignette JPEG en data URL, pour l'affichage immédiat dans la page. */
export async function thumbnailDataUrl(uri: string): Promise<string | undefined> {
  try {
    const ctx = ImageManipulator.manipulate(uri)
    ctx.resize({ width: THUMB_WIDTH })
    const ref = await ctx.renderAsync()
    const saved = await ref.saveAsync({ compress: 0.5, format: SaveFormat.JPEG, base64: true })
    try {
      new File(saved.uri).delete()
    } catch {
      // vignette temporaire : sa suppression n'est pas critique
    }
    return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : undefined
  } catch (e) {
    logError(e, { action: 'thumbnail.photo' })
    return undefined
  }
}

/**
 * Vignette et dimensions d'une vidéo. L'image est prise à une seconde (les premières images d'une
 * vidéo de téléphone sont souvent noires, le temps que l'exposition se règle), au début pour une
 * vidéo très courte.
 */
export async function videoPreview(uri: string, durationSec?: number): Promise<{ thumbnail?: string; width?: number; height?: number }> {
  const at = durationSec !== undefined && durationSec < 2 ? 0 : 1000
  try {
    const frame = await VideoThumbnails.getThumbnailAsync(uri, { time: at, quality: 0.6 }).catch(() =>
      VideoThumbnails.getThumbnailAsync(uri, { time: 0, quality: 0.6 }),
    )
    const thumbnail = await thumbnailDataUrl(frame.uri)
    try {
      new File(frame.uri).delete()
    } catch {
      // image temporaire
    }
    return { thumbnail, width: frame.width, height: frame.height }
  } catch (e) {
    logError(e, { action: 'thumbnail.video' })
    return {}
  }
}
