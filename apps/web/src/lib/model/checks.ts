/**
 * Les relevés d'une étape (toggle `records`) : ce que l'opérateur note pour la trace. Chaque réponse
 * est jugée tout de suite (dans la norme, un écart, ou rien à juger) ; un écart demande une note pour
 * continuer. Ici : lire un nombre tapé (« 4,5 »), juger, savoir si une étape est remplie, et nettoyer
 * ce que l'IA ou l'éditeur propose.
 */
import { uid } from './repo'
import type { Check, CheckKind, CheckOption, ItemState, Step } from './types'

/** Les genres de base. */
export const CHECK_KINDS: CheckKind[] = ['measure', 'yesno', 'choice', 'text', 'photo']
/** Les genres du module Relevés : la liste de vérification, les mesures répétées. */
export const PLUS_KINDS: CheckKind[] = ['checklist', 'measures']
const ALL_KINDS: CheckKind[] = [...CHECK_KINDS, ...PLUS_KINDS]
const ITEM_STATES: ItemState[] = ['ok', 'ko', 'na']

/**
 * measure : un nombre ; yesno : true ou false ; choice : l'id du choix ; text : le texte ; photo :
 * l'adresse (plusieurs photos : leurs adresses) ; measures : les lectures (null tant qu'une manque) ;
 * checklist : l'état de chaque point, par son id.
 */
export type CheckValue = number | boolean | string | null | Array<number | null> | string[] | Record<string, ItemState>

export interface CheckAnswer {
  value: CheckValue
  /** Ce que la personne a fait devant un écart. */
  note?: string
  /** Qui a autorisé l'écart, quand le relevé le demande. */
  authorizedBy?: string
}

/** Les relevés qui vont au poste : ceux que l'auteur a gardés (pas une proposition de l'IA en attente). */
export const liveChecks = (step: Step): Check[] => (step.checks ?? []).filter((c) => !c.proposed)

/** Le contenu tel qu'il part au poste : sans les relevés proposés que l'auteur n'a pas gardés. */
export function withoutProposals<C extends { steps: Step[] }>(c: C): C {
  if (!c.steps.some((s) => s.checks?.some((x) => x.proposed))) return c
  return {
    ...c,
    steps: c.steps.map((s) => {
      if (!s.checks?.some((x) => x.proposed)) return s
      const kept = s.checks.filter((x) => !x.proposed)
      const { checks: _c, ...rest } = s
      return kept.length ? { ...rest, checks: kept } : rest
    }),
  }
}

/** Les relevés que l'IA propose et que l'auteur n'a pas encore gardés ni retirés. */
export const proposedChecks = (steps: Step[]): number => steps.reduce((n, s) => n + (s.checks ?? []).filter((c) => c.proposed).length, 0)

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

/** Les lectures d'une mesure répétée, données : la plus basse, la plus haute, la moyenne. */
export function readingsStats(values: number[]): { low: number; high: number; mean: number } | null {
  if (!values.length) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return { low: Math.min(...values), high: Math.max(...values), mean: Math.round(mean * 10000) / 10000 }
}

const within = (check: Check, v: number) => (typeof check.min !== 'number' || v >= check.min) && (typeof check.max !== 'number' || v <= check.max)

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
      return isNum(value)
    case 'yesno':
      return typeof value === 'boolean'
    case 'choice':
      return typeof value === 'string' && !!check.options?.some((o) => o.id === value)
    case 'text':
      return nonEmpty(value)
    case 'photo':
      return nonEmpty(value) || (Array.isArray(value) && value.some(nonEmpty))
    case 'measures':
      return Array.isArray(value) && value.length >= (check.count ?? 0) && value.length > 0 && value.every(isNum)
    case 'checklist': {
      const v = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, ItemState>) : null
      return !!v && !!check.items?.length && check.items.every((i) => ITEM_STATES.includes(v[i.id]))
    }
  }
}

/** Le relevé a-t-il de quoi juger une réponse (des limites, une bonne réponse, un choix d'écart) ? */
export function judges(check: Check): boolean {
  if (check.kind === 'measure' || check.kind === 'measures') return typeof check.min === 'number' || typeof check.max === 'number'
  if (check.kind === 'checklist') return !!check.items?.length
  if (check.kind === 'yesno') return !!check.expected
  if (check.kind === 'choice') return !!check.options?.some((o) => o.bad)
  return false
}

