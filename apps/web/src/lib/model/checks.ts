/**
 * Les relevés d'une étape (toggle `records`) : ce que l'opérateur note pour la trace. Chaque réponse
 * est jugée tout de suite (dans la norme, un écart, ou rien à juger) ; un écart demande une note pour
 * continuer. Ici : lire un nombre tapé (« 4,5 »), juger, savoir si une étape est remplie, et nettoyer
 * ce que l'IA ou l'éditeur propose.
 */
import { uid } from './repo'
import type { Check, CheckKind, CheckOption, Step } from './types'

export const CHECK_KINDS: CheckKind[] = ['measure', 'yesno', 'choice', 'text', 'photo']

/** measure : un nombre ; yesno : true ou false ; choice : l'id du choix ; text : le texte ; photo : l'adresse. */
export type CheckValue = number | boolean | string | null

export interface CheckAnswer {
  value: CheckValue
  /** Ce que la personne a fait devant un écart. */
  note?: string
}

export type Answers = Record<string, CheckAnswer | undefined>

/** Un nombre tapé : « 4,5 », « 4.5 », « -2 », « 1 200 » ; null si ce n'en est pas un. */
export function parseNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw !== 'string') return null
  const s = raw.replace(/[\s  ]/g, '').replace(',', '.')
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** La réponse est-elle donnée ? */
export function answered(check: Check, value: CheckValue | undefined): boolean {
  switch (check.kind) {
    case 'measure':
      return typeof value === 'number' && Number.isFinite(value)
    case 'yesno':
      return typeof value === 'boolean'
    case 'choice':
      return typeof value === 'string' && !!check.options?.some((o) => o.id === value)
    case 'text':
    case 'photo':
      return typeof value === 'string' && value.trim().length > 0
  }
}

/** Le relevé a-t-il de quoi juger une réponse (des limites, une bonne réponse, un choix d'écart) ? */
export function judges(check: Check): boolean {
  if (check.kind === 'measure') return typeof check.min === 'number' || typeof check.max === 'number'
  if (check.kind === 'yesno') return !!check.expected
  if (check.kind === 'choice') return !!check.options?.some((o) => o.bad)
  return false
}

/** true : dans la norme ; false : un écart ; null : pas de réponse, ou rien à juger. */
export function verdict(check: Check, value: CheckValue | undefined): boolean | null {
  if (!answered(check, value) || !judges(check)) return null
  if (check.kind === 'measure') {
    const v = value as number
    return (typeof check.min !== 'number' || v >= check.min) && (typeof check.max !== 'number' || v <= check.max)
  }
  if (check.kind === 'yesno') return value === (check.expected === 'yes')
  if (check.kind === 'choice') return !check.options?.find((o) => o.id === value)?.bad
  return null
}

/** Une réponse qui ne laisse pas passer : obligatoire et sans réponse, ou un écart sans note. */
export function blocks(check: Check, answer: CheckAnswer | undefined): boolean {
  const value = answer?.value ?? null
  if (!answered(check, value)) return !check.optional
  return verdict(check, value) === false && !answer?.note?.trim()
}

/** L'étape est remplie : chaque relevé obligatoire répondu, chaque écart expliqué. */
export function stepComplete(step: Step, answers: Answers): boolean {
  return !(step.checks ?? []).some((c) => blocks(c, answers[c.id]))
}

/** La première étape, avant `upTo`, qui n'est pas remplie ; -1 s'il n'y en a pas. */
export function firstIncomplete(steps: Step[], answers: Answers, upTo = steps.length): number {
  for (let i = 0; i < Math.min(upTo, steps.length); i++) if (!stepComplete(steps[i], answers)) return i
  return -1
}

/** L'instruction a-t-elle au moins un relevé ? */
export const hasChecks = (steps: Step[]): boolean => steps.some((s) => !!s.checks?.length)

const clean = (s: unknown): string => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '')
const text = (s: unknown): string => (typeof s === 'number' && Number.isFinite(s) ? String(s) : clean(s))

