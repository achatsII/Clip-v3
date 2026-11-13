/**
 * Les sections d'une instruction : des phases (« Démontage », « Nettoyage », « Remontage ») qui
 * aident à se repérer dans une longue instruction. Chaque étape porte le nom de sa section
 * (`Step.section`) ; une section, ce sont les étapes qui se suivent sous le même nom. Rien d'autre à
 * tenir à jour : on traduit, on déplace, on copie une étape comme le reste.
 */
import type { Step } from './types'

export interface SectionGroup {
  /** Le nom, ou null pour des étapes sans section. */
  name: string | null
  /** Les étapes [start, end). */
  start: number
  end: number
}

const nameOf = (s: Step): string | null => s.section?.trim() || null

/** Les sections, dans l'ordre des étapes. */
export function sectionGroups(steps: Step[]): SectionGroup[] {
  const groups: SectionGroup[] = []
  steps.forEach((s, i) => {
    const name = nameOf(s)
    const last = groups[groups.length - 1]
    if (last && last.name === name) last.end = i + 1
    else groups.push({ name, start: i, end: i + 1 })
  })
  return groups
}

/** L'instruction a-t-elle des sections ? */
export const hasSections = (steps: Step[]): boolean => steps.some((s) => !!nameOf(s))

/** La section d'une étape. */
export function sectionAt(steps: Step[], index: number): SectionGroup | undefined {
  return sectionGroups(steps).find((g) => index >= g.start && index < g.end)
}

/** L'étape ouvre-t-elle une section (son nom s'affiche au-dessus) ? */
export function startsSection(steps: Step[], index: number): boolean {
  const name = nameOf(steps[index] ?? ({} as Step))
  return !!name && (index === 0 || nameOf(steps[index - 1]) !== name)
}

function withSection(s: Step, name: string | undefined): Step {
  const { section: _old, ...rest } = s
  return name === undefined ? rest : { ...rest, section: name }
}

/**
 * Donne un nom aux étapes [start, end) : l'éditeur retient la plage au début de la saisie, pour
 * qu'un nom effacé le temps d'en taper un autre ne fusionne pas deux sections.
 */
export function setSectionRange(steps: Step[], start: number, end: number, name: string | undefined): Step[] {
  return steps.map((s, i) => (i >= start && i < end ? withSection(s, name) : s))
}

/** Une nouvelle section à partir de cette étape : elle et les suivantes de sa section. */
export function startSection(steps: Step[], index: number, name: string): Step[] {
  const g = sectionAt(steps, index)
  if (!g) return steps
  return setSectionRange(steps, index, g.end, name)
}

/** Retire la section de l'étape : ses étapes rejoignent la section d'avant, ou n'en ont plus. */
export function removeSection(steps: Step[], index: number): Step[] {
  const groups = sectionGroups(steps)
  const at = groups.findIndex((g) => index >= g.start && index < g.end)
  if (at < 0) return steps
  return setSectionRange(steps, groups[at].start, groups[at].end, groups[at - 1]?.name ?? undefined)
}

/** Un nom de section vidé à la fin de la saisie : ses étapes rejoignent la section d'avant. */
export function settleSection(steps: Step[], start: number, end: number): Step[] {
  if (steps.slice(start, end).some((s) => !!nameOf(s))) return steps
  const before = start > 0 ? nameOf(steps[start - 1]) : null
  return setSectionRange(steps, start, end, before ?? undefined)
}

/**
 * Déplace une étape d'un cran : les sections restent à leur place, l'étape prend celle de la
 * position où elle arrive (comme une diapositive qu'on glisse dans la section d'à côté).
 */
export function moveStep(steps: Step[], index: number, dir: -1 | 1): Step[] {
  const j = index + dir
  if (j < 0 || j >= steps.length) return steps
  const next = [...steps]
  next[index] = withSection(steps[j], steps[index].section)
  next[j] = withSection(steps[index], steps[j].section)
  return next
}

/** Une étape ajoutée après une autre reste dans sa section. */
export function inheritSection(step: Step, after: Step | undefined): Step {
  const name = after ? nameOf(after) : null
  return name ? { ...step, section: name } : step
}

/** Les sections que l'IA a données : une section unique ne sert à rien ; les noms sont nettoyés. */
export function cleanSections(steps: Step[]): Step[] {
  const cleaned = steps.map((s) => {
    const name = s.section?.replace(/\s+/g, ' ').trim().slice(0, 40)
    return withSection(s, name || undefined)
  })
  const names = new Set(cleaned.map(nameOf).filter(Boolean))
  return names.size < 2 ? cleaned.map((s) => withSection(s, undefined)) : cleaned
}
