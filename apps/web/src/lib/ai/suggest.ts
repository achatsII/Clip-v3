/**
 * Les suggestions de l'assistant d'édition, tirées de l'instruction elle-même : gratuites,
 * immédiates, et propres à ce qu'on a sous les yeux (l'étape regardée d'abord). Après chaque
 * échange, l'assistant en propose aussi d'autres, qui les remplacent.
 * Elles s'affichent dans la langue de l'outil ; les mots qu'on cherche dans l'instruction sont
 * ceux de sa langue (`content.language`).
 */
import { messages } from '../i18n'
import type { InstructionContent, Step, WritingStandard } from '../model/types'

/** Ce qu'on cherche dans le texte : sécurité, vérification, interdiction ; le français à défaut. */
const TERMS = {
  fr: {
    safety: /s[ée]curit|EPI|cadenass|verrouill|protection/i,
    verify: /v[ée]rifi|contr[oô]l|tester|essai|valider/i,
    never: /\b(ne (?:jamais|pas)|jamais|interdit|danger)/i,
  },
  en: {
    safety: /safety|\bPPE\b|lock[- ]?out|tag[- ]?out|protecti/i,
    verify: /verif|check|\btest|inspect|confirm|validat/i,
    never: /\b(never|do not|don[’']t|must not|forbidden|danger)/i,
  },
}

type Terms = (typeof TERMS)['fr']

function words(s: string): number {
  return s.split(/\s+/).filter(Boolean).length
}

function forStep(step: Step, n: number, maxWords: number, terms: Terms): string[] {
  const t = messages().editor.suggestions
  const out: string[] = []
  const images = step.media.filter((m) => m.kind === 'image')
  if (words(step.text) > maxWords) out.push(t.shorten(n))
  if (images.length && images.every((m) => m.kind === 'image' && !m.annotations?.length)) out.push(t.circle(n))
  if (!step.media.length) out.push(t.drawVisual(n))
  if (!step.warning && terms.never.test(step.text)) out.push(t.addWarning(n))
  if (step.media.length >= 2 && !step.layout && step.media.some((m) => m.kind === 'image')) out.push(t.doAndAvoid(n))
  if (!step.keyPoints?.length && words(step.text) > 8) out.push(t.addKeyPoint(n))
  return out
}

export function suggestEdits(content: InstructionContent, standard?: Pick<WritingStandard, 'startWithSafety' | 'maxWordsPerStep'> | null, focusStepId?: string | null): string[] {
  const t = messages().editor.suggestions
  const terms = content.language === 'en' ? TERMS.en : TERMS.fr
  const max = standard?.maxWordsPerStep || 25
  const steps = content.steps
  const out: string[] = []
  const focus = focusStepId ? steps.findIndex((s) => s.id === focusStepId) : -1
  if (focus >= 0) out.push(...forStep(steps[focus], focus + 1, max, terms).slice(0, 2))
  if (!steps.length) out.push(t.writeSteps)
  if (steps.length && standard?.startWithSafety && !terms.safety.test(`${steps[0].title} ${steps[0].text}`)) out.push(t.startWithSafety)
  if (!content.ppe.length) out.push(t.listPpe)
  steps.forEach((s, i) => i !== focus && out.push(...forStep(s, i + 1, max, terms)))
  if (steps.length >= 3 && !terms.verify.test(steps[steps.length - 1].title)) out.push(t.addCheck)
  return [...new Set(out)].slice(0, 4)
}
