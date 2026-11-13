/**
 * Les blocs communs (toggle `sharedBlocks`, feature `shared_blocks`) : des étapes rédigées une fois
 * (le cadenassage d'une presse, le démarrage standard d'une ligne) et réutilisées dans plusieurs
 * instructions. Un bloc est une instruction marquée `block` : il se rédige, s'approuve et se publie
 * comme elle, mais ne s'affiche à aucun poste. Dans une instruction, ses étapes sont des copies de
 * sa version publiée (`Step.fromBlock`), qui ne se modifient pas sur place ; la publication du bloc
 * remplace ces copies partout, et republie les instructions qui étaient à jour.
 *
 * Une copie porte un identifiant propre à son bloc (`copyId`) : il ne change pas d'une version à
 * l'autre (la traduction d'une étape inchangée reste bonne) et ne se confond ni avec une étape de
 * l'instruction (une instruction dupliquée garde les identifiants de ses étapes) ni avec la copie d'un
 * autre bloc.
 */
import type { DataApi, Doc } from '../gateway/data'
import { messages } from '../i18n/core'
import { emptyContent, T, uid } from './repo'
import { escapeRegex, queryTokens } from './search'
import { createInstruction, publishInstruction, saveDraft, type Actor } from './service'
import type { Instruction, InstructionContent, OrgSettings, Step, TranslatedContent, Version } from './types'

export interface BlockRef {
  id: string
  version: number
  title: string
}

/** L'identifiant, dans une instruction, de la copie d'une étape d'un bloc. */
export const copyId = (blockId: string, stepId: string) => `${stepId}_${blockId}`

/** Les étapes d'une version publiée d'un bloc, prêtes à copier : chacune marquée de son bloc. */
export function copyBlock(block: BlockRef, steps: Step[]): Step[] {
  return steps.map((s) => ({ ...s, id: copyId(block.id, s.id), fromBlock: { id: block.id, version: block.version, title: block.title } }))
}

/** Renomme des étapes partout où le contenu les nomme : les étapes, leurs traductions, les questions. */
function renameSteps(c: InstructionContent, rename: Map<string, string>): InstructionContent {
  if (!rename.size) return c
  const to = <S extends { id: string }>(s: S): S => (rename.has(s.id) ? { ...s, id: rename.get(s.id)! } : s)
  return {
    ...c,
    steps: c.steps.map(to),
    ...(c.translations ? { translations: Object.fromEntries(Object.entries(c.translations).map(([lang, tr]) => [lang, { ...tr, steps: tr.steps.map(to) }])) } : {}),
    ...(c.quiz ? { quiz: c.quiz.map((q) => (q.stepId && rename.has(q.stepId) ? { ...q, stepId: rename.get(q.stepId)! } : q)) } : {}),
  }
}

/** Les suites d'étapes d'un même bloc, dans l'ordre. */
export function blockRuns(steps: Step[]): Array<BlockRef & { start: number; end: number }> {
  const runs: Array<BlockRef & { start: number; end: number }> = []
  steps.forEach((s, i) => {
    const b = s.fromBlock
    if (!b) return
    const last = runs[runs.length - 1]
    if (last && last.id === b.id && last.end === i) last.end = i + 1
    else runs.push({ ...b, start: i, end: i + 1 })
  })
  return runs
}

const usesBlock = (c: InstructionContent, id: string) => c.steps.some((s) => s.fromBlock?.id === id)

/** Le bloc, inséré après l'étape `after` (−1 : au début) ; null s'il est déjà dans l'instruction. */
export function insertBlock(c: InstructionContent, after: number, copies: Step[]): InstructionContent | null {
  const taken = new Set(c.steps.map((s) => s.id))
  if (!copies.length || usesBlock(c, copies[0].fromBlock!.id) || copies.some((s) => taken.has(s.id))) return null
  const at = Math.max(0, Math.min(c.steps.length, after + 1))
  return { ...c, steps: [...c.steps.slice(0, at), ...copies, ...c.steps.slice(at)] }
}

