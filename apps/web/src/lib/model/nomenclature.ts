/**
 * La nomenclature de l'usine : ses façons de classer les instructions (toggle `nomenclature`).
 * D'une usine à l'autre, ce n'est jamais pareil : ici le département et la machine, là le produit,
 * la ligne ou le numéro de bon de travail. Chaque usine se donne ses **familles d'étiquettes** :
 *
 * - une **liste** : on choisit parmi des valeurs connues (Département : Découpe, Assemblage…) ;
 * - une **valeur libre** : on l'écrit (Produit : 12345 ; Bon de travail : BT-7781), une ou plusieurs.
 *
 * Le classement d'une instruction (`Instruction.labels`) se range par famille, en texte : ce qu'on
 * voit est ce qui est gardé, la recherche le trouve tel quel, et un poste l'affiche sans lire les
 * réglages de l'usine. Renommer une valeur met les instructions à jour (`relabel`).
 *
 * Un poste peut aussi recevoir ses instructions **par règle** (`Station.rule`) : dans une famille,
 * l'une des valeurs suffit (OU) ; entre les familles, il les faut toutes (ET). Une instruction qui
 * porte le bon classement va au poste d'elle-même : la règle se calcule à chaque changement de
 * classement et de règle, et s'écrit dans les postes de l'instruction (`ruleStationIds`, et
 * `stationIds` de la version publiée) — la tablette du poste ne change pas.
 */
import type { CategoryKey } from './types'

/** Une valeur d'une famille en liste. `code` : l'abrégé de l'usine (« DEC »), qu'on cherche aussi. */
export interface TagValue {
  label: string
  code?: string
}

export interface TagFamily {
  id: string
  name: string
  kind: 'list' | 'free'
  /** Les valeurs d'une liste ; pour une valeur libre, celles déjà vues (aide à la saisie). */
  values: TagValue[]
  /** Plusieurs valeurs à la fois (une instruction pour deux machines). */
  multiple: boolean
  /** Ce que l'IA doit savoir pour bien classer (« le numéro de BT est dans le nom du fichier »). */
  hint?: string
}

export interface Nomenclature {
  families: TagFamily[]
}

/** Le classement d'une instruction : par famille, ses valeurs, en texte. */
export type Labels = Record<string, string[]>

/** La règle d'un poste : les instructions classées ainsi y vont d'elles-mêmes. */
export interface StationRule {
  labels: Labels
  /** Aussi par catégorie (Nettoyage, Maintenance…), l'une suffit. */
  categories?: CategoryKey[]
}

/** Combien de valeurs une famille garde pour une instruction (plusieurs) ; une famille simple en garde une. */
export const MAX_VALUES = 8
/** Une valeur libre : un numéro, un code, quelques mots. */
export const MAX_VALUE_LENGTH = 40
export const MAX_FAMILIES = 12

/** Minuscules, sans accents, espaces resserrés : deux façons d'écrire la même valeur se reconnaissent. */
export const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/** Une valeur écrite à la main : espaces resserrés, longueur bornée. */
export const cleanValue = (s: unknown): string => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, MAX_VALUE_LENGTH) : '')

export const familyId = (): string => `fam_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`

/** La valeur connue d'une liste qui correspond à ce qu'on a écrit (même mot, ou son code), ou null. */
export function knownValue(family: TagFamily, raw: string): string | null {
  const n = norm(raw)
  if (!n) return null
  const hit = family.values.find((v) => norm(v.label) === n || (!!v.code && norm(v.code) === n))
  return hit?.label ?? null
}

/**
 * Le classement tel qu'on le garde : seulement les familles de l'usine ; pour une liste, ses valeurs
 * (écrites comme dans les réglages) ; pour une valeur libre, le texte nettoyé ; sans doublon ; une
 * seule valeur pour une famille simple. Les familles vides disparaissent.
 */
export function cleanLabels(labels: Labels | null | undefined, nomenclature: Nomenclature | null | undefined): Labels {
  const out: Labels = {}
  if (!labels || !nomenclature) return out
  for (const family of nomenclature.families) {
    const raw = labels[family.id]
    if (!Array.isArray(raw)) continue
    const seen = new Set<string>()
    const kept: string[] = []
    for (const r of raw) {
      const value = family.kind === 'list' ? knownValue(family, String(r)) : cleanValue(r)
      if (!value || seen.has(norm(value))) continue
      seen.add(norm(value))
      kept.push(value)
    }
    const limited = kept.slice(0, family.multiple ? MAX_VALUES : 1)
    if (limited.length) out[family.id] = limited
  }
  return out
}

