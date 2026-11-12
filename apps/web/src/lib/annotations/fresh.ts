/**
 * Les marques qui viennent d'arriver (une flèche ajoutée sur un autre appareil, ou par
 * l'assistant) : l'image qui les affiche les fait clignoter un instant, même si elle s'affiche à
 * l'instant (l'éditeur vient d'aller à l'étape changée).
 */
import type { InstructionContent } from '../model/types'

const FRESH_MS = 2500
const fresh = new Map<string, number>()

/** Les marques présentes dans `after` et absentes de `before`. */
export function newAnnotationIds(before: InstructionContent, after: InstructionContent): string[] {
  const old = new Set(before.steps.flatMap((s) => s.media.flatMap((m) => (m.kind === 'image' ? (m.annotations ?? []).map((a) => a.id) : []))))
  return after.steps.flatMap((s) => s.media.flatMap((m) => (m.kind === 'image' ? (m.annotations ?? []).map((a) => a.id).filter((id) => !old.has(id)) : [])))
}

export function markFresh(ids: string[], now = Date.now()) {
  for (const id of ids) fresh.set(id, now)
  // Le registre reste petit : les vieilles entrées s'effacent.
  for (const [id, at] of fresh) if (now - at > FRESH_MS * 4) fresh.delete(id)
}

export function isFresh(id: string, now = Date.now()): boolean {
  const at = fresh.get(id)
  return at !== undefined && now - at < FRESH_MS
}
