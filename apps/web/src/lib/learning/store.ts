/**
 * L'IA qui apprend des corrections (toggle `learnFromEdits`) : où elle range ce qu'elle apprend.
 *
 * - `clip_edit` : à la première publication d'une instruction générée, ce que la personne a corrigé
 *   (`signals.ts`), puis la version de l'IA s'efface de l'instruction (`generation.learnedAt`).
 * - `clip_writing` : les préférences d'une personne (ses règles, ses 👎 commentés, ses modèles),
 *   versionnées comme le standard de l'usine ; l'IA les suit pour ses instructions, après l'usine.
 * - Le standard de l'usine (`OrgSettings.standard`) : ses règles, son vocabulaire, ses instructions
 *   modèles ; chaque changement en fait une nouvelle version (`standardHistory`, retour possible).
 */
import type { DataApi, Doc } from '../gateway/data'
import { nowIso, T } from '../model/repo'
import type { EditRecord, Instruction, InstructionContent, ModelExample, OrgSettings, PersonalWriting, WritingStandard } from '../model/types'
import { proposeRules, type Proposal } from './proposals'
import { editSignals, snapshotOf, type EditSignals } from './signals'

export const MAX_ORG_EXAMPLES = 3
export const MAX_MY_EXAMPLES = 2
const MAX_HISTORY = 10
const MAX_LEARNINGS = 30

export const emptyPersonal = (userId: string): PersonalWriting => ({ userId, rules: [], learnings: [], examples: [], answered: {}, version: 0, updatedAt: '', history: [] })

/** Une fiche relue telle quelle : un champ manquant (fiche plus ancienne) prend sa valeur vide. */
export function readPersonal(raw: Partial<PersonalWriting> | null | undefined, userId: string): PersonalWriting {
  const base = emptyPersonal(userId)
  if (!raw) return base
  return {
    ...base,
    ...raw,
    rules: Array.isArray(raw.rules) ? raw.rules.filter((r) => typeof r === 'string' && r.trim()) : [],
    learnings: Array.isArray(raw.learnings) ? raw.learnings : [],
    examples: Array.isArray(raw.examples) ? raw.examples : [],
    answered: raw.answered && typeof raw.answered === 'object' ? raw.answered : {},
    history: Array.isArray(raw.history) ? raw.history : [],
    version: typeof raw.version === 'number' ? raw.version : 0,
  }
}

export async function loadPersonal(data: Pick<DataApi, 'filter'>, userId: string): Promise<Doc<PersonalWriting> | null> {
  const list = await data.filter<PersonalWriting>(T.writing, { filter: { 'json_data.userId': userId }, limit: 1, sort: { _id: -1 } })
  return list[0] ? { ...list[0], json_data: readPersonal(list[0].json_data, userId) } : null
}

/**
 * Enregistre les préférences d'une personne. Ses règles qui changent en font une nouvelle version
 * (l'ancienne reste dans `history`, dix au plus) ; le reste (ses 👎, ses modèles, ses réponses) suit.
 */
export async function savePersonal(
  data: Pick<DataApi, 'insert' | 'patch'>,
  current: Doc<PersonalWriting> | null,
  userId: string,
  change: Partial<Pick<PersonalWriting, 'rules' | 'learnings' | 'examples' | 'answered'>>,
): Promise<Doc<PersonalWriting>> {
  const base = readPersonal(current?.json_data, userId)
  const rules = change.rules ? change.rules.map((r) => r.trim()).filter(Boolean) : base.rules
  const rulesChanged = JSON.stringify(rules) !== JSON.stringify(base.rules)
  const at = nowIso()
  const next: PersonalWriting = {
    ...base,
    ...change,
    rules,
    learnings: (change.learnings ?? base.learnings).slice(-MAX_LEARNINGS),
    version: rulesChanged ? base.version + 1 : base.version,
    history: rulesChanged && base.version > 0 ? [{ version: base.version, rules: base.rules, at: base.updatedAt || at }, ...base.history].slice(0, MAX_HISTORY) : base.history,
    updatedAt: at,
  }
  if (!current) return data.insert(T.writing, next, 'Préférences de rédaction')
  await data.patch(T.writing, current._id, { rules: next.rules, learnings: next.learnings, examples: next.examples, answered: next.answered, version: next.version, history: next.history, updatedAt: next.updatedAt })
  return { ...current, json_data: next }
}

/**
 * À la première publication d'une instruction générée : ce que la personne a corrigé, gardé dans
 * `clip_edit`, puis la version de l'IA s'efface de l'instruction. Rien si l'instruction n'a pas de
 * version de l'IA (écrite à la main, ou déjà apprise).
 */
