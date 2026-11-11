/**
 * Les suggestions de l'assistant d'édition, tirées de l'instruction elle-même : gratuites,
 * immédiates, et propres à ce qu'on a sous les yeux (l'étape regardée d'abord). Après chaque
 * échange, l'assistant en propose aussi d'autres, qui les remplacent.
 */
import type { InstructionContent, Step, WritingStandard } from '../model/types'

const SAFETY = /s[ée]curit|EPI|cadenass|verrouill|protection/i
const VERIFY = /v[ée]rifi|contr[oô]l|tester|essai|valider/i
const NEVER = /\b(ne (?:jamais|pas)|jamais|interdit|danger)/i

function words(s: string): number {
  return s.split(/\s+/).filter(Boolean).length
}

function forStep(step: Step, n: number, maxWords: number): string[] {
  const out: string[] = []
  const images = step.media.filter((m) => m.kind === 'image')
  if (words(step.text) > maxWords) out.push(`Raccourcis l’étape ${n}`)
  if (images.length && images.every((m) => m.kind === 'image' && !m.annotations?.length)) out.push(`Encercle ce qu’il faut regarder à l’étape ${n}`)
  if (!step.media.length) out.push(`Dessine un schéma pour l’étape ${n}`)
  if (!step.warning && NEVER.test(step.text)) out.push(`Ajoute une mise en garde à l’étape ${n}`)
  if (step.media.length >= 2 && !step.layout && step.media.some((m) => m.kind === 'image')) out.push(`Montre à faire / à éviter à l’étape ${n}`)
  if (!step.keyPoints?.length && words(step.text) > 8) out.push(`Ajoute un point clé à l’étape ${n}`)
  return out
}

export function suggestEdits(content: InstructionContent, standard?: Pick<WritingStandard, 'startWithSafety' | 'maxWordsPerStep'> | null, focusStepId?: string | null): string[] {
  const max = standard?.maxWordsPerStep || 25
  const steps = content.steps
  const out: string[] = []
  const focus = focusStepId ? steps.findIndex((s) => s.id === focusStepId) : -1
  if (focus >= 0) out.push(...forStep(steps[focus], focus + 1, max).slice(0, 2))
  if (!steps.length) out.push('Écris les étapes à partir du titre')
  if (steps.length && standard?.startWithSafety && !SAFETY.test(`${steps[0].title} ${steps[0].text}`)) out.push('Commence par une étape de sécurité')
  if (!content.ppe.length) out.push('Indique les EPI à porter')
  steps.forEach((s, i) => i !== focus && out.push(...forStep(s, i + 1, max)))
  if (steps.length >= 3 && !VERIFY.test(steps[steps.length - 1].title)) out.push('Ajoute une vérification à la fin')
  return [...new Set(out)].slice(0, 4)
}
