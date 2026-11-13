/**
 * L'accès à l'espace Découvrir par Sandboxes, côté serveur (docs/INTEGRATION.md du dépôt `sandboxes`, §1 à
 * §3, et docs/DECOUVRIR.md de ce dépôt) :
 *  - Connexion : l'application de Clip d'abord, confirmée par une lecture autorisée (un client) — sautée
 *    tant que Clip partage l'application `html` ; sinon l'application des prospects (`sandboxes`) et
 *    `POST /api/v1/acces` (un prospect, ou l'équipe d'II, jusqu'à `fin`) ; sinon « mot de passe incorrect ».
 *  - Revérification au plus tard toutes les 15 minutes ; un accès révoqué ou arrivé à sa fin ferme la session.
 *  - Relais vers l'API de Sandboxes avec la clé de Clip (`SANDBOXES_CLE`), toujours du serveur.
 *  - La décision de l'intercepteur (`gate`), sans appel réseau.
 * Sans état : fetch, l'heure et le renouvellement des jetons sont injectés (les tests les simulent).
 */
import { LOGIN_PATH } from '../catalog'
import type { AccessMode, CloseReason, PersonType } from '../contract'
import type { DecouvrirConfig } from './config'
import type { Company, DecouvrirSession, Person } from './session'
import { withTokens, type TokenResponse } from './tokens'

/** L'accès se revérifie au plus tard toutes les 15 minutes. */
export const VERIFY_EVERY_MS = 15 * 60_000
/** Sandboxes injoignable pendant une revérification : la session tient, et l'essai se refait une minute plus tard. */
export const RETRY_SOON_MS = 60_000
const TIMEOUT_MS = 8_000

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>

export interface Deps {
  fetch: Fetch
  now: () => number
  config: DecouvrirConfig
  /** Renouvelle les jetons auprès de l'application qui les a émis (un seul renouvellement en vol par jeton). */
  refresh: (refresh: string, app: string) => Promise<TokenResponse | null>
}

type Json = Record<string, unknown>

async function call(deps: Deps, url: string, init: RequestInit, timeoutMs = TIMEOUT_MS): Promise<{ status: number; json: Json | null }> {
  try {
    const res = await deps.fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    const body = await res.text().catch(() => '')
    let json: unknown = null
    try {
      json = body ? JSON.parse(body) : null
    } catch {
      json = null
    }
    return { status: res.status, json: json && typeof json === 'object' && !Array.isArray(json) ? (json as Json) : null }
  } catch {
    return { status: 0, json: null }
  }
}

/** Une panne n'est pas un refus : rien reçu, trop d'appels, ou une erreur du serveur. */
const outage = (status: number) => status === 0 || status === 429 || status >= 500
const text = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

function person(v: unknown): Person | undefined {
  const p = (v ?? {}) as Json
  const id = text(p.id)
  const courriel = text(p.courriel, 320)
  return id ? { id, courriel, nom: text(p.nom) || courriel.split('@')[0] } : undefined
}

function company(v: unknown): Company | null | undefined {
  if (v === null) return null
  const c = (v ?? {}) as Json
  const id = text(c.id)
  return id ? { id, nom: text(c.nom, 300) } : undefined
}

/* ───────────────────────────── La passerelle ───────────────────────────── */

type TokenTry = { kind: 'ok'; tokens: TokenResponse & { access_token: string } } | { kind: 'refus'; status: number } | { kind: 'panne'; status: number }

