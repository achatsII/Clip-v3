/**
 * Ce qui a changé entre deux contenus : sert à l'approbateur (étapes surlignées) et au résumé
 * d'une version, sans appel d'IA.
 */
import type { InstructionContent, Step } from './types'

export type StepChange = 'added' | 'removed' | 'modified' | 'same'

function stepSignature(s: Step): string {
  return JSON.stringify({
    t: s.title,
    x: s.text,
    k: s.keyPoints ?? [],
    w: s.warning ?? null,
    m: s.media.map((m) => (m.kind === 'video' ? `${m.url}#${m.start}-${m.end}` : m.kind === 'image' ? `${m.url}:${(m.annotations ?? []).length}` : `${m.url}:${m.page ?? ''}`)),
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

export function summarizeChanges(before: InstructionContent | null, after: InstructionContent): string {
  if (!before) return 'Première version.'
  const d = diffSteps(before, after)
  const added = Object.values(d).filter((v) => v === 'added').length
  const modified = Object.values(d).filter((v) => v === 'modified').length
  const removed = removedSteps(before, after).length
  const parts: string[] = []
  if (before.title !== after.title) parts.push('titre modifié')
  if (modified) parts.push(`${modified} étape${modified > 1 ? 's' : ''} modifiée${modified > 1 ? 's' : ''}`)
  if (added) parts.push(`${added} étape${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''}`)
  if (removed) parts.push(`${removed} étape${removed > 1 ? 's' : ''} retirée${removed > 1 ? 's' : ''}`)
  if (JSON.stringify(before.ppe) !== JSON.stringify(after.ppe)) parts.push('EPI modifiés')
  if (JSON.stringify(before.safety) !== JSON.stringify(after.safety)) parts.push('mises en garde modifiées')
  if (JSON.stringify(before.lockout ?? null) !== JSON.stringify(after.lockout ?? null)) parts.push('points de cadenassage modifiés')
  if (!parts.length) return 'Mise en forme.'
  const text = parts.join(', ')
  return text.charAt(0).toUpperCase() + text.slice(1) + '.'
}