/**
 * Les étapes du bloc deviennent celles de l'instruction : elles ne suivront plus le bloc. Elles
 * prennent un identifiant à elles (traductions et questions suivent) : le bloc pourra revenir.
 */
export function detachBlock(c: InstructionContent, id: string): InstructionContent {
  const own = renameSteps(c, new Map(c.steps.filter((s) => s.fromBlock?.id === id).map((s) => [s.id, uid('st_')])))
  return { ...own, steps: own.steps.map((s) => (s.fromBlock?.id === id ? (({ fromBlock: _f, ...rest }) => rest)(s) : s)) }
}

/** Retire le bloc entier de l'instruction. */
export function removeBlock(c: InstructionContent, id: string): InstructionContent {
  return { ...c, steps: c.steps.filter((s) => s.fromBlock?.id !== id) }
}

const sameStep = (a: Step | undefined, b: Step) => !!a && JSON.stringify({ ...a, fromBlock: undefined }) === JSON.stringify({ ...b, fromBlock: undefined })

/**
 * Le bloc, remplacé par sa nouvelle version, à la place de sa première suite (une copie en double
 * part). La traduction des étapes qui ont changé tombe : l'opérateur lit l'original plutôt qu'un texte
 * périmé, jusqu'à la prochaine traduction. Null : l'instruction n'utilise pas ce bloc, ou rien ne change.
 */
export function replaceBlock(c: InstructionContent, id: string, copies: Step[]): InstructionContent | null {
  const first = c.steps.findIndex((s) => s.fromBlock?.id === id)
  if (first < 0) return null
  const old = c.steps.filter((s) => s.fromBlock?.id === id)
  const before = new Map(old.map((s) => [s.id, s]))
  const unchanged = old.length === copies.length && copies.every((s, i) => sameStep(old[i], s) && old[i].fromBlock?.version === s.fromBlock?.version)
  if (unchanged) return null
  const steps = [...c.steps.slice(0, first).filter((s) => s.fromBlock?.id !== id), ...copies, ...c.steps.slice(first).filter((s) => s.fromBlock?.id !== id)]
  // Ce qui a changé (ou disparu) perd sa traduction ; le reste la garde.
  const stale = new Set([...old.map((s) => s.id).filter((sid) => !copies.some((n) => n.id === sid)), ...copies.filter((n) => !sameStep(before.get(n.id), n)).map((n) => n.id)])
  const translations = c.translations
    ? Object.fromEntries(Object.entries(c.translations).map(([lang, tr]) => [lang, { ...tr, steps: tr.steps.filter((s) => !stale.has(s.id)) } as TranslatedContent]))
    : undefined
  return { ...c, steps, ...(translations ? { translations } : {}) }
}

/* ───────────────────────── Lire ───────────────────────── */

/** La version publiée d'un bloc : son numéro, son titre, ses étapes ; null s'il n'est pas publié. */
export async function publishedBlock(data: DataApi, id: string): Promise<(BlockRef & { steps: Step[] }) | null> {
  const [v] = await data.filter<Version>(T.version, { filter: { 'json_data.instructionId': { $eq: id } }, sort: { 'json_data.number': -1 }, limit: 1 })
  if (!v) return null
  return { id, version: v.json_data.number, title: v.json_data.content.title, steps: v.json_data.content.steps }
}

/** Les blocs publiés (« Insérer un bloc commun »), avec une recherche. */
export function listBlocks(data: DataApi, q = ''): Promise<Doc<Instruction>[]> {
  const words = queryTokens(q).map((tok) => ({ 'json_data.searchText': { $regex: escapeRegex(tok) } }))
  return data.filter<Instruction>(T.instruction, {
    filter: { $and: [{ 'json_data.block': { $eq: true } }, { 'json_data.status': { $ne: 'archived' } }, { 'json_data.publishedVersion': { $gt: 0 } }, ...words] },
    projection: { 'json_data.title': 1, 'json_data.publishedVersion': 1, 'json_data.stepCount': 1, 'json_data.category': 1, 'json_data.updatedAt': 1, 'json_data.coverUrl': 1 },
    sort: { 'json_data.title': 1 },
    limit: 200,
  })
}