async function requestToken(email: string, password: string, app: string, deps: Deps): Promise<TokenTry> {
  const r = await call(deps, `${deps.config.gateway}/api/v1/auth/token?app_identifier=${encodeURIComponent(app)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (r.status === 200 && typeof r.json?.access_token === 'string') return { kind: 'ok', tokens: r.json as unknown as TokenResponse & { access_token: string } }
  return outage(r.status) ? { kind: 'panne', status: r.status } : { kind: 'refus', status: r.status }
}

/** Une vraie cliente : le jeton de Clip lit ses données (POST …/count, la lecture la moins coûteuse ; le GET ignore le filtre). */
async function probeClient(access: string, deps: Deps): Promise<'oui' | 'non' | 'jeton' | 'panne'> {
  const r = await call(deps, `${deps.config.gateway}/api/v1/data/${encodeURIComponent(deps.config.probeType)}/count`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (r.status === 200) return 'oui'
  if (r.status === 401) return 'jeton'
  return outage(r.status) ? 'panne' : 'non'
}

async function readProfile(access: string, deps: Deps): Promise<{ personne: Person; entreprise: Company | null } | null> {
  const r = await call(deps, `${deps.config.gateway}/api/v1/auth/me`, { method: 'GET', headers: { Authorization: `Bearer ${access}` } })
  if (r.status !== 200 || !r.json) return null
  const res = (r.json.results ?? {}) as Json
  const profile = (res.profile ?? {}) as Json
  const org = (res.organization ?? {}) as Json
  // Le courriel est dans `results.email` ou, pour certains comptes, seulement dans `results.profile.email`.
  const courriel = text(res.email, 320) || text(profile.email, 320)
  const nom = text(profile.fullname) || text(res.name) || [text(res.first_name), text(res.last_name)].filter(Boolean).join(' ') || courriel.split('@')[0]
  const id = text(((r.json.user ?? {}) as Json).sub) || courriel
  return { personne: { id, courriel, nom }, entreprise: text(org.id) ? { id: text(org.id), nom: text(org.name, 300) } : null }
}

function tokensOf(t: TokenResponse & { access_token: string }, now: number) {
  return { access: t.access_token, refresh: t.refresh_token ?? '', exp: now + Math.max(60, Number(t.expires_in ?? 3600)) * 1000 }
}

/* ───────────────────────────── Sandboxes ───────────────────────────── */

const sandboxesHeaders = (cle: string) => ({ Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' })

export type AccessAnswer =
  | { kind: 'ok'; type: PersonType; fin: number | null; personne?: Person; entreprise?: Company | null }
  | { kind: 'refus'; raison: 'aucun_acces' | 'expire'; fin?: number }
  | { kind: 'jeton' }
  /** `status` et `raison` : ce que Sandboxes a répondu (0 : rien), pour le journal du serveur. */
  | { kind: 'panne'; status?: number; raison?: string }
  /** Sandboxes n'est pas configuré (SANDBOXES_URL ou SANDBOXES_CLE manquant). */
  | { kind: 'absent' }

/**
 * POST /api/v1/acces : la personne peut-elle entrer ? Avec `via: "produit"`, Clip l'a connectée lui-même et
 * informe seulement Sandboxes : l'appel est bref (3 s) et sa réponse ne bloque jamais l'entrée.
 */
export async function checkAccess(jeton: string, via: 'produit' | 'sandboxes', deps: Deps): Promise<AccessAnswer> {
  const sbx = deps.config.sandboxes
  if (!sbx) return { kind: 'absent' }
  const r = await call(deps, `${sbx.url}/api/v1/acces`, { method: 'POST', headers: sandboxesHeaders(sbx.cle), body: JSON.stringify({ jeton, via }) }, via === 'produit' ? 3_000 : TIMEOUT_MS)
  const j = r.json
  if (j?.ok === true) {
    // L'équipe d'II est « equipe » quel que soit `via` (ses visites ne comptent dans aucune statistique).
    const type: PersonType | null = j.type === 'equipe' ? 'equipe' : via === 'produit' ? 'client' : j.type === 'prospect' ? 'prospect' : null
    if (!type) return { kind: 'panne', status: r.status, raison: 'type inconnu' }
    return { kind: 'ok', type, fin: type === 'prospect' ? (num(j.fin) ?? null) : null, personne: person(j.personne), entreprise: company(j.entreprise) }
  }
  if (j?.ok === false && (j.raison === 'aucun_acces' || j.raison === 'expire')) return { kind: 'refus', raison: j.raison, fin: num(j.fin) }
  if (j?.raison === 'jeton_invalide') return { kind: 'jeton' }
  // 401 sans jeton_invalide : la clé de Clip est inconnue de Sandboxes — une panne de configuration, pas un refus.
  return { kind: 'panne', status: r.status, raison: text(j?.raison) || undefined }
}

export type RelayResult = { kind: 'ok'; json: Json | null } | { kind: 'absent' } | { kind: 'erreur'; status: number }

/** Relaie un appel à l'API de Sandboxes (suivi, conversation, besoin) avec la clé de Clip. */
export async function relay(method: 'POST' | 'PUT', path: string, body: unknown, deps: Deps): Promise<RelayResult> {
  const sbx = deps.config.sandboxes
  if (!sbx) return { kind: 'absent' }
  const r = await call(deps, `${sbx.url}${path}`, { method, headers: sandboxesHeaders(sbx.cle), body: JSON.stringify(body) })
  if (r.status >= 200 && r.status < 300 && r.json?.ok !== false) return { kind: 'ok', json: r.json }
  return { kind: 'erreur', status: r.status }
}

/** La personne telle que Sandboxes la reçoit avec chaque suivi, conversation et besoin : tirée du cookie, jamais du navigateur. */
export function personOf(s: DecouvrirSession) {
  return {
    id: s.personne.id.slice(0, 200),
    courriel: s.personne.courriel.slice(0, 320),
    nom: s.personne.nom.slice(0, 200),
    entrepriseId: (s.entreprise?.id ?? '').slice(0, 200),
    type: s.type,
  }
}

/** Ce que le navigateur peut savoir de sa session (aucun jeton). */
export function publicInfo(s: DecouvrirSession) {
  return { type: s.type, fin: s.fin, personne: { nom: s.personne.nom, courriel: s.personne.courriel }, entreprise: s.entreprise ? { nom: s.entreprise.nom } : null }
}

/* ───────────────────────────── Connexion ───────────────────────────── */

export type SignInFailure = 'aucun_acces' | 'expire' | 'identifiants' | 'indisponible'

export type SignInResult = { ok: true; session: DecouvrirSession } | { ok: false; status: number; raison: SignInFailure; fin?: number }

/**
 * La connexion à l'espace (§2) : 1. l'application de Clip, confirmée par une lecture autorisée (client ;
 * Sandboxes en est informé sans bloquer) — sautée sans application propre ; 2. sinon `sandboxes` et
 * POST /acces (prospect ou équipe, jusqu'à `fin`) ; 3. sinon « Courriel ou mot de passe incorrect. ».
 * Une panne n'est jamais un mauvais mot de passe ; un seul message pour un mauvais mot de passe, quelle
 * que soit l'application qui a refusé.
 */
export async function signIn(email: string, password: string, deps: Deps): Promise<SignInResult> {
  const { config } = deps
  const now = deps.now()
  let credentialsOk = false
  let down = false
  // Ce qui s'est passé, étape par étape, pour le journal du serveur (jamais le courriel ni un jeton).
  const trace: string[] = []
  const unavailable = (): SignInResult => {
    console.warn(`[decouvrir] connexion indisponible : ${trace.join(' · ')}`)
    return { ok: false, status: 503, raison: 'indisponible' }
  }

  if (config.productApp) {
    const product = await requestToken(email, password, config.productApp, deps)
    trace.push(`app ${config.productApp} ${product.kind === 'ok' ? 'ok' : `${product.kind} ${product.status}`}`)
    if (product.kind === 'ok') {
      credentialsOk = true
      const access = product.tokens.access_token
      const probe = await probeClient(access, deps)
      trace.push(`sonde ${probe}`)
      if (probe === 'oui') {
        const [profile, known] = await Promise.all([readProfile(access, deps), checkAccess(access, 'produit', deps)])
        const fromSbx = known.kind === 'ok' ? known : null
        const personne = fromSbx?.personne ?? profile?.personne ?? { id: email, courriel: email, nom: email.split('@')[0] }
        const entreprise = fromSbx?.entreprise ?? profile?.entreprise ?? null
        const type = fromSbx?.type === 'equipe' ? 'equipe' : 'client'
        return { ok: true, session: { ...tokensOf(product.tokens, now), app: config.productApp, type, fin: null, personne, entreprise, verifieA: now } }
      }
      if (probe === 'panne') down = true
    } else if (product.kind === 'panne') down = true
  }

  const prospect = await requestToken(email, password, config.sandboxesApp, deps)
  trace.push(`app ${config.sandboxesApp} ${prospect.kind === 'ok' ? 'ok' : `${prospect.kind} ${prospect.status}`}`)
  if (prospect.kind === 'ok') {
    const access = prospect.tokens.access_token
    const answer = await checkAccess(access, 'sandboxes', deps)
    trace.push(`Sandboxes ${answer.kind}${answer.kind === 'panne' ? ` ${answer.status ?? ''} ${answer.raison ?? ''}`.trimEnd() : ''}`)
    if (answer.kind === 'ok') {
      const profile = answer.personne && answer.entreprise !== undefined ? null : await readProfile(access, deps)
      const personne = answer.personne ?? profile?.personne ?? { id: email, courriel: email, nom: email.split('@')[0] }
      const entreprise = answer.entreprise !== undefined ? answer.entreprise : (profile?.entreprise ?? null)
      return { ok: true, session: { ...tokensOf(prospect.tokens, now), app: config.sandboxesApp, type: answer.type, fin: answer.fin, personne, entreprise, verifieA: now } }
    }
    if (answer.kind === 'refus') return { ok: false, status: 403, raison: answer.raison, ...(answer.fin ? { fin: answer.fin } : {}) }
    // Sans Sandboxes configuré, les prospects sont refusés avec un message clair, jamais une erreur technique.
    if (answer.kind === 'absent') {
      console.warn('[decouvrir] SANDBOXES_URL ou SANDBOXES_CLE manquant : un prospect est refusé (aucun_acces).')
      return { ok: false, status: 403, raison: 'aucun_acces' }
    }
    return unavailable()
  }
  if (prospect.kind === 'panne') down = true

  if (down) return unavailable()
  // De bons identifiants sans aucun accès : « pas encore ouvert », pas « mot de passe incorrect ».
  if (credentialsOk) return { ok: false, status: 403, raison: 'aucun_acces' }
  return { ok: false, status: 401, raison: 'identifiants' }
}

/* ───────────────────────────── Revérification ───────────────────────────── */

export type VerifyResult = { closed: false; session: DecouvrirSession; changed: boolean } | { closed: true; raison: CloseReason; fin?: number }

/**
 * À chaque route de l'espace : une fin passée ferme la session sans appel ; au-delà de 15 minutes depuis la
 * dernière vérification, l'accès est revérifié (jetons renouvelés au besoin, avec l'application qui les a
 * émis). Un refus ferme la session ; Sandboxes injoignable ne bloque pas la personne (nouvel essai dans une
 * minute) : pendant une panne, un accès révoqué reste donc ouvert quelques minutes de plus.
 */
export async function verify(s: DecouvrirSession, deps: Deps): Promise<VerifyResult> {
  const now = deps.now()
  if (s.fin !== null && s.fin <= now) return { closed: true, raison: 'expire', fin: s.fin }
  if (now - s.verifieA < VERIFY_EVERY_MS) return { closed: false, session: s, changed: false }

  let cur = s
  const renew = async () => {
    const t = cur.refresh ? await deps.refresh(cur.refresh, cur.app) : null
    if (!t?.access_token) return false
    cur = withTokens(cur, t, now)
    return true
  }
  const later = (): VerifyResult => ({ closed: false, session: { ...cur, verifieA: now - VERIFY_EVERY_MS + RETRY_SOON_MS }, changed: true })

  if (cur.exp - now < 60_000 && !(await renew())) return { closed: true, raison: 'session' }

  if (deps.config.productApp && cur.app === deps.config.productApp) {
    let probe = await probeClient(cur.access, deps)
    if (probe === 'jeton') probe = (await renew()) ? await probeClient(cur.access, deps) : 'jeton'
    if (probe === 'jeton') return { closed: true, raison: 'session' }
    // Un client qui perd son accès à Clip perd l'espace.
    if (probe === 'non') return { closed: true, raison: 'aucun_acces' }
    if (probe === 'panne') return later()
    // Sandboxes garde la trace de la visite ; sa réponse ne ferme jamais la session d'un client.
    const known = await checkAccess(cur.access, 'produit', deps)
    const type = known.kind === 'ok' && known.type === 'equipe' ? 'equipe' : cur.type
    return { closed: false, session: { ...cur, type, verifieA: now }, changed: true }
  }

  let answer = await checkAccess(cur.access, 'sandboxes', deps)
  if (answer.kind === 'jeton') answer = (await renew()) ? await checkAccess(cur.access, 'sandboxes', deps) : answer
  switch (answer.kind) {
    case 'ok':
      return {
        closed: false,
        session: { ...cur, type: answer.type, fin: answer.fin, personne: answer.personne ?? cur.personne, entreprise: answer.entreprise !== undefined ? answer.entreprise : cur.entreprise, verifieA: now },
        changed: true,
      }
    case 'refus':
      return { closed: true, raison: answer.raison, ...(answer.fin ? { fin: answer.fin } : {}) }
    case 'absent':
      return { closed: true, raison: 'aucun_acces' }
    case 'jeton':
      return { closed: true, raison: 'session' }
    default:
      return later()
  }
}

/* ───────────────────────────── Le relais de l'IA ───────────────────────────── */

/** Les seules routes de la passerelle que la session de l'espace peut appeler : l'assistant et le téléversement du conseiller. */
const GATEWAY_ROUTES = new Set(['POST /api/v4/assistant/ask', 'POST /api/v1/files/upload/direct'])

export function gatewayRouteAllowed(method: string, path: string): boolean {
  return GATEWAY_ROUTES.has(`${method.toUpperCase()} ${path}`)
}

/* ───────────────────────────── L'intercepteur ───────────────────────────── */

/** Une suite sûre après l'entrée : un chemin de Clip, jamais un autre site ni l'écran d'entrée lui-même. */
export function safeNext(p: string | null | undefined): string | null {
  if (!p || !p.startsWith('/') || p.startsWith('//') || p.includes('\\') || p.startsWith(LOGIN_PATH)) return null
  return p
}

export type GateDecision = { kind: 'next'; clear?: boolean } | { kind: 'redirect'; location: string; clear?: boolean } | { kind: 'absent' }

/**
 * La décision de l'intercepteur (`src/proxy.ts`) pour `/decouvrir`, ses pages et `/api/decouvrir/*`, sans
 * appel réseau : interrupteur éteint, rien ne change, l'écran d'entrée renvoie à l'espace et l'API de
 * l'espace n'existe pas (404) ; allumé, sans session valide, l'écran d'entrée, avec la suite, le courriel
 * prérempli et, si l'accès a pris fin, son message. Les fichiers (vidéos, affiches, sous-titres) restent
 * publics ; les routes de l'API vérifient elles-mêmes la session (et la revérifient toutes les 15 minutes).
 */
export function gate(input: { mode: AccessMode; pathname: string; search: string; session: DecouvrirSession | null; now: number }): GateDecision {
  const { mode, pathname, search, session, now } = input
  if (pathname === '/api/decouvrir' || pathname.startsWith('/api/decouvrir/')) return mode === 'sandboxes' ? { kind: 'next' } : { kind: 'absent' }
  const login = pathname === LOGIN_PATH
  if (mode !== 'sandboxes') return login ? { kind: 'redirect', location: '/decouvrir' } : { kind: 'next' }
  if (pathname.startsWith('/decouvrir/videos/') || /\.[A-Za-z0-9]+$/.test(pathname)) return { kind: 'next' }
  const ended = !!session && session.fin !== null && session.fin <= now
  const valid = !!session && !ended
  const params = new URLSearchParams(search)
  if (login) return valid ? { kind: 'redirect', location: safeNext(params.get('suite')) ?? '/decouvrir' } : { kind: 'next', clear: ended }
  if (valid) return { kind: 'next' }
  // Le courriel prérempli (lien « Ouvrir l'espace » du portail de Sandboxes) ne reste pas dans la suite.
  const courriel = params.get('courriel')
  params.delete('courriel')
  const qs = params.toString()
  const suite = `${pathname}${qs ? `?${qs}` : ''}`
  const to = new URLSearchParams()
  if (suite !== '/decouvrir') to.set('suite', suite)
  if (courriel) to.set('courriel', courriel)
  if (ended && session?.fin) {
    to.set('raison', 'expire')
    to.set('fin', String(session.fin))
  }
  const q = to.toString()
  return { kind: 'redirect', location: `${LOGIN_PATH}${q ? `?${q}` : ''}`, clear: ended }
}
