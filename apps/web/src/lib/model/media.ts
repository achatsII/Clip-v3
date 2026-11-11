/**
 * Les médias d'une étape : leur disposition et ce qu'on en dit. Partagé par le lecteur, l'éditeur,
 * la vue document, le PDF et l'assistant d'édition.
 */
import { messages } from '../i18n'
import type { MediaVerdict, Step, StepLayout, StepMedia } from './types'

const words = () => messages().instructions.media

/** La disposition affichée : on ne compare ni ne met en grille un média seul. */
export function layoutOf(step: Pick<Step, 'layout' | 'media'>): StepLayout {
  if (!step.layout || step.media.length < 2) return 'focus'
  return step.layout
}

/** Les dispositions, dans l'ordre ; libellé et indice se lisent au rendu, dans la langue de l'outil. */
export const LAYOUTS: Array<{ value: StepLayout; label: string; hint: string }> = (['focus', 'compare', 'grid'] as const).map((value) => ({
  value,
  get label() {
    return words().layouts[value].label
  },
  get hint() {
    return words().layouts[value].hint
  },
}))

export const VERDICTS: Record<MediaVerdict, { label: string; mark: string }> = {
  do: {
    mark: '✓',
    get label() {
      return words().verdicts.do
    },
  },
  dont: {
    mark: '✕',
    get label() {
      return words().verdicts.dont
    },
  },
}

/** Le nom court d'un média, pour une puce ou une liste, dans la langue de l'outil. */
export function mediaLabel(m: StepMedia): string {
  const t = words()
  if (m.kind === 'video') return t.clip
  if (m.kind === 'document') return t.page(m.page ?? 1)
  if (m.kind === 'html') return t.visual
  if (m.frame) return t.image
  return m.generated ? t.illustration : t.photo
}

/** Un schéma HTML trop lourd ne voyage pas avec l'instruction. */
export const MAX_HTML_BYTES = 300_000
