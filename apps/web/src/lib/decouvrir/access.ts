/**
 * L'accès à l'espace Découvrir, côté navigateur. Le mode (`DECOUVRIR_ACCES`) vient du serveur, au build,
 * par la coque de l'espace. Interrupteur allumé : la session (type, fin, personne ; jamais les jetons), la
 * sortie, et les appels du conseiller — l'assistant et le téléversement par /api/decouvrir/gw, la
 * conversation et les besoins vers Sandboxes par les routes de Clip. Une session fermée renvoie à l'écran
 * d'entrée avec sa raison. Navigateur seulement.
 */
import { createContext, useContext, useSyncExternalStore } from 'react'
import type { AdvisorThread } from './advisor'
import { LOGIN_PATH } from './catalog'
import { isCloseReason, type AccessMode, type ConversationPayload, type Need, type PersonType } from './contract'
import { closeSession, endVisit, flush, markExit } from './tracker'

/** Ce que la coque sait au build : le mode, et si les clients de Clip entrent avec leur compte. */
export interface AccessSetup {
  mode: AccessMode
  clients: boolean
}

export const AccessContext = createContext<AccessSetup>({ mode: 'ouvert', clients: false })

export function useAccessSetup(): AccessSetup {
  return useContext(AccessContext)
}

export interface AccessInfo {
  type: PersonType
  fin: number | null
  personne: { nom: string; courriel: string }
  entreprise: { nom: string } | null
}

interface AccessState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  info: AccessInfo | null
}

let state: AccessState = { status: 'idle', info: null }
const listeners = new Set<() => void>()
const setState = (s: AccessState) => {
  state = s
  listeners.forEach((fn) => fn())
}
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
const IDLE: AccessState = { status: 'idle', info: null }

/** La session de l'espace relié, telle que le navigateur la connaît. */
export function useAccess(): AccessState {
  return useSyncExternalStore(subscribe, () => state, () => IDLE)
}

/** Une réponse d'une route /api/decouvrir/* qui ferme la session : retour à l'écran d'entrée. */
export async function closesSession(res: Response): Promise<boolean> {
  if (res.status !== 401 && res.status !== 403) return false
  const b = (await res.clone().json().catch(() => ({}))) as { raison?: unknown; fin?: unknown }
  // Un 403 qui ne vient pas de la session (un droit manquant à la passerelle) ne déconnecte jamais.
  if (res.status === 403 && !isCloseReason(b.raison)) return false
  closeSession(isCloseReason(b.raison) ? b.raison : null, typeof b.fin === 'number' ? b.fin : null)
  return true
}

/** Lit la session (le serveur la revérifie au besoin). */
export async function loadAccess(): Promise<void> {
  if (state.status === 'loading') return
  setState({ ...state, status: 'loading' })
  try {
    const res = await fetch('/api/decouvrir/session', { cache: 'no-store' })
    if (await closesSession(res)) return
    const body = (await res.json().catch(() => ({}))) as { session?: AccessInfo }
    setState(res.ok && body.session ? { status: 'ready', info: body.session } : { status: 'error', info: state.info })
  } catch {
    setState({ status: 'error', info: state.info })
  }
}

/** Se déconnecter : la file du suivi part d'abord, puis le cookie s'efface. */
export async function signOut(): Promise<void> {
  // La durée de la visite part avec le dernier lot, avant que la session se ferme.
  markExit()
  await flush().catch(() => undefined)
  try {
    await fetch('/api/decouvrir/session', { method: 'DELETE' })
  } catch {
    /* hors ligne : le cookie reste, mais la personne quitte l'espace */
  }
  endVisit()
  clearThread()
  setState(IDLE)
  window.location.assign(LOGIN_PATH)
}

/** Une erreur du conseiller : le statut (0 : réseau), et ce qui l'a causée. */
export class AdvisorError extends Error {
  status: number
  code: 'network' | 'timeout' | 'closed' | 'http' | 'upload'
  constructor(code: AdvisorError['code'], status = 0) {
    super(code)
    this.name = 'AdvisorError'
    this.code = code
    this.status = status
  }
}

async function relayFetch(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`/api/decouvrir/gw${path}`, { ...init, method: 'POST', signal: ctrl.signal, cache: 'no-store' })
    if (await closesSession(res)) throw new AdvisorError('closed', res.status)
    return res
  } catch (e) {
    if (e instanceof AdvisorError) throw e
    throw new AdvisorError(ctrl.signal.aborted ? 'timeout' : 'network')
  } finally {
    clearTimeout(timer)
  }
}

export interface AskResults {
  assistant_response?: string
  parsed_json?: unknown
}

/** L'assistant de la passerelle, par le relais de l'espace, avec les jetons de la session Découvrir. */
export async function advisorAsk(body: Record<string, unknown>): Promise<AskResults> {
  const res = await relayFetch('/api/v4/assistant/ask', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 120_000)
  const env = (await res.json().catch(() => null)) as { success?: boolean; results?: AskResults & { error?: unknown } } | null
  if (!res.ok || !env || env.success === false || env.results?.error) throw new AdvisorError('http', res.ok ? 502 : res.status)
  return env.results ?? {}
}

/** Un document pour l'analyse (PDF, image) : son adresse publique va dans `files` de l'assistant. */
export async function advisorUpload(file: File): Promise<{ url: string; filename: string; mimeType: string; sizeBytes: number }> {
  const fd = new FormData()
  fd.append('files', file, file.name)
  fd.append('path', 'clip-v3/decouvrir')
  const res = await relayFetch('/api/v1/files/upload/direct', { body: fd }, 60_000)
  const json = (await res.json().catch(() => null)) as { files?: { url?: string; type?: string; size?: number }[] } | null
  const f = json?.files?.[0]
  if (!res.ok || !f?.url) throw new AdvisorError('upload', res.status)
  return { url: f.url, filename: file.name, mimeType: f.type || file.type || 'application/octet-stream', sizeBytes: f.size ?? file.size }
}

async function sendJson(url: string, method: 'POST' | 'PUT', payload: unknown): Promise<void> {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' })
  if (await closesSession(res)) throw new AdvisorError('closed', res.status)
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean }
  if (!res.ok || body.ok === false) throw new AdvisorError('http', res.status)
}

/** Le fil complet de la conversation, à chaque échange (PUT /api/v1/conversations/:id). */
export function putConversation(id: string, payload: ConversationPayload): Promise<void> {
  return sendJson(`/api/decouvrir/conversations/${encodeURIComponent(id)}`, 'PUT', payload)
}

/** Le besoin reformulé par le conseiller, vers les propositions d'ajout (POST /api/v1/besoins). */
export function sendNeed(conversationId: string, need: Need): Promise<void> {
  return sendJson('/api/decouvrir/besoins', 'POST', { conversationId, ...need })
}

/* ── Le fil du conseiller, gardé dans l'onglet (le navigateur ne garde que la visite en cours) ── */

const THREAD_KEY = 'clip_decouvrir_conseiller'

export function loadThread(): AdvisorThread | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(THREAD_KEY) ?? 'null') as AdvisorThread | null
    return t && typeof t.id === 'string' && Array.isArray(t.messages) ? t : null
  } catch {
    return null
  }
}

export function saveThread(t: AdvisorThread): void {
  try {
    sessionStorage.setItem(THREAD_KEY, JSON.stringify(t))
  } catch {
    /* stockage plein ou bloqué : le fil reste à l'écran */
  }
}

export function clearThread(): void {
  try {
    sessionStorage.removeItem(THREAD_KEY)
  } catch {
    /* rien à effacer */
  }
}
