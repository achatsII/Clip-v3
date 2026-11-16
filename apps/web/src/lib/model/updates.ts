/**
 * Les mises à jour vues par l'opérateur (toggle `operatorUpdates`). À la publication d'une nouvelle
 * version, la version publique garde ce qui a changé depuis celle d'avant (`Published.changes`) et la
 * version d'avant elle-même (`Published.previous`) : un lien de poste ne lit que `clip_published`,
 * c'est donc là qu'elles vivent. Au poste, l'instruction dit « Mise à jour le … », marque les étapes
 * nouvelles et modifiées, et laisse revoir la version précédente, en lecture.
 *
 * « Déjà vue » se retient sur l'appareil (la tablette du poste, le téléphone de l'opérateur) : une
 * mise à jour se signale jusqu'à ce que l'appareil ait ouvert la nouvelle version ; un appareil qui
 * ne l'a jamais ouverte la voit signalée pendant `FRESH_DAYS` jours après la publication.
 */
import { diffSteps, removedSteps } from './diff'
import type { InstructionContent } from './types'

export const FRESH_DAYS = 14
const DAY = 86_400_000
const KEY = 'clip_seen_versions'

/** Ce qui a changé depuis la version publiée d'avant. */
export interface PublishedChanges {
  from: number
  /** Les étapes nouvelles et modifiées (identifiants) ; les retirées (leurs titres). */
  added: string[]
  modified: string[]
  removed: string[]
  ppe?: boolean
  safety?: boolean
  lockout?: boolean
  /** Pourquoi, en mots de personne : la note de la demande d'approbation. */
  note?: string | null
}

/** La version publiée d'avant, gardée pour la revoir au poste. */
export interface PreviousVersion {
  version: number
  publishedAt: string | null
  content: InstructionContent
}

/** Ce qui a changé entre deux versions publiées ; null si rien qu'un opérateur verrait. */
export function publishedChanges(before: InstructionContent | null | undefined, after: InstructionContent, from: number | null | undefined, note?: string | null): PublishedChanges | null {
  if (!before || !from) return null
  const d = diffSteps(before, after)
  const added = Object.entries(d)
    .filter(([, v]) => v === 'added')
    .map(([id]) => id)
  const modified = Object.entries(d)
    .filter(([, v]) => v === 'modified')
    .map(([id]) => id)
  const removed = removedSteps(before, after).map((s) => s.title)
  const ppe = JSON.stringify(before.ppe ?? []) !== JSON.stringify(after.ppe ?? [])
  const safety = JSON.stringify(before.safety ?? []) !== JSON.stringify(after.safety ?? [])
  const lockout = JSON.stringify(before.lockout ?? null) !== JSON.stringify(after.lockout ?? null)
  if (!added.length && !modified.length && !removed.length && !ppe && !safety && !lockout && before.title === after.title) return null
  return { from, added, modified, removed, ...(ppe ? { ppe } : {}), ...(safety ? { safety } : {}), ...(lockout ? { lockout } : {}), note: note?.trim() || null }
}

function readAll(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown
    return raw && typeof raw === 'object' ? (raw as Record<string, number>) : {}
  } catch {
    return {}
  }
}

/** La dernière version de cette instruction ouverte sur cet appareil. */
export function seenVersion(instructionId: string): number | null {
  const v = readAll()[instructionId]
  return typeof v === 'number' ? v : null
}

/** L'appareil a ouvert cette version (on garde les 300 dernières instructions). */
export function markSeen(instructionId: string, version: number): void {
  try {
    const all = readAll()
    if ((all[instructionId] ?? 0) >= version) return
    delete all[instructionId]
    all[instructionId] = version
    const keys = Object.keys(all)
    for (const k of keys.slice(0, Math.max(0, keys.length - 300))) delete all[k]
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* appareil sans stockage : la mise à jour se signale selon sa date */
  }
}

/** Une mise à jour à signaler sur cet appareil : pas encore ouverte ici, ou récente pour qui ne l'a jamais vue. */
export function isFreshUpdate(p: { version?: number | null; publishedAt?: string | null }, seen: number | null, now = Date.now()): boolean {
  const version = p.version ?? 0
  if (version <= 1) return false
  if (seen !== null) return seen < version
  const at = p.publishedAt ? Date.parse(p.publishedAt) : NaN
  return Number.isFinite(at) && now - at < FRESH_DAYS * DAY
}
