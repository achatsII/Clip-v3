/**
 * Les médias d'une étape : leur disposition et ce qu'on en dit. Partagé par le lecteur, l'éditeur,
 * la vue document, le PDF et l'assistant d'édition.
 */
import type { MediaVerdict, Step, StepLayout, StepMedia } from './types'

/** La disposition affichée : on ne compare ni ne met en grille un média seul. */
export function layoutOf(step: Pick<Step, 'layout' | 'media'>): StepLayout {
  if (!step.layout || step.media.length < 2) return 'focus'
  return step.layout
}

export const LAYOUTS: Array<{ value: StepLayout; label: string; hint: string }> = [
  { value: 'focus', label: 'Un à la fois', hint: 'Un grand média, les autres au choix' },
  { value: 'compare', label: 'À faire / À éviter', hint: 'Deux médias côte à côte' },
  { value: 'grid', label: 'Grille', hint: 'Tous les médias en même temps' },
]

export const VERDICTS: Record<MediaVerdict, { label: string; mark: string }> = {
  do: { label: 'À faire', mark: '✓' },
  dont: { label: 'À éviter', mark: '✕' },
}

/** Le nom court d'un média, pour une puce ou une liste. */
export function mediaLabel(m: StepMedia): string {
  if (m.kind === 'video') return 'Extrait'
  if (m.kind === 'document') return `Page ${m.page ?? 1}`
  if (m.kind === 'html') return 'Schéma'
  if (m.frame) return 'Image'
  return m.generated ? 'Illustration' : 'Photo'
}

/** Un schéma HTML trop lourd ne voyage pas avec l'instruction. */
export const MAX_HTML_BYTES = 300_000