/**
 * Ce que l'IA ou l'éditeur propose, rendu sûr : genres connus, libellés courts, nombres lus, limites
 * dans l'ordre, au moins deux choix pour un choix. Les ids donnés sont gardés (une réponse d'hier
 * reste liée à son relevé).
 */
export function cleanChecks(raw: unknown, max = 4): Check[] {
  if (!Array.isArray(raw)) return []
  const out: Check[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const x = r as Record<string, unknown>
    const kind = CHECK_KINDS.includes(x.kind as CheckKind) ? (x.kind as CheckKind) : null
    const label = clean(x.label).slice(0, 80)
    if (!kind || !label) continue
    const check: Check = { id: typeof x.id === 'string' && x.id.trim() ? x.id.trim() : uid('ck_'), kind, label }
    if (kind === 'measure') {
      const unit = clean(x.unit).slice(0, 16)
      if (unit) check.unit = unit
      let min = parseNumber(text(x.min))
      let max = parseNumber(text(x.max))
      if (min !== null && max !== null && min > max) [min, max] = [max, min]
      if (min !== null) check.min = min
      if (max !== null) check.max = max
      const target = parseNumber(text(x.target))
      if (target !== null) check.target = target
    } else if (kind === 'yesno') {
      if (x.expected === 'yes' || x.expected === 'no') check.expected = x.expected
    } else if (kind === 'choice') {
      const badNames = new Set((Array.isArray(x.bad) ? x.bad : []).map((b) => clean(b).toLowerCase()).filter(Boolean))
      const options: CheckOption[] = []
      for (const o of Array.isArray(x.options) ? x.options : []) {
        const obj = o && typeof o === 'object' ? (o as Record<string, unknown>) : null
        const name = (obj ? clean(obj.label) : clean(o)).slice(0, 40)
        if (!name || options.some((p) => p.label.toLowerCase() === name.toLowerCase())) continue
        const bad = obj ? obj.bad === true : badNames.has(name.toLowerCase())
        options.push({ id: obj && typeof obj.id === 'string' && obj.id ? obj.id : uid('op_'), label: name, ...(bad ? { bad: true } : {}) })
        if (options.length >= 6) break
      }
      if (options.length < 2) continue
      check.options = options
    }
    if (x.optional === true) check.optional = true
    out.push(check)
    if (out.length >= max) break
  }
  return out
}

/** Un nouveau relevé vide, du genre choisi (l'éditeur le remplit). */
export function newCheck(kind: CheckKind, label = ''): Check {
  const check: Check = { id: uid('ck_'), kind, label }
  if (kind === 'yesno') check.expected = 'yes'
  if (kind === 'choice') check.options = [{ id: uid('op_'), label: '' }, { id: uid('op_'), label: '' }]
  return check
}

/** Le relevé en une ligne, pour l'assistant d'édition (en français, comme ses consignes). */
export function describeCheck(c: Check): string {
  const n = (v: number | null | undefined) => (typeof v === 'number' ? String(v).replace('.', ',') : null)
  if (c.kind === 'measure') {
    const lo = n(c.min)
    const hi = n(c.max)
    const range = lo && hi ? `${lo} à ${hi}` : lo ? `au moins ${lo}` : hi ? `au plus ${hi}` : 'sans limites'
    return `${c.label} (mesure${c.unit ? `, ${c.unit}` : ''}, ${range}${n(c.target) ? `, visé ${n(c.target)}` : ''})`
  }
  if (c.kind === 'yesno') return `${c.label} (oui ou non${c.expected ? `, attendu ${c.expected === 'yes' ? 'oui' : 'non'}` : ''})`
  if (c.kind === 'choice') return `${c.label} (choix : ${(c.options ?? []).map((o) => (o.bad ? `${o.label} [écart]` : o.label)).join(', ')})`
  return `${c.label} (${c.kind === 'text' ? 'texte' : 'photo'})`
}
