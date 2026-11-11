import type { CapturedMedia } from '../bridge/protocol'
import { compressPhoto, thumbnailDataUrl, videoPreview } from './images'
import { mimeFromName, registerMedia, toCapturedMedia } from './mediaStore'
import { localStore } from '../storage/localStore'

/** Photo prise ou choisie : réduite, inscrite, avec sa vignette. */
export async function finalizePhoto(rawUri: string, width: number, height: number): Promise<CapturedMedia> {
  const small = await compressPhoto(rawUri, width, height)
  const record = await registerMedia(small.uri, {
    kind: 'photo',
    mimeType: 'image/jpeg',
    width: small.width,
    height: small.height,
  })
  return toCapturedMedia(record, await thumbnailDataUrl(record.uri))
}

/** Vidéo filmée ou choisie : inscrite telle quelle (déjà en 720p), avec vignette et dimensions. */
export async function finalizeVideo(
  rawUri: string,
  durationSec: number | undefined,
  fileName?: string,
): Promise<CapturedMedia> {
  const record = await registerMedia(rawUri, {
    kind: 'video',
    mimeType: mimeFromName(fileName ?? rawUri, 'video/mp4'),
    fileName,
    durationSec,
  })
  const preview = await videoPreview(record.uri, durationSec)
  if (preview.width && preview.height) {
    await localStore.patchMedia(record.localId, { width: preview.width, height: preview.height })
  }
  return toCapturedMedia(localStore.getMedia(record.localId) ?? record, preview.thumbnail)
}

/** Note vocale : AAC mono dans un conteneur MPEG-4 (.m4a). */
export async function finalizeAudio(rawUri: string, durationSec: number | undefined): Promise<CapturedMedia> {
  const record = await registerMedia(rawUri, { kind: 'audio', mimeType: 'audio/mp4', durationSec })
  return toCapturedMedia(record)
}

/** Document choisi (PDF, Word), inscrit sous son nom d'origine. */
export async function finalizeDocument(uri: string, name: string, mimeType?: string | null): Promise<CapturedMedia> {
  const record = await registerMedia(uri, {
    kind: 'document',
    mimeType: mimeType || mimeFromName(name),
    fileName: name,
  })
  return toCapturedMedia(record)
}
