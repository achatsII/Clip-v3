/**
 * D'un fichier (navigateur) ou d'un média capturé par la coquille native à une source enregistrée :
 * réduction, envoi, vignette, transcription des notes vocales, conversion Word → PDF,
 * optimisation des vidéos trop lourdes.
 */
import type { CapturedMedia } from '@clip/bridge'
import { callNative, onNativeEvent } from '../bridge/native'
import { GATEWAY_URL } from '../config'
import { getAccessToken } from '../gateway/client'
import type { FilesApi } from '../gateway/files'
import { uid } from '../model/repo'
import type { Source, SourceKind } from '../model/types'
import { audioDuration, compressImage, dataUrlToBlob, pdfPageCount, videoInfo } from './image'

export type IngestStage = 'prepare' | 'upload' | 'optimize' | 'transcribe' | 'convert'
export type IngestProgress = (stage: IngestStage, ratio?: number) => void

const WORD = /\.(docx?|odt)$/i
/** Au-delà, une vidéo du navigateur est réduite en 720p par la Gateway avant d'aller à l'IA. */
const VIDEO_OPTIMIZE_BYTES = 60 * 1024 * 1024

export function kindOfFile(file: { type: string; name: string }): SourceKind | null {
  if (file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name)) return 'photo'
  if (file.type.startsWith('video/') || /\.(mov|mp4|m4v|webm)$/i.test(file.name)) return 'video'
  if (file.type.startsWith('audio/') || /\.(m4a|mp3|wav|aac|ogg)$/i.test(file.name)) return 'audio'
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name) || WORD.test(file.name)) return 'document'
  return null
}

export const ACCEPTED_FILES = 'image/*,video/*,audio/*,application/pdf,.pdf,.doc,.docx,.odt,.heic,.mov'

export async function ingestFile(file: File, files: FilesApi, onProgress?: IngestProgress, capturedOn: Source['capturedOn'] = 'web'): Promise<Source> {
  const kind = kindOfFile(file)
  if (!kind) throw new Error('Ce type de fichier n’est pas pris en charge.')
  const base: Source = { id: uid('src_'), kind, name: file.name, createdAt: new Date().toISOString(), capturedOn }
  const up = (r: number) => onProgress?.('upload', r)
  onProgress?.('prepare')

  if (kind === 'photo') {
    const { blob, width, height } = await compressImage(file)
    const name = file.name.replace(/\.(heic|heif|png|webp)$/i, blob.type === 'image/jpeg' ? '.jpg' : '$&')
    const u = await files.upload(blob, name, 'captures', (s, t) => up(s / t))
    return { ...base, name, url: u.url, path: u.path, mimeType: u.mimeType, sizeBytes: u.sizeBytes, width, height, thumbnailUrl: u.url }
  }

  if (kind === 'video') {
    const info = await videoInfo(file)
    const u = await files.upload(file, file.name, 'captures', (s, t) => up(s / t))
    let src: Source = { ...base, url: u.url, path: u.path, mimeType: u.mimeType || 'video/mp4', sizeBytes: u.sizeBytes, durationSec: info.durationSec, width: info.width, height: info.height }
    if (info.thumbnail) {
      const t = await files.upload(info.thumbnail, `${file.name}.jpg`, 'thumbs').catch(() => null)
      if (t) src.thumbnailUrl = t.url
    }
    const tooBig = (u.sizeBytes ?? 0) > VIDEO_OPTIMIZE_BYTES || Math.max(info.width ?? 0, info.height ?? 0) > 1920 || !/mp4|quicktime/.test(src.mimeType ?? '')
    if (tooBig) {
      onProgress?.('optimize')
      try {
        const p = await files.processVideo(u.url)
        src = { ...src, url: p.url, mimeType: 'video/mp4', sizeBytes: p.sizeBytes ?? src.sizeBytes, durationSec: src.durationSec ?? p.durationSec ?? undefined, path: undefined }
      } catch {
        /* la vidéo d'origine reste utilisable si elle passe sous 100 Mo */
      }
    }
    return src
  }

  if (kind === 'audio') {
    const durationSec = await audioDuration(file)
    const u = await files.upload(file, file.name, 'captures', (s, t) => up(s / t))
    onProgress?.('transcribe')
    const text = await files.transcribe(file, file.name).catch(() => '')
    return { ...base, url: u.url, path: u.path, mimeType: u.mimeType, sizeBytes: u.sizeBytes, durationSec, text: text || undefined }
  }

  // Document : un Word devient un PDF (l'IA et l'aperçu lisent le PDF).
  let pdf: Blob = file
  let name = file.name
  if (WORD.test(file.name)) {
    onProgress?.('convert')
    pdf = await files.convertToPdf(file, file.name)
    name = file.name.replace(WORD, '.pdf')
  }
  const pageCount = await pdfPageCount(pdf)
  const u = await files.upload(new Blob([pdf], { type: 'application/pdf' }), name, 'documents', (s, t) => up(s / t))
  return { ...base, name, originalName: file.name, url: u.url, path: u.path, mimeType: 'application/pdf', sizeBytes: u.sizeBytes, pageCount }
}