/** true : dans la norme ; false : un écart ; null : pas de réponse, ou rien à juger. */
export function verdict(check: Check, value: CheckValue | undefined): boolean | null {
  if (!answered(check, value) || !judges(check)) return null
  if (check.kind === 'measure') return within(check, value as number)
  if (check.kind === 'measures') return (value as number[]).every((v) => within(check, v))
  if (check.kind === 'checklist') return !(check.items ?? []).some((i) => (value as Record<string, ItemState>)[i.id] === 'ko')
  if (check.kind === 'yesno') return value === (check.expected === 'yes')
  if (check.kind === 'choice') return !check.options?.find((o) => o.id === value)?.bad
  return null
}

/** Une réponse qui ne laisse pas passer : obligatoire et sans réponse, ou un écart sans note (ni autorisation, quand elle est demandée). */
export function blocks(check: Check, answer: CheckAnswer | undefined): boolean {
  const value = answer?.value ?? null
  if (!answered(check, value)) return !check.optional
  if (verdict(check, value) !== false) return false
  return !answer?.note?.trim() || (!!check.authorize && !answer?.authorizedBy?.trim())
}

/** L'étape est remplie : chaque relevé obligatoire répondu, chaque écart expliqué. */
export function stepComplete(step: Step, answers: Answers): boolean {
  return !liveChecks(step).some((c) => blocks(c, answers[c.id]))
}

/** La première étape, avant `upTo`, qui n'est pas remplie ; -1 s'il n'y en a pas (les propositions de l'IA ne comptent pas). */
export function firstIncomplete(steps: Step[], answers: Answers, upTo = steps.length): number {
  for (let i = 0; i < Math.min(upTo, steps.length); i++) if (!stepComplete(steps[i], answers)) return i
  return -1
}

/** L'instruction a-t-elle au moins un relevé (gardé) ? */
export const hasChecks = (steps: Step[]): boolean => steps.some((s) => liveChecks(s).length > 0)

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
    const kind = ALL_KINDS.includes(x.kind as CheckKind) ? (x.kind as CheckKind) : null
    const label = clean(x.label).slice(0, 80)
    if (!kind || !label) continue
    const check: Check = { id: typeof x.id === 'string' && x.id.trim() ? x.id.trim() : uid('ck_'), kind, label }
    if (kind === 'measure' || kind === 'measures') {
      const unit = clean(x.unit).slice(0, 16)
      if (unit) check.unit = unit
      let min = parseNumber(text(x.min))
      let max = parseNumber(text(x.max))
      if (min !== null && max !== null && min > max) [min, max] = [max, min]
      if (min !== null) check.min = min
      if (max !== null) check.max = max
      const target = parseNumber(text(x.target))
      if (target !== null) check.target = target
      if (kind === 'measures') check.count = Math.min(10, Math.max(2, Math.round(parseNumber(text(x.count)) ?? 3)))
    } else if (kind === 'checklist') {
      const items: Array<{ id: string; label: string }> = []
      for (const o of Array.isArray(x.items) ? x.items : []) {
        const obj = o && typeof o === 'object' ? (o as Record<string, unknown>) : null
        const name = (obj ? clean(obj.label) : clean(o)).slice(0, 80)
        if (!name || items.some((p) => p.label.toLowerCase() === name.toLowerCase())) continue
        items.push({ id: obj && typeof obj.id === 'string' && obj.id ? obj.id : uid('it_'), label: name })
        if (items.length >= 12) break
      }
      if (items.length < 2) continue
      check.items = items
    } else if (kind === 'text') {
      if (x.scan === true) check.scan = true
    } else if (kind === 'photo') {
      const n = Math.round(parseNumber(text(x.photos)) ?? 1)
      if (n >= 2) check.photos = Math.min(6, n)
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
    const how = clean(x.how).slice(0, 160)
    if (how) check.how = how
    if (x.authorize === true && kind !== 'text' && kind !== 'photo') check.authorize = true
    if (x.proposed === true) check.proposed = true
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
  if (kind === 'checklist') check.items = [{ id: uid('it_'), label: '' }, { id: uid('it_'), label: '' }]
  if (kind === 'measures') check.count = 3
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
  if (c.kind === 'checklist') return `${c.label} (liste de vérification : ${(c.items ?? []).map((i) => i.label).join(', ')})`
  if (c.kind === 'measures') {
    const lo = n(c.min)
    const hi = n(c.max)
    return `${c.label} (${c.count ?? 3} mesures${c.unit ? `, ${c.unit}` : ''}${lo && hi ? `, ${lo} à ${hi}` : lo ? `, au moins ${lo}` : hi ? `, au plus ${hi}` : ''})`
  }
  return `${c.label} (${c.kind === 'text' ? 'texte' : 'photo'})`
}
