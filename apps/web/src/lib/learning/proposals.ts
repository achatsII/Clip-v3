/**
 * Des règles proposées d'après les corrections (toggle `learnFromEdits`) : quand une même habitude
 * revient dans au moins 3 instructions et la majorité des dernières (raccourcir les textes, retirer
 * des points clés, remplacer un mot…), CLIP propose la règle qui l'éviterait. Sans IA, sans coût :
 * des mesures simples (`signals.ts`). « Analyser avec l'IA » va plus loin, à la demande (`ai/learn.ts`).
 */
import { messages } from '../i18n/core'
import type { EditSignals } from './signals'

/** `ai` : proposée par l'IA (« Analyser avec l'IA »), pas par les mesures. */
export type ProposalKind = 'shorter' | 'longer' | 'fewerKeyPoints' | 'moreKeyPoints' | 'moreWarnings' | 'fewerWarnings' | 'splitSteps' | 'mergeSteps' | 'shorterTitles' | 'term' | 'ai'

export interface Proposal {
  /** Stable : une proposition répondue (oui ou non) ne revient pas. */
  key: string
  kind: ProposalKind
  /** Ce que CLIP a remarqué (« Vous raccourcissez les textes de l'IA »). */
  seen: string
  /** Dans combien d'instructions, sur combien. */
  count: number
  of: number
  /** La règle, telle qu'elle s'écrit dans un standard. */
  rule: string
  /** Pour le standard de l'usine : le nombre de mots par étape (`shorter`), ou un terme du vocabulaire (`term`). */
  maxWords?: number
  term?: { term: string; meaning: string }
}

/** Au moins 3 instructions, et la majorité des dernières (60 %). */
export const MIN_RECORDS = 3
const SHARE = 0.6

export interface ProposalContext {
  maxWordsPerStep: number
  /** Les règles déjà écrites (de l'usine et de la personne) : une règle déjà là n'est pas proposée. */
  rules: string[]
  glossary: Array<{ term: string }>
  answered?: Record<string, string>
}

const median = (xs: number[]) => {
  if (!xs.length) return 0
  const v = [...xs].sort((a, b) => a - b)
  const m = v.length >> 1
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

/** Les propositions, la plus nette d'abord ; trois au plus. `records` : les dernières corrections, la plus récente d'abord. */
export function proposeRules(records: EditSignals[], ctx: ProposalContext, max = 3): Proposal[] {
  const recent = records.slice(0, 12)
  const of = recent.length
  if (of < MIN_RECORDS) return []
  const t = messages().learning
  const holds = (n: number) => n >= MIN_RECORDS && n / of >= SHARE
  const out: Proposal[] = []
  const add = (p: Omit<Proposal, 'of' | 'seen'> & { seen?: string }) => {
    if (ctx.answered?.[p.key]) return
    if (ctx.rules.some((r) => r.trim().toLocaleLowerCase() === p.rule.trim().toLocaleLowerCase())) return
    out.push({ ...p, of, seen: p.seen ?? t.seen[p.kind as Exclude<ProposalKind, 'term' | 'ai'>] })
  }

  // Des textes raccourcis : la longueur que la personne garde devient la limite.
  const shortened = recent.filter((r) => r.words[0] >= 6 && r.words[1] <= r.words[0] * 0.8)
  if (holds(shortened.length)) {
    const n = Math.max(8, Math.round(median(shortened.map((r) => r.words[1])) * 1.15))
    if (n <= ctx.maxWordsPerStep - 2) add({ key: `shorter:${n}`, kind: 'shorter', count: shortened.length, rule: t.rules.shorter(n), maxWords: n })
  }
  const lengthened = recent.filter((r) => r.words[0] >= 3 && r.words[1] >= r.words[0] * 1.3)
  if (holds(lengthened.length)) add({ key: 'longer', kind: 'longer', count: lengthened.length, rule: t.rules.longer })

  const fewerKp = recent.filter((r) => r.keyPoints[0] >= 2 && r.keyPoints[1] <= r.keyPoints[0] * 0.5)
  if (holds(fewerKp.length)) add({ key: 'fewerKeyPoints', kind: 'fewerKeyPoints', count: fewerKp.length, rule: t.rules.fewerKeyPoints })
  const moreKp = recent.filter((r) => r.keyPoints[1] >= r.keyPoints[0] + Math.max(2, Math.ceil(r.steps[1] / 4)))
  if (holds(moreKp.length)) add({ key: 'moreKeyPoints', kind: 'moreKeyPoints', count: moreKp.length, rule: t.rules.moreKeyPoints })

  const moreW = recent.filter((r) => r.warnings[1] > r.warnings[0])
  if (holds(moreW.length)) add({ key: 'moreWarnings', kind: 'moreWarnings', count: moreW.length, rule: t.rules.moreWarnings })
  const fewerW = recent.filter((r) => r.warnings[1] < r.warnings[0])
  if (holds(fewerW.length)) add({ key: 'fewerWarnings', kind: 'fewerWarnings', count: fewerW.length, rule: t.rules.fewerWarnings })

  const margin = (n: number) => Math.max(2, Math.ceil(n * 0.2))
  const split = recent.filter((r) => r.steps[1] >= r.steps[0] + margin(r.steps[0]))
  if (holds(split.length)) add({ key: 'splitSteps', kind: 'splitSteps', count: split.length, rule: t.rules.splitSteps })
  const merged = recent.filter((r) => r.steps[1] <= r.steps[0] - margin(r.steps[0]))
  if (holds(merged.length)) add({ key: 'mergeSteps', kind: 'mergeSteps', count: merged.length, rule: t.rules.mergeSteps })

  const shortTitles = recent.filter((r) => r.titleWords[0] >= 4 && r.titleWords[1] <= r.titleWords[0] - 1.5)
  if (holds(shortTitles.length)) {
    const n = Math.max(2, Math.round(median(shortTitles.map((r) => r.titleWords[1]))) + 1)
    add({ key: `shorterTitles:${n}`, kind: 'shorterTitles', count: shortTitles.length, rule: t.rules.shorterTitles(n) })
  }

  // Un mot remplacé par un autre dans au moins deux instructions : un terme de l'usine.
  const swaps = new Map<string, { from: string; to: string; records: number }>()
  for (const r of recent) {
    for (const s of new Set(r.swaps.map((x) => `${x.from}>${x.to}`))) {
      const [from, to] = s.split('>')
      const cur = swaps.get(s) ?? { from, to, records: 0 }
      cur.records++
      swaps.set(s, cur)
    }
  }
  const known = new Set(ctx.glossary.map((g) => g.term.trim().toLocaleLowerCase()))
  for (const s of [...swaps.values()].filter((x) => x.records >= 2 && !known.has(x.to)).sort((a, b) => b.records - a.records).slice(0, 2)) {
    add({ key: `term:${s.from}>${s.to}`, kind: 'term', seen: t.seen.term(s.from, s.to), count: s.records, rule: t.rules.term(s.to, s.from), term: { term: s.to, meaning: t.rules.termMeaning(s.from) } })
  }

  return out.sort((a, b) => b.count / b.of - a.count / a.of).slice(0, max)
}
