import type { CapturedKind } from '../bridge/protocol'

/**
 * L'état local de la coquille, versionné. Les migrations tournent au démarrage, sans réseau,
 * et n'effacent jamais un média qui n'a pas encore été envoyé.
 */
export const CURRENT_SCHEMA_VERSION = 1

/** Un média capturé, gardé dans le dossier de la coquille jusqu'à `media.discard`. */
export interface MediaRecord {
  localId: string
  kind: CapturedKind
  mimeType: string
  fileName: string
  /** Adresse du fichier dans le dossier des médias de la coquille. */
  uri: string
  sizeBytes: number
  /** Millisecondes depuis l'époque. */
  createdAt: number
  /** Présent dès qu'un envoi a réussi (statut 2xx). */
  uploadedAt?: number
  width?: number
  height?: number
  durationSec?: number
  /** Filmé dans CLIP, choisi dans la galerie (original), ou document. */
  origin?: 'camera' | 'library' | 'files'
}

export interface ShellStateV1 {
  schemaVersion: number
  installId: string
  media: Record<string, MediaRecord>
}

/** Les champs inconnus (écrits par une version plus récente) sont gardés tels quels. */
export type ShellState = ShellStateV1 & { [key: string]: unknown }

export type MigrationOutcome =
  | { kind: 'fresh'; state: ShellState }
  | { kind: 'current'; state: ShellState }
  | { kind: 'migrated'; from: number; state: ShellState }
  | { kind: 'newer'; version: number; state: ShellState }
  | { kind: 'corrupt'; raw: string; state: ShellState }

const KINDS: readonly CapturedKind[] = ['photo', 'video', 'audio', 'document']

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function asMediaRecord(v: unknown): MediaRecord | null {
  if (!isRecord(v)) return null
  const { localId, kind, mimeType, fileName, uri, sizeBytes, createdAt } = v
  if (typeof localId !== 'string' || !localId) return null
  if (typeof uri !== 'string' || !uri) return null
  if (typeof kind !== 'string' || !KINDS.includes(kind as CapturedKind)) return null
  const rec: MediaRecord = {
    localId,
    kind: kind as CapturedKind,
    mimeType: typeof mimeType === 'string' ? mimeType : 'application/octet-stream',
    fileName: typeof fileName === 'string' && fileName ? fileName : localId,
    uri,
    sizeBytes: typeof sizeBytes === 'number' && sizeBytes >= 0 ? sizeBytes : 0,
    createdAt: typeof createdAt === 'number' ? createdAt : 0,
  }
  if (typeof v.uploadedAt === 'number') rec.uploadedAt = v.uploadedAt
  if (typeof v.width === 'number') rec.width = v.width
  if (typeof v.height === 'number') rec.height = v.height
  if (typeof v.durationSec === 'number') rec.durationSec = v.durationSec
  if (v.origin === 'camera' || v.origin === 'library' || v.origin === 'files') rec.origin = v.origin
  return rec
}

/** Lit une table de médias (objet indexé ou ancienne liste), sans perdre une entrée utilisable. */
function readMedia(raw: unknown): Record<string, MediaRecord> {
  const out: Record<string, MediaRecord> = {}
  const entries = Array.isArray(raw) ? raw : isRecord(raw) ? Object.values(raw) : []
  for (const entry of entries) {
    const rec = asMediaRecord(entry)
    if (rec) out[rec.localId] = rec
  }
  return out
}

export function freshState(makeId: () => string): ShellState {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, installId: makeId(), media: {} }
}

/**
 * - rien d'écrit : état neuf ;
 * - version 0 (état écrit sans `schemaVersion` par les premières builds) : migré, identifiant
 *   d'installation et médias gardés ;
 * - version courante : relue telle quelle ;
 * - version plus récente (retour à une ancienne coquille) : champs connus lus, le reste gardé,
 *   le numéro de version n'est pas rabaissé ;
 * - illisible : état neuf, et l'appelant met le texte d'origine de côté (jamais effacé).
 */
export function migrateState(raw: string | null, makeId: () => string): MigrationOutcome {
  if (raw == null || raw === '') return { kind: 'fresh', state: freshState(makeId) }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: 'corrupt', raw, state: freshState(makeId) }
  }
  if (!isRecord(parsed)) return { kind: 'corrupt', raw, state: freshState(makeId) }

  const version = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 0
  const installId = typeof parsed.installId === 'string' && parsed.installId ? parsed.installId : makeId()

  if (version === 0) {
    const { pendingMedia, media, ...rest } = parsed
    return {
      kind: 'migrated',
      from: 0,
      state: {
        ...rest,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        installId,
        media: { ...readMedia(pendingMedia), ...readMedia(media) },
      },
    }
  }

  const state: ShellState = { ...parsed, schemaVersion: version, installId, media: readMedia(parsed.media) }
  if (version > CURRENT_SCHEMA_VERSION) return { kind: 'newer', version, state }
  return { kind: 'current', state }
}
