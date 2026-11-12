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

/**
 * Relit un document jusqu'à avoir la version annoncée (`at`, son `updatedAt`), un peu plus tard à
 * chaque fois (`waits`, en ms) : juste après un enregistrement, la Gateway peut encore rendre
 * l'ancienne version. Rend la dernière lecture, même si la version n'est jamais venue.
 */
export async function readVersion<D extends { json_data: { updatedAt?: string } }>(
  read: () => Promise<D | null>,
  at: string | undefined,
  waits: number[],
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<D | null> {
  let doc = await read()
  for (const wait of waits) {
    if (!at || !doc || (doc.json_data.updatedAt ?? '') >= at) break
    await sleep(wait)
    doc = await read()
  }
  return doc
}
