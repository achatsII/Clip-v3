/**
 * L'édition en direct entre appareils : ce qu'un appareil annonce après avoir enregistré un
 * brouillon, et ce qu'en fait l'éditeur ouvert ailleurs sur la même instruction. Fonctions pures.
 *
 * La règle de sûreté : un éditeur qui a des changements pas encore enregistrés ne reprend jamais
 * le brouillon reçu ; il le dit, et la personne choisit.
 */
import type { InstructionContent } from '../model/types'

/** Les étapes nouvelles ou modifiées entre deux contenus, dans l'ordre du nouveau. */
export function changedSteps(before: InstructionContent | null, after: InstructionContent): string[] {
  const old = new Map((before?.steps ?? []).map((s) => [s.id, JSON.stringify(s)]))
  return after.steps.filter((s) => old.get(s.id) !== JSON.stringify(s)).map((s) => s.id)
}

/** Que faire d'un brouillon reçu : le reprendre, ou le signaler parce qu'on modifie ici aussi. */
export function remoteDraftAction(localPending: boolean): 'apply' | 'conflict' {
  return localPending ? 'conflict' : 'apply'
}

/** L'étape où aller : la première étape changée qui existe dans le brouillon reçu. */
export function followStep(changed: string[] | undefined, content: InstructionContent): string | null {
  const ids = new Set(content.steps.map((s) => s.id))
  return (changed ?? []).find((id) => ids.has(id)) ?? null
}