/** Ce que l'IA propose : `[{ family, values }]`, la famille par son identifiant ou par son nom. */
export interface AiLabel {
  family?: string
  values?: string[]
}

/** Le classement proposé par l'IA, ramené aux familles et aux valeurs de l'usine (rien d'inventé dans une liste). */
export function labelsFromAi(raw: unknown, nomenclature: Nomenclature | null | undefined): Labels {
  if (!nomenclature?.families.length || !Array.isArray(raw)) return {}
  const labels: Labels = {}
  for (const item of raw as AiLabel[]) {
    if (!item || typeof item !== 'object') continue
    const key = norm(String(item.family ?? ''))
    const family = nomenclature.families.find((f) => f.id === item.family || norm(f.name) === key)
    if (!family || !Array.isArray(item.values)) continue
    labels[family.id] = [...(labels[family.id] ?? []), ...item.values.map(String)]
  }
  return cleanLabels(labels, nomenclature)
}

export const hasLabels = (labels: Labels | null | undefined): boolean => !!labels && Object.values(labels).some((v) => v.length > 0)

/** Les mots du classement, pour l'index de recherche (le code d'une valeur aussi : « DEC » trouve Découpe). */
export function labelWords(labels: Labels | null | undefined, nomenclature?: Nomenclature | null): string[] {
  if (!labels) return []
  const out: string[] = []
  for (const [id, values] of Object.entries(labels)) {
    const family = nomenclature?.families.find((f) => f.id === id)
    for (const v of values) {
      out.push(v)
      const code = family?.values.find((x) => x.label === v)?.code
      if (code) out.push(code)
    }
  }
  return out
}

/* ───────────────────────── Les règles des postes ───────────────────────── */

/** Une règle qui dit quelque chose (au moins une valeur ou une catégorie). */
export const hasRule = (rule: StationRule | null | undefined): rule is StationRule => !!rule && (hasLabels(rule.labels) || !!rule.categories?.length)

/** L'instruction répond-elle à la règle ? Dans une famille, l'une des valeurs ; entre les familles, toutes. */
export function matchesRule(rule: StationRule | null | undefined, labels: Labels | null | undefined, category?: CategoryKey | null): boolean {
  if (!hasRule(rule)) return false
  if (rule.categories?.length && !(category && rule.categories.includes(category))) return false
  for (const [id, wanted] of Object.entries(rule.labels)) {
    if (!wanted.length) continue
    const have = new Set((labels?.[id] ?? []).map(norm))
    if (!wanted.some((w) => have.has(norm(w)))) return false
  }
  return true
}

/** Les postes où une instruction va par leur règle. */
export function ruleStationsFor<S extends { _id: string; json_data: { rule?: StationRule | null } }>(stations: S[], labels: Labels | null | undefined, category?: CategoryKey | null): string[] {
  return stations.filter((s) => matchesRule(s.json_data.rule, labels, category)).map((s) => s._id)
}

/** Le filtre Mongo des instructions qui répondent à une règle (le décompte d'un poste, sa mise à jour). */
export function ruleFilter(rule: StationRule): Record<string, unknown> {
  const and: Record<string, unknown>[] = []
  for (const [id, values] of Object.entries(rule.labels)) if (values.length) and.push({ [`json_data.labels.${id}`]: { $in: values.slice(0, 100) } })
  if (rule.categories?.length) and.push({ 'json_data.category': { $in: rule.categories } })
  return and.length ? { $and: and } : { _id: { $eq: '__aucune__' } }
}

/** Le filtre Mongo de la bibliothèque : dans une famille, l'une des valeurs ; entre les familles, toutes. */
export function labelsFilter(labels: Labels | null | undefined): Record<string, unknown>[] {
  if (!labels) return []
  return Object.entries(labels)
    .filter(([, values]) => values.length)
    .map(([id, values]) => ({ [`json_data.labels.${id}`]: { $in: values.slice(0, 100) } }))
}

