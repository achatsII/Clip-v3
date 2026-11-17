/**
 * Routes Data de la Gateway (`/api/v1/data/{dataType}`), avec le cloisonnement de CLIP V2.
 *
 * Avec l'ancienne application partagée `html` seulement, chaque document porte
 * `json_data.app_identifier` (`HTML_DATA_SLUG`, l'étiquette des données d'avant le 2026-11-17) et
 * chaque lecture filtre dessus (convention du skill api-plateforme-ii, §2.1).
 * Les enveloppes ne sont pas uniformes : chaque fonction lit la bonne clé.
 */
import { HTML_DATA_SLUG, SHARED_APP } from '../config'
import { ApiError, GatewayClient } from './client'
import { messages } from '@/lib/i18n/core'

export interface Doc<T> {
  _id: string
  json_data: T
  description?: string
  created_at?: string
  updated_at?: string
}

export interface FilterOptions {
  filter?: Record<string, unknown>
  projection?: Record<string, 0 | 1>
  sort?: Record<string, 1 | -1>
  limit?: number
  skip?: number
}

type Json = Record<string, unknown>

/** La profondeur la plus grande que la Gateway accepte (`mongo_filter exceeds maximum depth of 5`). */
export const MAX_FILTER_DEPTH = 5

/** La profondeur d'un filtre, comptée comme la Gateway : chaque objet un niveau, la valeur au bout aussi. */
export function filterDepth(v: unknown): number {
  if (Array.isArray(v)) return v.reduce<number>((m, x) => Math.max(m, filterDepth(x)), 1)
  if (v && typeof v === 'object') return 1 + Object.values(v).reduce<number>((m, x) => Math.max(m, filterDepth(x)), 0)
  return 1
}

const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const onlyAnd = (v: unknown): v is { $and: unknown[] } => isPlain(v) && Object.keys(v).length === 1 && Array.isArray(v.$and)

/**
 * Le même filtre, moins profond (la Gateway refuse au-delà de 5 niveaux, novembre 2026 : « À voir » et
 * l'accueil tombaient en 400) : un `$and` dans un `$and` se met à plat, et un `$and` dont les conditions
 * portent sur des champs distincts devient un seul objet. Le sens ne change jamais.
 */
export function flattenFilter<T>(v: T): T {
  if (Array.isArray(v)) return v.map(flattenFilter) as T
  if (!isPlain(v)) return v
  const out: Record<string, unknown> = {}
  for (const [k, x] of Object.entries(v)) out[k] = flattenFilter(x)
  if (!onlyAnd(out)) return out as T
  const parts = out.$and.flatMap((x) => (onlyAnd(x) ? x.$and : [x]))
  const merged: Record<string, unknown> = {}
  const disjoint = parts.every((x) => isPlain(x) && Object.keys(x).every((k) => !(k in merged) && ((merged[k] = x[k]), true)))
  if (disjoint && parts.length) return merged as T
  return { $and: parts } as T
}

function scoped(filter?: Record<string, unknown>): Record<string, unknown> | undefined {
  const f = filter && Object.keys(filter).length ? flattenFilter(filter) : undefined
  return scopedFlat(f)
}

function scopedFlat(filter?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!SHARED_APP) return filter && Object.keys(filter).length ? filter : undefined
  const slug = { 'json_data.app_identifier': { $eq: HTML_DATA_SLUG } }
  if (!filter || !Object.keys(filter).length) return slug
  // Un filtre déjà en « $and » se met à plat : la profondeur permise (5 niveaux) reste au filtre.
  const keys = Object.keys(filter)
  if (keys.length === 1 && Array.isArray(filter.$and)) return { $and: [slug, ...(filter.$and as unknown[])] }
  return { $and: [slug, filter] }
}

function stamp<T extends object>(json: T): T {
  return SHARED_APP ? ({ ...json, app_identifier: HTML_DATA_SLUG } as T) : json
}

/**
 * Une projection qui ne garde que certains champs retirerait `app_identifier`, et `belongs`
 * écarterait alors toutes les réponses : on le garde toujours.
 */
function scopedProjection(p?: Record<string, 0 | 1>): Record<string, 0 | 1> | undefined {
  if (!p || !SHARED_APP || !Object.values(p).some((v) => v === 1)) return p
  return { ...p, 'json_data.app_identifier': 1 }
}

