/**
 * Annuler et rétablir, pendant une séance de modification. Chaque modification garde l'état d'avant ;
 * les frappes rapprochées dans un même champ forment un seul pas (on n'annule pas lettre par lettre),
 * et un passage de l'assistant est un seul pas, quel que soit le nombre de ses changements.
 * Ce qui doit survivre à la fermeture de l'app passe par les points de retour (`checkpoints.ts`).
 */
import type { InstructionContent } from '../model/types'

export interface UndoOptions {
  /** Au plus tant de pas gardés ; les plus vieux tombent. */
  limit?: number
  /** Deux modifications du même champ à moins de ce délai forment un seul pas… */
  mergeMs?: number
  /** …tant que le pas ne dure pas plus que ceci. */
  groupMs?: number
}

export class UndoStack<T> {
  private past: T[] = []
  private future: T[] = []
  private lastAt = 0
  private groupStart = 0
  private lastKey: string | null = null
  private batching = false
  private readonly limit: number
  private readonly mergeMs: number
  private readonly groupMs: number

  constructor(opts: UndoOptions = {}) {
    this.limit = opts.limit ?? 100
    this.mergeMs = opts.mergeMs ?? 1200
    this.groupMs = opts.groupMs ?? 4000
  }

  get canUndo(): boolean {
    return this.past.length > 0 && !this.batching
  }

  get canRedo(): boolean {
    return this.future.length > 0 && !this.batching
  }

  get busy(): boolean {
    return this.batching
  }

  private push(before: T) {
    if (this.past[this.past.length - 1] === before) return
    this.past.push(before)
    if (this.past.length > this.limit) this.past.shift()
  }

  /**
   * Une modification : `before` est l'état d'avant, `key` ce qui change (le même champ continue le
   * même pas). Rend vrai si un nouveau pas commence.
   */
  record(before: T, key: string, now = Date.now()): boolean {
    if (this.batching) return false
    const merge = key === this.lastKey && now - this.lastAt < this.mergeMs && now - this.groupStart < this.groupMs
    this.lastAt = now
    this.future = []
    if (merge) return false
    this.lastKey = key
    this.groupStart = now
    this.push(before)
    return true
  }

  /** Un pas posé d'un coup (un retour à une autre version) : l'état d'avant, sans regroupement. */
  checkpoint(before: T) {
    this.push(before)
    this.future = []
    this.lastKey = null
  }

  /** Un long changement en plusieurs temps (l'assistant) : un seul pas, jusqu'à `end`. */
  begin(before: T) {
    this.checkpoint(before)
    this.batching = true
  }

  end() {
    this.batching = false
    this.lastKey = null
    this.lastAt = 0
  }

  /** L'état d'avant, ou rien s'il n'y en a pas ; `current` passe dans « rétablir ». */
  undo(current: T): T | null {
    if (this.batching) return null
    const prev = this.past.pop()
    if (prev === undefined) return null
    this.future.push(current)
    this.lastKey = null
    return prev
  }

  redo(current: T): T | null {
    if (this.batching) return null
    const next = this.future.pop()
    if (next === undefined) return null
    this.past.push(current)
    this.lastKey = null
    return next
  }

  /** Le brouillon a changé ailleurs (un autre appareil) : les pas d'ici ne s'y appliquent plus. */
  reset() {
    this.past = []
    this.future = []
    this.lastKey = null
    this.batching = false
  }
}

/**
 * Ce qui change entre deux états, pour regrouper les frappes : les étapes touchées et les champs de
 * l'instruction. Une étape ajoutée, retirée ou déplacée est toujours un pas à part.
 */
export function changeKey(a: InstructionContent, b: InstructionContent): string {
  if (a.steps.length !== b.steps.length) return 'steps'
  const keys: string[] = []
  for (let i = 0; i < a.steps.length; i++) {
    if (a.steps[i].id !== b.steps[i].id) return 'steps'
    if (a.steps[i] !== b.steps[i]) keys.push(a.steps[i].id)
  }
  for (const k of Object.keys(b) as Array<keyof InstructionContent>) if (k !== 'steps' && a[k] !== b[k]) keys.push(k)
  return keys.join(',')
}
