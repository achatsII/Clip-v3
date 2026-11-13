/**
 * Ce qui a changé entre deux contenus : sert à l'approbateur (étapes surlignées) et au résumé
 * d'une version, sans appel d'IA.
 */
import { messages } from '../i18n'
import type { InstructionContent, Step } from './types'

export type StepChange = 'added' | 'removed' | 'modified' | 'same'

function stepSignature(s: Step): string {
  return JSON.stringify({
    t: s.title,
    x: s.text,
    k: s.keyPoints ?? [],
    w: s.warning ?? null,
    l: s.layout ?? 'focus',
    m: s.media.map((m) => `${m.kind === 'video' ? `${m.url}#${m.start}-${m.end}` : m.kind === 'image' ? `${m.url}:${(m.annotations ?? []).length}` : m.kind === 'html' ? `html:${m.html.length}:${m.html.slice(0, 64)}` : `${m.url}:${m.page ?? ''}`}|${m.verdict ?? ''}|${m.caption ?? ''}`),
  })
}

export function diffSteps(before: InstructionContent | null, after: InstructionContent): Record<string, StepChange> & { __removed?: never } {
  const out: Record<string, StepChange> = {}
  const prev = new Map((before?.steps ?? []).map((s) => [s.id, s]))
  for (const s of after.steps) {
    const old = prev.get(s.id)
    out[s.id] = !old ? 'added' : stepSignature(old) === stepSignature(s) ? 'same' : 'modified'
  }
  return out
}

export function removedSteps(before: InstructionContent | null, after: InstructionContent): Step[] {
  const ids = new Set(after.steps.map((s) => s.id))
  return (before?.steps ?? []).filter((s) => !ids.has(s.id))
}

/** Le résumé d'une version, écrit à la publication dans la langue de l'outil de qui publie. */
export function summarizeChanges(before: InstructionContent | null, after: InstructionContent): string {
  const t = messages().instructions.changes
  if (!before) return t.first
  const d = diffSteps(before, after)
  const added = Object.values(d).filter((v) => v === 'added').length
  const modified = Object.values(d).filter((v) => v === 'modified').length
  const removed = removedSteps(before, after).length
  const parts: string[] = []
  if (before.title !== after.title) parts.push(t.title)
  if (modified) parts.push(t.edited(modified))
  if (added) parts.push(t.added(added))
  if (removed) parts.push(t.removed(removed))
  if (JSON.stringify(before.ppe) !== JSON.stringify(after.ppe)) parts.push(t.ppe)
  if (JSON.stringify(before.safety) !== JSON.stringify(after.safety)) parts.push(t.safety)
  if (JSON.stringify(before.lockout ?? null) !== JSON.stringify(after.lockout ?? null)) parts.push(t.lockout)
  if (JSON.stringify(before.quiz ?? []) !== JSON.stringify(after.quiz ?? [])) parts.push(t.quiz)
  if (!parts.length) return t.formatting
  return t.sentence(parts)
}
