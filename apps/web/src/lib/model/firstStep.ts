/**
 * Ce par quoi commence chaque instruction générée : un choix du standard de rédaction de l'usine
 * (Réglages › Standard de rédaction, toggle `firstStepChoice`).
 *
 * - `work` : le premier geste du travail. Pas d'étape à part pour les EPI : ils s'affichent avant
 *   de commencer (l'écran « Avant de commencer » du poste, et le PDF), avec les mises en garde.
 * - `safety` : une étape de sécurité, qui rappelle les EPI et les risques.
 * - `custom` : une étape que l'usine décrit (« Vérifier le bon de travail »), toujours en premier.
 *
 * Un standard enregistré avant ce choix n'a que `startWithSafety` : il se lit comme avant, sans
 * migration. Chaque enregistrement garde `startWithSafety` à jour (vrai pour `safety` seulement).
 */
import type { WritingStandard } from './types'

export type FirstStepKind = 'work' | 'safety' | 'custom'
export const FIRST_STEP_KINDS: readonly FirstStepKind[] = ['work', 'safety', 'custom']
/** La longueur d'une première étape décrite par l'usine : une phrase. */
export const FIRST_STEP_MAX = 140

type Source = Pick<WritingStandard, 'startWithSafety'> & Partial<Pick<WritingStandard, 'firstStep' | 'firstStepText'>>

/** La première étape décrite, sur une ligne, sans guillemets qui casseraient la consigne. */
export function cleanFirstStepText(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/["«»“”]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, FIRST_STEP_MAX)
}

/** Le choix d'un standard. « Autre chose » sans texte n'impose rien : c'est le premier geste. */
export function firstStepOf(standard: Source | null | undefined): { kind: FirstStepKind; text: string } {
  if (!standard) return { kind: 'work', text: '' }
  const kind = FIRST_STEP_KINDS.includes(standard.firstStep as FirstStepKind) ? (standard.firstStep as FirstStepKind) : standard.startWithSafety ? 'safety' : 'work'
  if (kind !== 'custom') return { kind, text: '' }
  const text = cleanFirstStepText(standard.firstStepText)
  return text ? { kind, text } : { kind: 'work', text: '' }
}

/**
 * Le standard avec ce choix ; `startWithSafety` suit, pour ce qui le lit encore. La phrase d'« Autre
 * chose » reste gardée quand on change de choix : y revenir la retrouve (elle ne compte qu'avec lui).
 */
export function withFirstStep<S extends Source>(standard: S, kind: FirstStepKind, text?: string | null): S {
  const kept = text === undefined ? standard.firstStepText ?? null : text
  return { ...standard, firstStep: kind, firstStepText: kept === null ? null : kept.slice(0, FIRST_STEP_MAX), startWithSafety: kind === 'safety' }
}
