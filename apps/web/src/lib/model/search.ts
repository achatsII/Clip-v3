/**
 * Retrouver une instruction parmi des milliers. Chaque instruction porte un index (`searchText` :
 * numéro, titre, étiquettes, équipement, étapes, en minuscules et sans accents), tenu à chaque
 * enregistrement ; la recherche se fait au serveur (`$regex` sur l'index), avec des filtres (statut,
 * catégorie, secteur ou poste, « pour moi ») et le chargement à la demande (une page après l'autre,
 * sur `updatedAt`). Les écrans qui comptaient sur la liste complète demandent seulement ce qu'il
 * leur faut : un compte, une file, quelques champs.
 */
import type { DataApi, Doc } from '../gateway/data'
import { mapPool } from '../util/pool'
import { RENEWAL_SOON_DAYS } from './renewal'
import { coverOf, readOrg, T } from './repo'
import type { CategoryKey, Instruction, InstructionContent, OrgSettings, Published, PublishedCard } from './types'

const DAY = 86_400_000

/** Minuscules, sans accents (« Électricité » → « electricite »). */
export const plain = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** La taille maximale d'un index (le reste ne se cherche pas). */
export const MAX_INDEX = 4000

/**
 * L'index d'un texte : les mots, sans accents ni casse, chacun une fois, dans l'ordre. Les traits
 * d'union, points et barres restent dans les mots (« IT-0042 », « M-1234 », « 3.5 », « 1/2 »).
 */
