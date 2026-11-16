/**
 * Le classement des instructions, enregistré (toggle `nomenclature`) : les étiquettes d'une
 * instruction, la règle d'un poste, le nom d'une valeur qui change. Le classement n'est pas du
 * contenu : il se change sans nouvelle version, et la version publiée suit tout de suite (ses postes,
 * son index de recherche), pour que la tablette du poste et sa recherche le voient.
 */
import type { DataApi, Doc } from '../gateway/data'
import { mapPool } from '../util/pool'
import { allStationIds, cleanLabels, matchesRule, norm, renameIn, ruleFilter, ruleStationsFor, sameIds, type Labels, type Nomenclature, type StationRule } from './nomenclature'
import { nowIso, T } from './repo'
import { atStations, instructionSearchText } from './search'
import type { Instruction, Published, Station } from './types'

/** Ce qu'il faut lire d'une instruction pour refaire ses postes par règle. */
const RULE_FIELDS = { 'json_data.labels': 1, 'json_data.category': 1, 'json_data.stationIds': 1, 'json_data.ruleStationIds': 1, 'json_data.publishedId': 1 } as const

/**
 * Enregistre le classement d'une instruction : ses étiquettes, les postes de leur règle, son index ;
 * puis, si elle est publiée, la version publique (postes, étiquettes, index). Rend les postes par règle.
 */
export async function saveClassification(
  data: DataApi,
  doc: Doc<Instruction>,
  input: { labels: Labels; nomenclature: Nomenclature; stations: Doc<Station>[]; category?: Instruction['category']; confirm?: boolean },
): Promise<{ labels: Labels; ruleStationIds: string[] }> {
  const instr = doc.json_data
  const labels = cleanLabels(input.labels, input.nomenclature)
  const category = input.category ?? instr.draft?.category ?? instr.category
  const ruleStationIds = ruleStationsFor(input.stations, labels, category)
  await data.patch(T.instruction, doc._id, {
    labels,
    ruleStationIds,
    // Toucher au classement, c'est l'avoir regardé : le rappel « L'IA a classé » s'efface.
    ...(input.confirm !== false ? { labelsCheck: null } : {}),
    searchText: instructionSearchText({ number: instr.number, intent: instr.intent, labels }, instr.draft),
    updatedAt: nowIso(),
  })
  if (instr.publishedId) await syncPublished(data, instr.publishedId, { labels, manual: instr.stationIds, ruleStationIds, number: instr.number })
  return { labels, ruleStationIds }
}

/** La version publique suit le classement : ses postes (à la main et par règle), ses étiquettes, son index. */
async function syncPublished(data: DataApi, publishedId: string, c: { labels: Labels; manual: string[]; ruleStationIds: string[]; number?: string | null }) {
  const pub = await data.get<Published>(T.published, publishedId).catch(() => null)
  if (!pub) return
  await data
    .patch(T.published, publishedId, {
      labels: c.labels,
      ruleStationIds: c.ruleStationIds,
      stationIds: allStationIds(c.manual, c.ruleStationIds),
      searchText: instructionSearchText({ number: c.number ?? pub.json_data.card?.number ?? null, labels: c.labels }, pub.json_data.content),
    })
    .catch(() => undefined)
}

/**
 * Les postes par règle d'une instruction ne suivent plus son classement ou sa catégorie (une
 * catégorie changée par l'IA, une règle changée ailleurs) : null s'ils sont à jour.
 */
export function staleRuleStations(instr: Pick<Instruction, 'labels' | 'ruleStationIds' | 'category' | 'draft'>, stations: Doc<Station>[]): string[] | null {
  const want = ruleStationsFor(stations, instr.labels, instr.draft?.category ?? instr.category)
  return sameIds(want, instr.ruleStationIds) ? null : want
}

/**
 * Enregistre la règle d'un poste, puis refait ses instructions : celles qui y répondent y vont,
 * celles qui n'y répondent plus en partent (pas celles qu'on y a mises à la main). Rend combien
 * d'instructions sont arrivées et parties.
 */
export async function applyStationRule(data: DataApi, station: Doc<Station>, rule: StationRule | null, onProgress?: (done: number, total: number) => void): Promise<{ added: number; removed: number; matching: number }> {
  await data.patch(T.station, station._id, { rule })
  const id = station._id
  const live = { 'json_data.status': { $ne: 'archived' } }
  const notBlock = { 'json_data.block': { $ne: true } }
  const [matching, current] = await Promise.all([
    rule ? data.filter<Instruction>(T.instruction, { filter: { $and: [live, notBlock, ruleFilter(rule)] }, projection: RULE_FIELDS, limit: 10_000 }) : Promise.resolve([] as Doc<Instruction>[]),
    data.filter<Instruction>(T.instruction, { filter: { $and: [live, { 'json_data.ruleStationIds': { $eq: id } }] }, projection: RULE_FIELDS, limit: 10_000 }),
  ])
  // Le serveur compare les valeurs telles quelles ; la règle, sans accents ni casse : on revérifie ici.
  const keep = matching.filter((d) => matchesRule(rule, d.json_data.labels, d.json_data.category))
  const want = new Set(keep.map((d) => d._id))
  const changes: Array<{ doc: Doc<Instruction>; next: string[] }> = []
  for (const d of keep) {
    const have = d.json_data.ruleStationIds ?? []
    if (!have.includes(id)) changes.push({ doc: d, next: [...have, id] })
  }
  for (const d of current) if (!want.has(d._id)) changes.push({ doc: d, next: (d.json_data.ruleStationIds ?? []).filter((x) => x !== id) })
  let done = 0
  await mapPool(changes, 5, async ({ doc, next }) => {
    await data.patch(T.instruction, doc._id, { ruleStationIds: next })
    if (doc.json_data.publishedId) await data.patch(T.published, doc.json_data.publishedId, { ruleStationIds: next, stationIds: allStationIds(doc.json_data.stationIds, next) }).catch(() => undefined)
    onProgress?.(++done, changes.length)
  })
  const added = changes.filter((c) => c.next.includes(id)).length
  return { added, removed: changes.length - added, matching: keep.length }
}