/** Les postes d'une instruction publiée : ceux choisis à la main, et ceux de leur règle. */
export const allStationIds = (manual: string[] | null | undefined, byRule: string[] | null | undefined): string[] => [...new Set([...(manual ?? []), ...(byRule ?? [])])]

/** Deux listes de postes identiques, dans n'importe quel ordre ? */
export const sameIds = (a: string[] | null | undefined, b: string[] | null | undefined): boolean => {
  const x = [...new Set(a ?? [])].sort()
  const y = [...new Set(b ?? [])].sort()
  return x.length === y.length && x.every((v, i) => v === y[i])
}

/* ───────────────────────── Les réglages ───────────────────────── */

/** Les familles qu'on ajoute d'un toucher (les noms suivent la langue de l'outil). */
export type FamilyPreset = 'department' | 'machine' | 'product' | 'line' | 'workOrder' | 'customer'

export const PRESET_KINDS: Record<FamilyPreset, Pick<TagFamily, 'kind' | 'multiple'>> = {
  department: { kind: 'list', multiple: false },
  machine: { kind: 'list', multiple: true },
  product: { kind: 'free', multiple: true },
  line: { kind: 'list', multiple: true },
  workOrder: { kind: 'free', multiple: true },
  customer: { kind: 'list', multiple: true },
}

/** Une nomenclature lue des réglages : rien d'illisible, des familles bien formées. */
export function readNomenclature(raw: unknown): Nomenclature {
  const families = Array.isArray((raw as Nomenclature | null)?.families) ? (raw as Nomenclature).families : []
  return {
    families: families
      .filter((f): f is TagFamily => !!f && typeof f.id === 'string' && typeof f.name === 'string')
      .slice(0, MAX_FAMILIES)
      .map((f) => ({
        id: f.id,
        name: f.name.trim().slice(0, 40),
        kind: f.kind === 'free' ? 'free' : 'list',
        multiple: !!f.multiple,
        values: (Array.isArray(f.values) ? f.values : []).filter((v) => v && typeof v.label === 'string' && v.label.trim()).map((v) => ({ label: cleanValue(v.label), ...(v.code ? { code: cleanValue(v.code).slice(0, 12) } : {}) })),
        ...(f.hint ? { hint: String(f.hint).slice(0, 200) } : {}),
      })),
  }
}

/** Ajoute des valeurs à une liste (une par ligne, ou séparées par des virgules), sans doublon. */
export function addValues(family: TagFamily, text: string): TagFamily {
  const seen = new Set(family.values.map((v) => norm(v.label)))
  const added: TagValue[] = []
  for (const part of text.split(/[\n,;]+/)) {
    const label = cleanValue(part)
    if (!label || seen.has(norm(label))) continue
    seen.add(norm(label))
    added.push({ label })
  }
  return { ...family, values: [...family.values, ...added] }
}

/** Le classement d'une instruction après qu'une valeur a changé de nom (ou disparu, `to` vide). */
export function renameIn(labels: Labels | null | undefined, familyIdOf: string, from: string, to: string | null): Labels | null {
  const values = labels?.[familyIdOf]
  if (!labels || !values?.some((v) => norm(v) === norm(from))) return null
  const next = values.map((v) => (norm(v) === norm(from) ? to : v)).filter((v): v is string => !!v)
  const out: Labels = { ...labels }
  if (next.length) out[familyIdOf] = [...new Set(next)]
  else delete out[familyIdOf]
  return out
}

/**
 * Le classement proposé par l'IA, ajouté à celui qu'on a déjà : une famille vide le prend ; une
 * famille à plusieurs valeurs les ajoute ; une famille simple déjà remplie garde la sienne.
 */
export function mergeLabels(current: Labels | null | undefined, proposed: Labels, nomenclature: Nomenclature): Labels {
  const out: Labels = { ...(current ?? {}) }
  for (const family of nomenclature.families) {
    const add = proposed[family.id]
    if (!add?.length) continue
    const have = out[family.id] ?? []
    if (!have.length) out[family.id] = add
    else if (family.multiple) out[family.id] = [...have, ...add.filter((v) => !have.some((h) => norm(h) === norm(v)))]
  }
  return cleanLabels(out, nomenclature)
}