const usingFilter = (id: string) => ({ $and: [{ 'json_data.status': { $ne: 'archived' } }, { 'json_data.draft.steps.fromBlock.id': { $eq: id } }] })

/** Les instructions qui utilisent ce bloc (leur brouillon le contient). */
export const instructionsUsing = (data: DataApi, id: string) => data.filter<Instruction>(T.instruction, { filter: usingFilter(id), limit: 1000 })

/** Combien d'instructions utilisent ce bloc. */
export const countUsing = (data: DataApi, id: string) => data.count(T.instruction, usingFilter(id))

/* ───────────────────────── Faire, propager ───────────────────────── */

/**
 * Fait un bloc commun de ces étapes de l'instruction : le bloc est créé et publié (version 1), et
 * rend les copies qui remplacent ces étapes (leurs traductions et leurs questions les suivent).
 */
export async function makeBlock(data: DataApi, org: OrgSettings, actor: Actor, source: InstructionContent, stepIds: string[], title: string): Promise<{ block: Doc<Instruction>; content: InstructionContent }> {
  const picked = source.steps.filter((s) => stepIds.includes(s.id) && !s.fromBlock)
  if (!picked.length) throw new Error(messages().blocks.errors.noSteps)
  const steps = picked.map(({ fromBlock: _f, ...s }) => s)
  const draft = emptyContent({ title, language: source.language, category: source.category, kind: 'procedure', steps })
  const created = await createInstruction(data, actor, { title, block: true, category: source.category, draft, stepCount: steps.length })
  const block = { ...created, json_data: { ...created.json_data, draft } }
  await publishInstruction(data, block, org, actor)
  const copies = copyBlock({ id: block._id, version: 1, title }, steps)
  const renamed = renameSteps(source, new Map(picked.map((p) => [p.id, copyId(block._id, p.id)])))
  // Les copies prennent la place de la première étape choisie ; les autres choisies partent.
  const isPicked = (s: Step) => copies.some((c) => c.id === s.id)
  const first = renamed.steps.findIndex(isPicked)
  const rest = renamed.steps.filter((s) => !isPicked(s))
  const at = renamed.steps.slice(0, first).filter((s) => !isPicked(s)).length
  return { block, content: { ...renamed, steps: [...rest.slice(0, at), ...copies, ...rest.slice(at)] } }
}

export interface Propagation {
  /** Republiées tout de suite (elles étaient à jour). */
  republished: number
  /** Brouillon mis à jour : la prochaine publication comprendra le bloc. */
  drafts: number
  failed: number
}

/**
 * Après la publication d'un bloc : chaque instruction qui l'utilise prend sa nouvelle version. Une
 * instruction publiée et à jour est republiée (une nouvelle version, qui le dit) ; une instruction en
 * cours de modification ou d'approbation garde son brouillon, mis à jour.
 */
export async function propagateBlock(data: DataApi, org: OrgSettings, actor: Actor, block: BlockRef & { steps: Step[] }, onProgress?: (done: number, total: number) => void): Promise<Propagation> {
  const docs = (await instructionsUsing(data, block.id)).filter((d) => !d.json_data.block && d.json_data.draft)
  const out: Propagation = { republished: 0, drafts: 0, failed: 0 }
  const copies = copyBlock(block, block.steps)
  let done = 0
  for (const d of docs) {
    const i = d.json_data
    const next = replaceBlock(i.draft!, block.id, copies)
    if (next) {
      try {
        const live = !!i.publishedVersion && !i.dirty && i.status !== 'review'
        await saveDraft(data, d._id, i, next, actor)
        if (live) {
          await publishInstruction(data, { ...d, json_data: { ...i, draft: next } }, org, actor, { previous: i.draft, note: messages().blocks.changelog(block.title, block.version) })
          out.republished++
        } else out.drafts++
      } catch {
        out.failed++
      }
    }
    onProgress?.(++done, docs.length)
  }
  return out
}
