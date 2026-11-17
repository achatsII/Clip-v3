/**
 * Le dernier style d'annotation choisi à la main (outil, couleur, grosseur…), retenu sur l'appareil.
 * L'annotateur l'écrit ; les repères posés par l'IA en lisent la grosseur (`autoMarkSize`).
 */
import type { AnnotationColor, AnnotationSize, AnnotationType } from '../model/types'
import { readPref } from '../prefs'
import { SIZES } from './model'

export const LAST_STYLE_PREF = 'clip_pref_annot_style'

export type LastStyle = { tool?: AnnotationType; color?: AnnotationColor; size?: AnnotationSize; icon?: string; dashed?: boolean; filled?: boolean }

export function readLastStyle(): LastStyle {
  try {
    const v = JSON.parse(readPref(LAST_STYLE_PREF) ?? '{}') as LastStyle
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

/** La dernière grosseur choisie à la main, si elle est connue. */
export function lastAnnotationSize(): AnnotationSize | null {
  const size = readLastStyle().size
  return size && SIZES.includes(size) ? size : null
}
