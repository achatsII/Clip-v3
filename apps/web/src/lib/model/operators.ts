/**
 * L'équipe au poste (toggle `operators`) : des personnes sans compte, un nom et un code à
 * 4 chiffres. Le code est donné et vérifié par le serveur (`/api/operators/pin`,
 * `/api/operators/verify`) ; ici, la liste, l'ajout, et la session de la tablette.
 */
import { ApiError, getAccessToken } from '../gateway/client'
import type { DataApi, Doc } from '../gateway/data'
import { messages } from '../i18n'
import { mapPool } from '../util/pool'
import { nowIso, T } from './repo'
import type { Operator } from './types'

/** La liste ne montre jamais l'empreinte d'un code. */
const NO_PIN = { 'json_data.pinHash': 0 } as const

/** Les personnes de l'équipe (actives par défaut), par nom. */
export async function listOperators(data: DataApi, opts: { all?: boolean } = {}): Promise<Doc<Operator>[]> {
  return data.filter<Operator>(T.operator, { filter: opts.all ? {} : { 'json_data.active': true }, projection: NO_PIN, sort: { 'json_data.name': 1 }, limit: 2000 })
}

/** Les noms d'une liste collée (une personne par ligne) : puces et numéros retirés, sans doublon. */
export function parseNames(text: string, existing: string[] = []): string[] {
  const seen = new Set(existing.map((n) => n.trim().toLowerCase()))
  const out: string[] = []
  for (const raw of text.split(/\r?\n|;|\t/)) {
    const name = raw
      .replace(/^\s*(?:[-*•·]|\d+[.)-])\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    out.push(name)
    if (out.length >= 200) break
  }
  return out
}

/**
 * Ajoute des personnes (quatre à la fois) ; elles n'ont pas encore de code. Celles qui n'ont pas pu
 * être ajoutées sont nommées, avec la première raison du refus.
 */
export async function addOperators(
  data: DataApi,
  names: string[],
  extra: Partial<Pick<Operator, 'team' | 'shift' | 'stationIds'>> = {},
): Promise<{ added: Doc<Operator>[]; failed: string[]; error: unknown }> {
  const at = nowIso()
  let error: unknown = null
  const results = await mapPool(names, 4, (name) =>
    data.insert<Operator>(T.operator, { name, stationIds: extra.stationIds ?? [], team: extra.team, shift: extra.shift ?? null, active: true, createdAt: at }, name).catch((e: unknown) => {
      error ??= e
      return null
    }),
  )
  return { added: results.filter((d): d is Doc<Operator> => !!d), failed: names.filter((_, i) => !results[i]), error }
}

/** Le refus du serveur, dans la langue de l'outil (la route rend un code, jamais une phrase). */
function teamError(code: string | undefined, status: number): ApiError {
  const t = messages().team.errors
  const text = code && Object.prototype.hasOwnProperty.call(t, code) ? t[code as keyof typeof t] : t.saveFailed
  return new ApiError(text, status, null, code)
}

/** Donne un nouveau code à une personne ; le code revient une seule fois. */
export async function giveCode(operatorId: string): Promise<{ pin: string; pinSetAt: string }> {
  const res = await fetch('/api/operators/pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken() ?? ''}` },
    body: JSON.stringify({ operatorId }),
  }).catch(() => null)
  if (!res) throw teamError('network', 0)
  const json = (await res.json().catch(() => ({}))) as { pin?: string; pinSetAt?: string; error?: string }
  if (!res.ok || !json.pin) throw teamError(json.error, res.status)
  return { pin: json.pin, pinSetAt: json.pinSetAt ?? nowIso() }
}

export type VerifyResult = { ok: true; session: StationSession } | { ok: false; error: 'wrongPin' | 'locked' | 'noPin' | 'unknown' | 'linkOutdated' | 'unavailable' | 'deadLink' | 'network'; until?: number }

/** Au poste : le code tapé est-il le bon ? */
export async function verifyCode(link: string, operatorId: string, pin: string): Promise<VerifyResult> {
  const res = await fetch('/api/operators/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link, operatorId, pin }) }).catch(() => null)
  if (!res) return { ok: false, error: 'network' }
  const json = (await res.json().catch(() => ({}))) as { session?: string; operator?: { id: string; name: string }; exp?: number; error?: string; until?: number }
  if (res.ok && json.session && json.operator) return { ok: true, session: { session: json.session, operator: json.operator, exp: json.exp ?? Date.now() + 12 * 3600_000, lastActive: Date.now() } }
  const known = ['wrongPin', 'locked', 'noPin', 'unknown', 'linkOutdated', 'unavailable', 'deadLink'] as const
  const error = (known as readonly string[]).includes(json.error ?? '') ? (json.error as (typeof known)[number]) : 'unavailable'
  return { ok: false, error, until: json.until }
}

/* ───────────────────────── La session de la tablette ───────────────────────── */

/** Qui travaille au poste, jusqu'à quand (signé par le serveur). */
export interface StationSession {
  session: string
  operator: { id: string; name: string }
  exp: number
  lastActive: number
}

/** Personne n'y touche pendant 30 minutes : la tablette redemande qui travaille. */
export const IDLE_MS = 30 * 60_000
const key = (link: string) => `clip_op_${link}`

export function loadStationSession(link: string, now = Date.now()): StationSession | null {
  try {
    const raw = localStorage.getItem(key(link))
    if (!raw) return null
    const s = JSON.parse(raw) as StationSession
    if (!s?.operator?.id || s.exp <= now || now - s.lastActive > IDLE_MS) {
      localStorage.removeItem(key(link))
      return null
    }
    return s
  } catch {
    return null
  }
}

export function saveStationSession(link: string, s: StationSession | null) {
  try {
    if (s) localStorage.setItem(key(link), JSON.stringify(s))
    else localStorage.removeItem(key(link))
  } catch {
    /* sans stockage, la session dure le temps de la page */
  }
}

/** Les personnes du poste d'abord, puis les autres. */
export function orderForStation(ops: Doc<Operator>[], stationId: string | null): { mine: Doc<Operator>[]; others: Doc<Operator>[] } {
  const mine = stationId ? ops.filter((o) => o.json_data.stationIds?.includes(stationId)) : []
  const ids = new Set(mine.map((o) => o._id))
  return { mine, others: ops.filter((o) => !ids.has(o._id)) }
}