export function searchKey(parts: Array<string | null | undefined>): string {
  const seen = new Set<string>()
  const out: string[] = []
  let size = 0
  for (const part of parts) {
    if (!part) continue
    for (const raw of plain(part).split(/[^\p{L}\p{N}./#-]+/u)) {
      const w = raw.replace(/^[./#-]+|[./#-]+$/g, '')
      if (!w || seen.has(w)) continue
      if (size + w.length + 1 > MAX_INDEX) return out.join(' ')
      seen.add(w)
      out.push(w)
      size += w.length + 1
    }
  }
  return out.join(' ')
}

/** L'index d'une instruction : son numéro et son titre d'abord, puis ce que disent ses étapes. */
export function instructionSearchText(i: { number?: string | null; title?: string; tags?: string[]; intent?: string }, c: InstructionContent | null | undefined): string {
  return searchKey([
    i.number,
    c?.title ?? i.title,
    ...(c?.tags ?? i.tags ?? []),
    c?.equipment,
    c?.summary,
    i.intent,
    ...(c?.steps ?? []).flatMap((s) => [s.section, s.title, s.text, ...(s.keyPoints ?? [])]),
  ])
}

/** La fiche légère d'une version publiée : la liste d'un poste ne lit qu'elle. */
export function publishedCard(c: InstructionContent, number?: string | null): PublishedCard {
  return {
    title: c.title,
    category: c.category,
    kind: c.kind,
    cover: coverOf(c),
    stepCount: c.steps.length,
    durationMin: c.durationMin ?? null,
    number: number ?? null,
    languages: [c.language || 'fr', ...Object.keys(c.translations ?? {})],
  }
}

/** Ce qu'une liste de poste montre d'une instruction publiée, avec ou sans fiche (une version d'avant). */
export function cardOf(p: Doc<Published>): PublishedCard {
  const j = p.json_data
  if (j.card) return j.card
  const c = (j.content ?? {}) as Partial<InstructionContent>
  return { title: c.title ?? '', category: c.category ?? 'autre', kind: c.kind ?? 'procedure', cover: c.steps ? coverOf(c as InstructionContent) : null, stepCount: c.steps?.length ?? 0, durationMin: c.durationMin ?? null, number: null, languages: [c.language || 'fr'] }
}

/* ───────────────────────── La recherche ───────────────────────── */

/** Les mots cherchés, découpés comme l'index (sans accents ni casse, sans ponctuation autour), six au plus. */
export function queryTokens(q: string): string[] {
  return plain(q)
    .split(/[^\p{L}\p{N}./#-]+/u)
    .map((w) => w.replace(/^[./#-]+|[./#-]+$/g, ''))
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => w.slice(0, 60))
}

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export type LibraryStatus = 'all' | 'published' | 'draft' | 'review' | 'renew'

export interface LibraryQuery {
  q?: string
  status?: LibraryStatus
  category?: CategoryKey | null
  /** Seulement ces postes (un secteur ou un poste). */
  stationIds?: string[] | null
  /** « Pour moi » : mes catégories, mes postes, et ce que j'ai écrit. */
  mine?: { userId: string; categories: string[]; stationIds: string[] } | null
  /** Les blocs communs seulement ; sinon, ils n'y sont pas (ils ne s'affichent à aucun poste). */
  blocks?: boolean
}

/** Un poste tel que la recherche le connaît : un mot qui le nomme trouve ses instructions. */
export interface StationRef {
  id: string
  name: string
  code?: string
  area?: string
}

/**
 * Le filtre Mongo d'une recherche. Chaque mot doit se trouver dans l'index, dans le titre (une
 * instruction d'avant l'index) ou nommer un poste de l'instruction. `cursor` : la page suivante,
 * strictement avant la dernière ligne vue (`updatedAt`).
 */
export function libraryFilter(query: LibraryQuery, stations: StationRef[], now = Date.now(), cursor?: string | null): Record<string, unknown> {
  const and: Record<string, unknown>[] = [{ 'json_data.status': { $ne: 'archived' } }, query.blocks ? { 'json_data.block': { $eq: true } } : { 'json_data.block': { $ne: true } }]
  const tokens = queryTokens(query.q ?? '')
  for (const tok of tokens) {
    const re = escapeRegex(tok)
    const or: Record<string, unknown>[] = [{ 'json_data.searchText': { $regex: re } }, { 'json_data.title': { $regex: re, $options: 'i' } }]
    const ids = stations.filter((s) => plain(`${s.name} ${s.code ?? ''} ${s.area ?? ''}`).includes(tok)).map((s) => s.id)
    if (ids.length) or.push({ 'json_data.stationIds': { $in: ids.slice(0, 300) } })
    and.push({ $or: or })
  }
  // Sans recherche, un brouillon vide de plus d'une heure (rien n'a été capturé) ne s'affiche pas.
  if (!tokens.length)
    and.push({ $or: [{ 'json_data.stepCount': { $gt: 0 } }, { 'json_data.sourceCount': { $gt: 0 } }, { 'json_data.publishedVersion': { $gt: 0 } }, { 'json_data.createdAt': { $gte: new Date(now - 3600_000).toISOString() } }] })
  if (query.status === 'published') and.push({ 'json_data.publishedVersion': { $gt: 0 } })
  if (query.status === 'draft') and.push({ $or: [{ 'json_data.publishedVersion': { $in: [null, 0] } }, { 'json_data.dirty': { $eq: true } }] })
  if (query.status === 'review') and.push({ 'json_data.status': { $eq: 'review' } })
  if (query.status === 'renew') and.push({ 'json_data.publishedVersion': { $gt: 0 } }, { 'json_data.renewal.dueAt': { $lte: new Date(now + RENEWAL_SOON_DAYS * DAY).toISOString() } })
  if (query.category) and.push({ 'json_data.category': { $eq: query.category } })
  if (query.stationIds?.length) and.push({ 'json_data.stationIds': { $in: query.stationIds.slice(0, 500) } })
  const m = query.mine
  if (m && (m.categories.length || m.stationIds.length)) {
    and.push({ $or: [...(m.categories.length ? [{ 'json_data.category': { $in: m.categories } }] : []), ...(m.stationIds.length ? [{ 'json_data.stationIds': { $in: m.stationIds } }] : []), { 'json_data.authorId': { $eq: m.userId } }] })
  }
  if (cursor) and.push({ 'json_data.updatedAt': { $lt: cursor } })
  return { $and: and }
}

/** Ce qu'une liste lit d'une instruction : ni le brouillon, ni les médias, ni l'index. */
export const LIST_FIELDS = { 'json_data.draft': 0, 'json_data.sources': 0, 'json_data.searchText': 0 } as const

export const PAGE_SIZE = 30

export interface LibraryPage {
  docs: Doc<Instruction>[]
  /** La page suivante (la date de la dernière ligne), ou null à la fin. */
  next: string | null
}

/** Une page de résultats, la plus récente d'abord. */
export async function searchInstructions(data: DataApi, query: LibraryQuery, stations: StationRef[], cursor?: string | null, limit = PAGE_SIZE): Promise<LibraryPage> {
  const docs = await data.filter<Instruction>(T.instruction, { filter: libraryFilter(query, stations, Date.now(), cursor), projection: LIST_FIELDS, sort: { 'json_data.updatedAt': -1 }, limit: limit + 1 })
  const page = docs.slice(0, limit)
  return { docs: page, next: docs.length > limit ? (page[page.length - 1]?.json_data.updatedAt ?? null) : null }
}

/** Combien d'instructions correspondent (l'en-tête de la liste). */
export function countInstructions(data: DataApi, query: LibraryQuery, stations: StationRef[]): Promise<number> {
  return data.count(T.instruction, libraryFilter(query, stations))
}

/* ───────────────────────── Ce que chaque écran demande ───────────────────────── */

const live = { 'json_data.status': { $ne: 'archived' } }
/** Les instructions publiées, sans les blocs communs (ils ne sont à aucun poste et ne comptent pas dans la limite). */
const publishedOnly = { $and: [live, { 'json_data.publishedVersion': { $gt: 0 } }, { 'json_data.block': { $ne: true } }] }

/** Le nombre d'instructions publiées (la limite du plan). */
export const countPublished = (data: DataApi) => data.count(T.instruction, publishedOnly)

/** Y a-t-il au moins une instruction (première ouverture) ? */
export const countAll = (data: DataApi) => data.count(T.instruction, live)

/** Quelques instructions selon un filtre, la plus récente d'abord. */
export function instructionsWhere(data: DataApi, filter: Record<string, unknown>, limit = 50, sort: Record<string, 1 | -1> = { 'json_data.updatedAt': -1 }): Promise<Doc<Instruction>[]> {
  return data.filter<Instruction>(T.instruction, { filter: { $and: [live, filter] }, projection: LIST_FIELDS, sort, limit })
}

/** Ce que « À voir » regarde : les instructions à approuver, et les miennes où l'on demande des changements. */
export const inboxInstructions = (data: DataApi, userId: string) =>
  instructionsWhere(data, { $or: [{ 'json_data.status': { $eq: 'review' } }, { $and: [{ 'json_data.authorId': { $eq: userId } }, { 'json_data.review.changesRequested.at': { $exists: true } }] }] }, 200)

/** Les postes qui ont au moins une instruction publiée. */
export async function coveredStations(data: DataApi): Promise<Set<string>> {
  const ids = await data.distinct(T.instruction, 'json_data.stationIds', publishedOnly)
  return new Set(ids.filter((x): x is string => typeof x === 'string'))
}

/** Le nombre d'instructions publiées par poste (la page Postes). */
export async function publishedPerStation(data: DataApi): Promise<Map<string, number>> {
  const docs = await data.filter<Pick<Instruction, 'stationIds'>>(T.instruction, { filter: publishedOnly, projection: { 'json_data.stationIds': 1 }, limit: 10_000 })
  const m = new Map<string, number>()
  for (const d of docs) for (const s of d.json_data.stationIds ?? []) m.set(s, (m.get(s) ?? 0) + 1)
  return m
}

/** Les instructions d'un poste. */
export const instructionsAtStation = (data: DataApi, stationId: string) => instructionsWhere(data, { 'json_data.stationIds': { $eq: stationId } }, 1000, { 'json_data.title': 1 })

/** Les instructions publiées qui ont des questions de formation (la matrice). */
export function trainingCatalog(data: DataApi): Promise<Doc<Instruction>[]> {
  return data.filter<Instruction>(T.instruction, {
    filter: { $and: [live, { 'json_data.publishedVersion': { $gt: 0 } }, { 'json_data.publishedQuiz': { $gt: 0 } }] },
    projection: { 'json_data.title': 1, 'json_data.stationIds': 1, 'json_data.status': 1, 'json_data.publishedVersion': 1, 'json_data.publishedQuiz': 1, 'json_data.trainingVersion': 1 },
    limit: 10_000,
  })
}

/** Ce que les statistiques lisent : les publiées, et celles créées depuis le début de la période. */
export async function statsIndex(data: DataApi, since: string): Promise<Doc<Instruction>[]> {
  const projection = { 'json_data.title': 1, 'json_data.status': 1, 'json_data.publishedVersion': 1, 'json_data.publishedAt': 1, 'json_data.updatedAt': 1, 'json_data.createdAt': 1, 'json_data.stationIds': 1, 'json_data.stepCount': 1, 'json_data.category': 1 } as const
  const [published, recent] = await Promise.all([
    data.filter<Instruction>(T.instruction, { filter: publishedOnly, projection, limit: 10_000 }),
    data.filter<Instruction>(T.instruction, { filter: { $and: [live, { 'json_data.createdAt': { $gte: since } }] }, projection, limit: 10_000 }),
  ])
  const seen = new Set(published.map((d) => d._id))
  return [...published, ...recent.filter((d) => !seen.has(d._id))]
}

/** Toutes les instructions, page après page (l'export complet). */
export async function everyInstruction(data: DataApi, onPage?: (n: number) => void): Promise<Doc<Instruction>[]> {
  const all: Doc<Instruction>[] = []
  let cursor: string | null = null
  for (let i = 0; i < 200; i++) {
    const filter: Record<string, unknown> = cursor ? { $and: [live, { 'json_data.updatedAt': { $lt: cursor } }] } : live
    const docs: Doc<Instruction>[] = await data.filter<Instruction>(T.instruction, { filter, projection: LIST_FIELDS, sort: { 'json_data.updatedAt': -1 }, limit: 200 })
    all.push(...docs)
    onPage?.(all.length)
    if (docs.length < 200) break
    cursor = docs[docs.length - 1].json_data.updatedAt
  }
  return all
}

/* ───────────────────────── Les postes : liste légère, recherche ───────────────────────── */

/** Ce que la liste d'un poste lit d'une version publiée : la fiche, pas le contenu. */
export const CARD_FIELDS = {
  'json_data.card': 1,
  'json_data.instructionId': 1,
  'json_data.version': 1,
  'json_data.stationIds': 1,
  'json_data.branding': 1,
  'json_data.publishedAt': 1,
  // Une version publiée avant les fiches : de quoi l'afficher quand même.
  'json_data.content.title': 1,
  'json_data.content.category': 1,
  'json_data.content.kind': 1,
  'json_data.content.durationMin': 1,
  'json_data.content.language': 1,
} as const

/** Les instructions publiées d'un poste, en fiches. */
export function stationCards(data: DataApi, stationId: string): Promise<Doc<Published>[]> {
  return data.filter<Published>(T.published, { filter: { 'json_data.stationIds': { $eq: stationId } }, projection: CARD_FIELDS, sort: { 'json_data.content.title': 1 }, limit: 1000 })
}

/** Chercher parmi toutes les instructions publiées (« Tout voir » au poste), page après page. */
export async function searchPublished(data: DataApi, q: string, page = 0, size = 24): Promise<{ docs: Doc<Published>[]; more: boolean }> {
  const tokens = queryTokens(q)
  const filter = tokens.length ? { $and: tokens.map((tok) => ({ $or: [{ 'json_data.searchText': { $regex: escapeRegex(tok) } }, { 'json_data.content.title': { $regex: escapeRegex(tok), $options: 'i' } }] })) } : undefined
  const docs = await data.filter<Published>(T.published, { filter, projection: CARD_FIELDS, sort: { 'json_data.content.title': 1 }, limit: size + 1, skip: page * size })
  return { docs: docs.slice(0, size), more: docs.length > size }
}

/* ───────────────────────── Le numéro de document ───────────────────────── */

export const DEFAULT_PREFIX = 'IT'

export const formatNumber = (prefix: string, n: number) => `${prefix || DEFAULT_PREFIX}-${String(n).padStart(4, '0')}`

/** Un préfixe sûr : lettres et chiffres, 6 au plus, en majuscules. */
export const cleanPrefix = (s: string) => plain(s).replace(/[^a-z0-9]/g, '').slice(0, 6).toUpperCase() || DEFAULT_PREFIX

/**
 * Réserve `n` numéros de document qui se suivent. Le compteur de l'usine est relu juste avant ; les
 * numéros déjà pris (deux publications au même moment) sont sautés.
 */
export async function allocateNumbers(data: DataApi, n: number): Promise<string[]> {
  if (n <= 0) return []
  const org = await readOrg(data)
  if (!org) return []
  const numbering = (org.json_data as OrgSettings).numbering ?? { prefix: DEFAULT_PREFIX, next: 1 }
  const prefix = numbering.prefix || DEFAULT_PREFIX
  let next = Math.max(1, numbering.next || 1)
  const out: string[] = []
  for (let tries = 0; out.length < n && tries < 5; tries++) {
    const wanted = Array.from({ length: n - out.length }, (_, i) => formatNumber(prefix, next + i))
    next += wanted.length
    const taken = await data.filter<Pick<Instruction, 'number'>>(T.instruction, { filter: { 'json_data.number': { $in: wanted } }, projection: { 'json_data.number': 1 }, limit: wanted.length })
    const used = new Set(taken.map((d) => d.json_data.number))
    out.push(...wanted.filter((w) => !used.has(w)))
  }
  await data.patch(T.org, org._id, { numbering: { prefix, next } })
  return out
}

/* ───────────────────────── Mettre à jour l'index des anciennes instructions ───────────────────────── */

/**
 * Les instructions et versions publiées d'avant l'index reçoivent le leur, par petits lots, en
 * arrière-plan (une personne qui peut écrire les instructions ouvre la liste) : index, fiche des
 * versions publiées, numéro des instructions publiées, les plus anciennes d'abord. Rend ce qui a été
 * fait ; s'arrête au budget, la suite viendra à la prochaine visite.
 */
export async function backfillIndex(data: DataApi, budget = 300): Promise<{ indexed: number; cards: number; numbered: number }> {
  const done = { indexed: 0, cards: 0, numbered: 0 }
  // Les numéros d'abord : l'index les contient.
  while (budget > 0) {
    const docs = await data.filter<Instruction>(T.instruction, { filter: { $and: [live, { 'json_data.publishedVersion': { $gt: 0 } }, { 'json_data.number': { $in: [null] } }] }, projection: { 'json_data.createdAt': 1 }, sort: { 'json_data.createdAt': 1 }, limit: 25 })
    if (!docs.length) break
    const numbers = await allocateNumbers(data, docs.length)
    if (!numbers.length) break
    await mapPool(docs.slice(0, numbers.length), 4, (d, i) => data.patch(T.instruction, d._id, { number: numbers[i], searchText: null }).catch(() => undefined))
    done.numbered += numbers.length
    budget -= docs.length
  }
  while (budget > 0) {
    const docs = await data.filter<Instruction>(T.instruction, { filter: { $and: [live, { 'json_data.searchText': { $in: [null] } }] }, limit: 20 })
    if (!docs.length) break
    let ok = 0
    await mapPool(docs, 4, async (d) => {
      const text = instructionSearchText(d.json_data, d.json_data.draft) || '-'
      await data.patch(T.instruction, d._id, { searchText: text }).then(() => ok++, () => undefined)
    })
    done.indexed += ok
    budget -= docs.length
    if (!ok) break
  }
  while (budget > 0) {
    const docs = await data.filter<Published>(T.published, { filter: { 'json_data.card': { $in: [null] } }, limit: 10 })
    if (!docs.length) break
    let ok = 0
    await mapPool(docs, 3, async (d) => {
      const c = d.json_data.content
      if (!c?.steps) return
      const number = (await data.get<Instruction>(T.instruction, d.json_data.instructionId).catch(() => null))?.json_data.number ?? null
      await data.patch(T.published, d._id, { card: publishedCard(c, number), searchText: instructionSearchText({ number }, c) }).then(() => ok++, () => undefined)
    })
    done.cards += ok
    budget -= docs.length
    if (!ok) break
  }
  return done
}