/** Envoie un média capturé par la coquille native (le fichier ne transite pas par la page). */
export async function ingestNative(item: CapturedMedia, files: FilesApi, onProgress?: IngestProgress, platform: Source['capturedOn'] = 'ios'): Promise<Source> {
  const kind: SourceKind = item.kind === 'document' ? 'document' : item.kind
  const base: Source = {
    id: uid('src_'),
    kind,
    name: item.fileName,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    width: item.width,
    height: item.height,
    durationSec: item.durationSec,
    createdAt: new Date().toISOString(),
    capturedOn: platform,
  }
  const folder = kind === 'document' ? 'documents' : 'captures'
  const target = await files.presign(item.fileName, item.mimeType, folder)
  const off = onNativeEvent((e) => {
    if (e.type === 'upload.progress' && e.localId === item.localId && e.totalBytes > 0) onProgress?.('upload', e.sentBytes / e.totalBytes)
  })
  try {
    onProgress?.('upload', 0)
    const r = await callNative('upload.put', { localId: item.localId, url: target.uploadUrl, headers: { 'Content-Type': item.mimeType } })
    if (r.status < 200 || r.status >= 300) throw new Error('L’envoi a été refusé')
  } finally {
    off()
  }
  let src: Source = { ...base, url: target.publicUrl, path: target.path }
  if (kind === 'photo') src.thumbnailUrl = target.publicUrl
  // Une vidéo de galerie Android n'est pas réencodée par le téléphone : la Gateway la ramène en 720p.
  if (kind === 'video' && (item.sizeBytes > VIDEO_OPTIMIZE_BYTES || Math.max(item.width ?? 0, item.height ?? 0) > 1920)) {
    onProgress?.('optimize')
    try {
      const p = await files.processVideo(target.publicUrl)
      src = { ...src, url: p.url, mimeType: 'video/mp4', sizeBytes: p.sizeBytes ?? src.sizeBytes, durationSec: src.durationSec ?? p.durationSec ?? undefined, path: undefined }
    } catch {
      /* l'original reste utilisable s'il passe sous 100 Mo */
    }
  }
  if (item.thumbnailDataUrl && kind === 'video') {
    const t = await files.upload(dataUrlToBlob(item.thumbnailDataUrl), `${item.fileName}.jpg`, 'thumbs').catch(() => null)
    if (t) src.thumbnailUrl = t.url
  }
  if (kind === 'audio') {
    onProgress?.('transcribe')
    try {
      const token = getAccessToken()
      const res = await callNative('upload.multipart', {
        localId: item.localId,
        url: `${GATEWAY_URL}/api/v1/files/audio/transcribe`,
        fieldName: 'file',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const text = (JSON.parse(res.bodyText) as { text?: string }).text?.trim()
      if (text) src = { ...src, text }
    } catch {
      /* la note vocale reste utilisable par l'IA sans transcription */
    }
  }
  void callNative('media.discard', { localIds: [item.localId] }).catch(() => undefined)
  return src
}