/** Combien d'instructions répondent à une règle (le poste le dit avant qu'on l'enregistre). */
export async function countRule(data: DataApi, rule: StationRule): Promise<number> {
  return data.count(T.instruction, { $and: [{ 'json_data.status': { $ne: 'archived' } }, { 'json_data.block': { $ne: true } }, ruleFilter(rule)] })
}

/** Ce que le poste affichera avec cette règle, avant de l'enregistrer : le nombre, et les premiers titres. */
export async function previewRule(data: DataApi, rule: StationRule, size = 5): Promise<{ count: number; titles: string[] }> {
  const filter = { $and: [{ 'json_data.status': { $ne: 'archived' } }, { 'json_data.block': { $ne: true } }, ruleFilter(rule)] }
  const [count, docs] = await Promise.all([data.count(T.instruction, filter), data.filter<Instruction>(T.instruction, { filter, projection: { 'json_data.title': 1 }, sort: { 'json_data.title': 1 }, limit: size })])
  return { count, titles: docs.map((d) => d.json_data.title) }
}

/**
 * Une famille retirée des réglages : les règles des postes qui la nommaient l'oublient, et leurs
 * instructions sont refaites (une règle vidée ne prend plus rien). Rend le nombre de postes touchés.
 */
export async function forgetFamily(data: DataApi, familyIdOf: string): Promise<number> {
  const stations = await data.filter<Station>(T.station, { filter: { [`json_data.rule.labels.${familyIdOf}`]: { $exists: true } }, limit: 1000 }).catch(() => [] as Doc<Station>[])
  for (const s of stations) {
    const rule = s.json_data.rule
    if (!rule) continue
    const labels = { ...rule.labels }
    delete labels[familyIdOf]
    const next: StationRule = { ...rule, labels }
    await applyStationRule(data, s, hasRuleLike(next) ? next : null)
  }
  return stations.length
}

const hasRuleLike = (r: StationRule) => Object.values(r.labels).some((v) => v.length) || !!r.categories?.length

/**
 * Une valeur change de nom (ou disparaît, `to` null) : les instructions, leurs versions publiques et
 * les règles des postes suivent. Rend le nombre d'instructions touchées.
 */
export async function relabelValue(data: DataApi, familyId: string, from: string, to: string | null, onProgress?: (done: number, total: number) => void): Promise<number> {
  const key = `json_data.labels.${familyId}`
  const docs = await data.filter<Instruction>(T.instruction, { filter: { [key]: { $in: [from] } }, projection: { 'json_data.labels': 1, 'json_data.draft': 1, 'json_data.number': 1, 'json_data.intent': 1, 'json_data.publishedId': 1, 'json_data.stationIds': 1, 'json_data.ruleStationIds': 1 }, limit: 10_000 })
  let done = 0
  await mapPool(docs, 4, async (d) => {
    const labels = renameIn(d.json_data.labels, familyId, from, to)
    if (labels) {
      await data.patch(T.instruction, d._id, { labels, searchText: instructionSearchText({ number: d.json_data.number, intent: d.json_data.intent, labels }, d.json_data.draft) })
      if (d.json_data.publishedId) await syncPublished(data, d.json_data.publishedId, { labels, manual: d.json_data.stationIds ?? [], ruleStationIds: d.json_data.ruleStationIds ?? [], number: d.json_data.number })
    }
    onProgress?.(++done, docs.length)
  })
  // Les règles des postes qui nommaient l'ancienne valeur.
  const stations = await data.filter<Station>(T.station, { filter: { [`json_data.rule.labels.${familyId}`]: { $in: [from] } }, limit: 1000 }).catch(() => [] as Doc<Station>[])
  await mapPool(stations, 4, async (s) => {
    const rule = s.json_data.rule
    if (!rule) return
    const next = renameIn(rule.labels, familyId, from, to)
    if (next) await data.patch(T.station, s._id, { rule: { ...rule, labels: next } })
  })
  return docs.length
}

/** Les instructions d'un poste, choisies à la main ou par sa règle (le décompte de la page Postes). */
export function stationFilter(stationId: string): Record<string, unknown> {
  return { $or: atStations([stationId]) }
}

/** Deux valeurs écrites autrement (accents, casse, espaces) sont la même valeur. */
export const sameValue = (a: string, b: string) => norm(a) === norm(b)