export async function recordEdits(
  data: Pick<DataApi, 'insert' | 'patch'>,
  doc: Doc<Instruction>,
  published: Pick<InstructionContent, 'title' | 'steps'>,
  actor: { id: string; name: string },
): Promise<EditSignals | null> {
  const g = doc.json_data.generation
  if (!g?.original || g.learnedAt) return null
  const signals = editSignals(g.original, snapshotOf(published))
  const at = nowIso()
  const author = doc.json_data.authorId || actor.id
  const record: EditRecord = { instructionId: doc._id, userId: author, userName: author === actor.id ? actor.name : (doc.json_data.authorName ?? undefined), at, signals }
  await data.insert(T.edit, record, 'Corrections après génération')
  await data.patch(T.instruction, doc._id, { 'generation.learnedAt': at, 'generation.original': null })
  return signals
}

/** Les dernières corrections, la plus récente d'abord : d'une personne, ou de toute l'équipe. */
export async function recentEdits(data: Pick<DataApi, 'filter'>, opts: { userId?: string; limit?: number } = {}): Promise<Array<Doc<EditRecord>>> {
  return data.filter<EditRecord>(T.edit, { filter: opts.userId ? { 'json_data.userId': opts.userId } : undefined, limit: opts.limit ?? 12, sort: { _id: -1 } })
}

/** Ce que l'usine et la personne ont déjà répondu : une proposition répondue ne revient pas. */
const answeredOf = (org: Pick<OrgSettings, 'learningAnswered'>, personal: PersonalWriting | null) => ({ ...(org.learningAnswered ?? {}), ...(personal?.answered ?? {}) })

/** Les propositions pour une personne, d'après ses corrections, le standard de l'usine et ses préférences. */
export function proposalsFor(records: EditSignals[], org: Pick<OrgSettings, 'standard' | 'learningAnswered'>, personal: PersonalWriting | null): Proposal[] {
  return proposeRules(records, {
    maxWordsPerStep: org.standard.maxWordsPerStep,
    rules: [...org.standard.rules, ...(personal?.rules ?? [])],
    glossary: org.standard.glossary,
    answered: answeredOf(org, personal),
  })
}

/** Les propositions pour l'usine, d'après les corrections de toute l'équipe. */
export function teamProposals(records: EditSignals[], org: Pick<OrgSettings, 'standard' | 'learningAnswered'>): Proposal[] {
  return proposeRules(records, { maxWordsPerStep: org.standard.maxWordsPerStep, rules: org.standard.rules, glossary: org.standard.glossary, answered: org.learningAnswered })
}

/** Une proposition acceptée pour l'usine : le nombre de mots, un terme du vocabulaire ou une règle. */
export function applyToStandard(std: WritingStandard, p: Pick<Proposal, 'rule' | 'maxWords' | 'term'>): WritingStandard {
  if (p.maxWords) return { ...std, maxWordsPerStep: p.maxWords }
  if (p.term && !std.glossary.some((g) => g.term.toLocaleLowerCase() === p.term!.term.toLocaleLowerCase())) return { ...std, glossary: [...std.glossary, p.term] }
  return std.rules.includes(p.rule) ? std : { ...std, rules: [...std.rules, p.rule] }
}

/**
 * Le standard de l'usine changé : une nouvelle version, et l'ancienne dans l'historique (vingt au
 * plus), comme dans Réglages › Standard de rédaction.
 */
export function nextStandard(org: Pick<OrgSettings, 'standard' | 'standardHistory'>, next: WritingStandard, byName: string): Pick<OrgSettings, 'standard' | 'standardHistory'> {
  const current = org.standard
  return {
    standard: { ...next, rules: next.rules.map((r) => r.trim()).filter(Boolean), version: current.version + 1, updatedAt: nowIso(), updatedByName: byName },
    standardHistory: [current, ...(org.standardHistory ?? [])].slice(0, 20),
  }
}

/** Une instruction prise comme modèle : son titre, ce qui la rend bonne, et trois de ses étapes. */
export function exampleOf(instructionId: string, content: Pick<InstructionContent, 'title' | 'steps'>, why: string, byName?: string): ModelExample {
  const steps = content.steps.filter((s) => !s.fromBlock && (s.title || s.text))
  // Les étapes qui montrent le mieux le style : d'abord celles qui ont un point clé.
  const picked = [...steps.filter((s) => s.keyPoints?.length), ...steps.filter((s) => !s.keyPoints?.length)].slice(0, 3)
  const order = new Map(steps.map((s, i) => [s.id, i]))
  picked.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  return { instructionId, title: content.title, why: why.trim(), steps: picked.map((s) => ({ title: s.title, text: s.text, keyPoints: s.keyPoints ?? [] })), at: nowIso(), ...(byName ? { byName } : {}) }
}

/** Les modèles, la même instruction une seule fois, les plus récents gardés. */
export function withExample(list: ModelExample[] | undefined, ex: ModelExample, max: number): ModelExample[] {
  return [...(list ?? []).filter((x) => x.instructionId !== ex.instructionId), ex].slice(-max)
}