function belongs(json: unknown): boolean {
  if (!SHARED_APP) return true
  return !!json && typeof json === 'object' && (json as Json).app_identifier === HTML_DATA_SLUG
}

export function dataApi(client: GatewayClient) {
  const base = (dataType: string) => `/api/v1/data/${encodeURIComponent(dataType)}`

  return {
    async insert<T extends object>(dataType: string, json: T, description?: string): Promise<Doc<T>> {
      const res = await client.call<{ results?: Array<{ inserted_id: string; json_data: T }> }>(base(dataType), {
        method: 'POST',
        body: { description: description ?? dataType, json_data: stamp(json) },
      })
      const first = res.results?.[0]
      if (!first?.inserted_id) throw new ApiError(messages().common.errors.saveUnconfirmed, 500, res)
      return { _id: first.inserted_id, json_data: stamp(json) }
    },

    async insertMany<T extends object>(dataType: string, items: T[], description?: string): Promise<Doc<T>[]> {
      if (!items.length) return []
      const res = await client.call<{ results?: Array<{ inserted_id: string; json_data: T }> }>(`${base(dataType)}/many`, {
        method: 'POST',
        body: { descriptions: items.map(() => description ?? dataType), json_data: items.map(stamp) },
      })
      return (res.results ?? []).map((r) => ({ _id: r.inserted_id, json_data: r.json_data }))
    },

    async filter<T>(dataType: string, options: FilterOptions = {}): Promise<Doc<T>[]> {
      const body: Json = {}
      const f = scoped(options.filter)
      if (f) body.mongo_filter = f
      if (options.projection) body.projection = scopedProjection(options.projection)
      body.sort = options.sort ?? { _id: -1 }
      if (options.limit !== undefined) body.limit = options.limit
      if (options.skip !== undefined) body.skip = options.skip
      const res = await client.call<{ results?: Doc<T>[] }>(`${base(dataType)}/filter`, { method: 'POST', body })
      return (res.results ?? []).filter((d) => belongs(d.json_data))
    },

    async count(dataType: string, filter?: Record<string, unknown>): Promise<number> {
      const f = scoped(filter)
      const res = await client.call<{ count?: number }>(`${base(dataType)}/count`, {
        method: 'POST',
        body: f ? { mongo_filter: f } : {},
      })
      return typeof res.count === 'number' ? res.count : 0
    },

    async distinct(dataType: string, field: string, filter?: Record<string, unknown>): Promise<unknown[]> {
      const f = scoped(filter)
      const res = await client.call<{ values?: unknown[] }>(`${base(dataType)}/distinct`, {
        method: 'POST',
        body: f ? { field, mongo_filter: f } : { field },
      })
      return res.values ?? []
    },

    /** Un document par id ; `null` s'il n'existe pas (404) ou n'appartient pas à CLIP V2. */
    async get<T>(dataType: string, id: string): Promise<Doc<T> | null> {
      try {
        const res = await client.call<{ result?: Doc<T> }>(`${base(dataType)}/one/${encodeURIComponent(id)}`)
        const doc = res.result
        if (!doc || !belongs(doc.json_data)) return null
        return doc
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },

    /** Mise à jour partielle : seules les clés fournies changent (notation pointée permise). */
    async patch(dataType: string, id: string, partial: Json): Promise<void> {
      if (!Object.keys(partial).length) return
      await client.call(`${base(dataType)}/one/${encodeURIComponent(id)}`, { method: 'PATCH', body: { json_data: partial } })
    },

    /** Remplacement complet : `json` doit être le document entier relu (champs inconnus compris). */
    async replace<T extends object>(dataType: string, id: string, json: T): Promise<void> {
      await client.call(`${base(dataType)}/one/${encodeURIComponent(id)}`, { method: 'PUT', body: { json_data: stamp(json) } })
    },

    async remove(dataType: string, id: string): Promise<void> {
      try {
        await client.call(`${base(dataType)}/${encodeURIComponent(id)}`, { method: 'DELETE' })
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return
        throw e
      }
    },
  }
}

export type DataApi = ReturnType<typeof dataApi>
