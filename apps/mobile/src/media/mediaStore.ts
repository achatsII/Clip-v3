import { randomUUID } from 'expo-crypto'
import { Directory, File, Paths } from 'expo-file-system'

import type { CapturedKind, CapturedMedia } from '../bridge/protocol'
import { logError, logEvent } from '../logging/log'
import { localStore } from '../storage/localStore'
import type { MediaRecord } from '../storage/migrations'

/**
 * Les médias capturés vivent dans le dossier Documents de l'app (pas le cache, que le système
 * peut vider sous pression d'espace) jusqu'à ce que la page les libère par `media.discard`.
 */
const MEDIA_DIR = 'clip-media'
const LEFTOVER_AGE_MS = 48 * 60 * 60 * 1000

function mediaDirectory(): Directory {
  const dir = new Directory(Paths.document, MEDIA_DIR)
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true })
  return dir
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export function extensionOf(nameOrUri: string): string | null {
  const clean = nameOrUri.split('?')[0].split('#')[0]
  const match = /\.([a-z0-9]{2,5})$/i.exec(clean)
  return match ? match[1].toLowerCase() : null
}

export function mimeFromName(nameOrUri: string, fallback = 'application/octet-stream'): string {
  const ext = extensionOf(nameOrUri)
  return (ext && MIME_BY_EXT[ext]) || fallback
}

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

const PREFIX: Record<CapturedKind, string> = { photo: 'photo', video: 'video', audio: 'note-vocale', document: 'document' }

export interface RegisterMeta {
  kind: CapturedKind
  mimeType?: string
  fileName?: string
  width?: number
  height?: number
  durationSec?: number
  origin?: 'camera' | 'library' | 'files'
}

/** Déplace un fichier capturé dans le dossier des médias et l'inscrit à l'index. */
export async function registerMedia(sourceUri: string, meta: RegisterMeta): Promise<MediaRecord> {
  const localId = randomUUID()
  const mimeType = meta.mimeType ?? mimeFromName(meta.fileName ?? sourceUri)
  const ext = extensionOf(meta.fileName ?? '') ?? extensionOf(sourceUri) ?? EXT_BY_MIME[mimeType] ?? 'bin'
  const dest = new File(mediaDirectory(), `${localId}.${ext}`)
  const source = new File(sourceUri)
  try {
    await source.move(dest)
  } catch {
    await source.copy(dest)
  }
  const record: MediaRecord = {
    localId,
    kind: meta.kind,
    mimeType,
    fileName: meta.fileName ?? `${PREFIX[meta.kind]}-${stamp()}.${ext}`,
    uri: dest.uri,
    sizeBytes: dest.size ?? 0,
    createdAt: Date.now(),
    ...(meta.width ? { width: meta.width } : {}),
    ...(meta.height ? { height: meta.height } : {}),
    ...(meta.durationSec ? { durationSec: Math.round(meta.durationSec * 10) / 10 } : {}),
    ...(meta.origin ? { origin: meta.origin } : {}),
  }
  await localStore.putMedia(record)
  return record
}

export function toCapturedMedia(record: MediaRecord, thumbnailDataUrl?: string): CapturedMedia {
  return {
    localId: record.localId,
    kind: record.kind,
    mimeType: record.mimeType,
    fileName: record.fileName,
    sizeBytes: record.sizeBytes,
    ...(record.width ? { width: record.width } : {}),
    ...(record.height ? { height: record.height } : {}),
    ...(record.durationSec ? { durationSec: record.durationSec } : {}),
    ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
    ...(record.origin ? { origin: record.origin } : {}),
  }
}

/** Les médias ni envoyés ni libérés depuis `sinceMs`, les plus récents d'abord (fichier présent). */
export function pendingMedia(now = Date.now(), sinceMs = 24 * 60 * 60 * 1000): MediaRecord[] {
  return localStore
    .listMedia()
    .filter((r) => !r.uploadedAt && now - r.createdAt < sinceMs)
    .filter((r) => {
      try {
        return new File(r.uri).exists
      } catch {
        return false
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

/** Le fichier d'un média inscrit, ou `null` s'il a disparu. */
export function mediaFile(localId: string): { record: MediaRecord; file: File } | null {
  const record = localStore.getMedia(localId)
  if (!record) return null
  const file = new File(record.uri)
  return file.exists ? { record, file } : null
}

export async function discardMedia(localIds: string[]): Promise<void> {
  for (const id of localIds) {
    const record = localStore.getMedia(id)
    if (!record) continue
    try {
      const file = new File(record.uri)
      if (file.exists) file.delete()
    } catch (e) {
      logError(e, { action: 'media.discard', localId: id })
    }
  }
  await localStore.removeMedia(localIds)
}

/**
 * Nettoyage au démarrage, sans réseau. On retire ce qui a plus de 48 h ET a déjà été envoyé, et
 * les fichiers orphelins (jamais confiés à la page). Un média inscrit mais jamais envoyé est
 * gardé : il peut être la seule copie d'une capture.
 */
export async function cleanupMedia(now = Date.now()): Promise<{ removed: number; keptUnsynced: number }> {
  let removed = 0
  let keptUnsynced = 0
  const stale: string[] = []
  for (const record of localStore.listMedia()) {
    const file = new File(record.uri)
    if (!file.exists) {
      stale.push(record.localId)
      continue
    }
    if (now - record.createdAt < LEFTOVER_AGE_MS) continue
    if (record.uploadedAt) {
      try {
        file.delete()
        removed += 1
      } catch (e) {
        logError(e, { action: 'media.cleanup', localId: record.localId })
      }
      stale.push(record.localId)
    } else {
      keptUnsynced += 1
    }
  }
  if (stale.length) await localStore.removeMedia(stale)

  try {
    const known = new Set(localStore.listMedia().map((r) => r.uri))
    for (const entry of mediaDirectory().list()) {
      if (!(entry instanceof File) || known.has(entry.uri)) continue
      const modified = entry.modificationTime ?? now
      if (now - modified >= LEFTOVER_AGE_MS) {
        entry.delete()
        removed += 1
      }
    }
  } catch (e) {
    logError(e, { action: 'media.cleanupOrphans' })
  }

  if (removed || keptUnsynced) logEvent('media.cleanup', { removed, keptUnsynced })
  return { removed, keptUnsynced }
}
