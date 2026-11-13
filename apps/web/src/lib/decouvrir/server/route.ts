/**
 * Les routes `/api/decouvrir/*` : interrupteur allumé seulement (sinon 404, rien ne change), avec la
 * session de l'espace (cookie `clip_decouvrir`), revérifiée au plus tard toutes les 15 minutes. Une session
 * fermée répond 401 (`session`) ou 403 (`aucun_acces`, `expire`) avec sa raison, et efface le cookie : le
 * navigateur retourne à l'écran d'entrée. Les jetons renouvelés repartent dans la même réponse (Set-Cookie).
 * Serveur seulement ; aucun texte d'écran (le navigateur traduit les raisons).
 */
import { NextResponse, type NextRequest } from 'next/server'
import type { CloseReason } from '../contract'
import { verify, type Deps } from './access'
import { accessMode, decouvrirConfig } from './config'
import { cookieOptions, DECOUVRIR_COOKIE, openSession, sealSession, type DecouvrirSession } from './session'
import { refreshTokens } from './tokens'

export function decouvrirDeps(): Deps {
  const config = decouvrirConfig()
  return {
    fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }),
    now: Date.now,
    config,
    refresh: (r, app) => refreshTokens(r, app, config.gateway),
  }
}

/** Interrupteur éteint : l'API de l'espace n'existe pas. */
export function inactive() {
  return NextResponse.json({ ok: false, raison: 'inactif' }, { status: 404 })
}

export function isLinked() {
  return accessMode() === 'sandboxes'
}

/** Pose le cookie de la session ; faux si `SESSION_SECRET` manque (la route le dit, sans erreur technique). */
export function setDecouvrirCookie(res: NextResponse, s: DecouvrirSession): boolean {
  const sealed = sealSession(s)
  if (!sealed) {
    console.error('[decouvrir] SESSION_SECRET manquant ou trop court (32 caractères au moins) : la session ne peut pas être scellée.')
    return false
  }
  res.cookies.set(DECOUVRIR_COOKIE, sealed, cookieOptions())
  return true
}

export function readSession(req: NextRequest): DecouvrirSession | null {
  return openSession(req.cookies.get(DECOUVRIR_COOKIE)?.value)
}

/** La session se ferme : sa raison (et la fin), et le cookie effacé. Sans raison (aucune session) : 401. */
export function closed(raison: CloseReason | null, fin?: number | null) {
  const body = raison ? { ok: false, raison, ...(fin ? { fin } : {}) } : { ok: false }
  const res = NextResponse.json(body, { status: raison === 'aucun_acces' || raison === 'expire' ? 403 : 401 })
  res.cookies.delete(DECOUVRIR_COOKIE)
  return res
}

interface Ctx {
  session: DecouvrirSession
  deps: Deps
  /** Des jetons renouvelés pendant la requête : ils repartent dans la réponse. */
  update(s: DecouvrirSession): void
  /** Ferme la session (jetons refusés après un renouvellement). */
  close(raison: CloseReason): NextResponse
}

export async function withDecouvrir(req: NextRequest, handler: (ctx: Ctx) => Promise<NextResponse>): Promise<NextResponse> {
  if (!isLinked()) return inactive()
  const current = readSession(req)
  if (!current) return closed(null)
  const deps = decouvrirDeps()
  const v = await verify(current, deps)
  if (v.closed) return closed(v.raison, v.fin)
  let session = v.session
  let changed = v.changed
  let ended = false
  const res = await handler({
    session,
    deps,
    update: (s) => {
      session = s
      changed = true
    },
    close: (raison) => {
      ended = true
      return closed(raison)
    },
  })
  if (changed && !ended) setDecouvrirCookie(res, session)
  if (!res.headers.has('Cache-Control')) res.headers.set('Cache-Control', 'no-store')
  return res
}

/**
 * Le corps JSON d'une requête, borné en taille. `Content-Type: application/json` est exigé : un formulaire
 * d'un autre site ne peut l'envoyer (pas de connexion forcée, ni d'écriture au nom de la personne).
 */
export async function readJson(req: NextRequest, maxBytes: number): Promise<{ ok: true; body: unknown } | { ok: false; status: 400 | 413 | 415 }> {
  if (!(req.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) return { ok: false, status: 415 }
  const declared = Number(req.headers.get('content-length') ?? Number.NaN)
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, status: 413 }
  const raw = await req.text().catch(() => '')
  if (Buffer.byteLength(raw, 'utf8') > maxBytes) return { ok: false, status: 413 }
  try {
    return { ok: true, body: JSON.parse(raw) }
  } catch {
    return { ok: false, status: 400 }
  }
}
