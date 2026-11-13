/**
 * Le traceur de l'espace Découvrir, interrupteur allumé seulement : les gestes d'une visite (pages, vidéos,
 * parcours, conseiller, sortie) partent en lots vers /api/decouvrir/suivi, qui les relaie à Sandboxes avec
 * la personne de la session. File dans `sessionStorage`, trois essais par événement, jamais bloquant ;
 * inerte tant qu'aucune visite n'a commencé (interrupteur éteint : jamais). N'appelle que la route de même
 * origine de Clip, jamais Sandboxes : la clé reste au serveur. Navigateur seulement.
 */
import { LOGIN_PATH } from './catalog'
import { batches, isCloseReason, type CloseReason, type SuiviEvent } from './contract'
import { chapterIndexAt, chapterKey } from './videos'

const QUEUE_KEY = 'clip_decouvrir_suivi'
const VISIT_KEY = 'clip_decouvrir_visite'
const MODE_KEY = 'clip_decouvrir_mode'
/** Trois envois échoués, puis l'événement est abandonné. */
export const MAX_TRIES = 3
const MAX_QUEUE = 500
/** Une progression de vidéo au plus toutes les 15 s de lecture, et à la pause. */
const VIDEO_EVERY_SEC = 15
/** 92 % : la vidéo est vue. */
const DONE_PCT = 92

interface Visit {
  id: string
  /** Début de la visite (ms epoch) : `sortie.sec` en est la durée. */
  debut: number
  /** Vidéos déjà signalées vues pendant la visite. */
  fins: string[]
}
interface Item {
  e: SuiviEvent
  /** Envois échoués. */
  n: number
  k: number
}

let memVisit: Visit | null = null
let memQueue: Item[] = []
let memMode: string | null = null
let seq = 0
let timer: ReturnType<typeof setTimeout> | null = null
let inflight: Promise<void> | null = null
const sending = new Set<number>()
let listening = false

function store(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}
function read<T>(key: string): T | null {
  try {
    const v = store()?.getItem(key)
    return v ? (JSON.parse(v) as T) : null
  } catch {
    return null
  }
}
function write(key: string, v: unknown) {
  try {
    if (v === null) store()?.removeItem(key)
    else store()?.setItem(key, JSON.stringify(v))
  } catch {
    /* stockage plein ou bloqué : la mémoire de la page suffit */
  }
}

const getVisit = (): Visit | null => (store() ? read<Visit>(VISIT_KEY) : memVisit)
function setVisit(v: Visit | null) {
  memVisit = v
  write(VISIT_KEY, v)
}
const getQueue = (): Item[] => (store() ? (read<Item[]>(QUEUE_KEY) ?? []) : memQueue)
function setQueue(q: Item[]) {
  memQueue = q
  write(QUEUE_KEY, q.length ? q : null)
}

function randomId(prefix: string): string {
  const a = new Uint8Array(14)
  crypto.getRandomValues(a)
  return `${prefix}_${Array.from(a, (b) => (b % 36).toString(36)).join('')}`
}

/** Un identifiant de conversation (PUT /api/v1/conversations/:id) : impossible à deviner, il ne porte pas la personne. */
export const newConversationId = () => randomId('c')

/** Cet onglet est entré par l'espace relié à Sandboxes. */
export const isTracked = (): boolean => (store() ? read<string>(MODE_KEY) : memMode) === 'sandboxes'

/** Commence la visite (une par onglet) ; sans effet si elle est commencée. */
export function startVisit(): void {
  if (typeof window === 'undefined') return
  memMode = 'sandboxes'
  write(MODE_KEY, 'sandboxes')
  if (!getVisit()) setVisit({ id: randomId('s'), debut: Date.now(), fins: [] })
  listen()
  if (getQueue().length) schedule(1000)
}

/** Fin de la visite (sortie, session fermée) : la file est abandonnée. */
export function endVisit(): void {
  if (timer) clearTimeout(timer)
  timer = null
  setVisit(null)
  setQueue([])
  sinceLast.clear()
}

/** La durée de la visite jusqu'ici (`sortie`, la plus grande compte) : la page se cache, ou la personne se déconnecte. */
export function markExit(): boolean {
  const v = getVisit()
  if (!v) return false
  push({ type: 'sortie', sec: Math.max(0, Math.round((Date.now() - v.debut) / 1000)) })
  return true
}

/** La page se cache (onglet changé, fenêtre fermée) : la durée de la visite, envoyée sans attendre. */
function listen() {
  if (listening) return
  listening = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden' || !markExit()) return
    void flush({ keepalive: true })
  })
}

function push(e: Omit<SuiviEvent, 'at'>) {
  const q = getQueue()
  q.push({ e: { ...e, at: Date.now() } as SuiviEvent, n: 0, k: Date.now() * 1000 + (seq++ % 1000) })
  setQueue(q.slice(-MAX_QUEUE))
}

function schedule(ms: number) {
  if (timer) {
    if (ms > 0) return
    clearTimeout(timer)
  }
  timer = setTimeout(() => {
    timer = null
    void flush()
  }, ms)
}

/** Un geste de la visite ; ignoré sans visite. Envoi deux secondes après, ou tout de suite à 40 événements. */
export function track(e: Omit<SuiviEvent, 'at'>): void {
  if (!getVisit()) return
  push(e)
  schedule(getQueue().length >= 40 ? 0 : 2000)
}

/**
 * La session est fermée (révoquée, arrivée à sa fin, jetons refusés) : la visite s'arrête et la personne
 * retourne à l'écran d'entrée, avec le message et la page où elle était (navigation complète : rien de la
 * session fermée ne reste en mémoire).
 */
export function closeSession(raison: CloseReason | null, fin?: number | null): void {
  endVisit()
  if (typeof window === 'undefined' || window.location.pathname === LOGIN_PATH) return
  const q = new URLSearchParams()
  const suite = window.location.pathname + window.location.search
  if (suite !== '/decouvrir') q.set('suite', suite)
  if (raison) q.set('raison', raison)
  if (fin) q.set('fin', String(fin))
  const qs = q.toString()
  window.location.href = `${LOGIN_PATH}${qs ? `?${qs}` : ''}`
}

type Outcome = 'ok' | 'retry' | 'drop' | 'closed' | 'inactive'

async function send(visit: string, evenements: SuiviEvent[], keepalive: boolean): Promise<Outcome> {
  try {
    const res = await fetch('/api/decouvrir/suivi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session: visit, evenements }), keepalive, cache: 'no-store' })
    if (res.ok) return 'ok'
    // L'espace n'est plus relié (interrupteur éteint) : le suivi s'arrête.
    if (res.status === 404) return 'inactive'
    if (res.status === 401 || res.status === 403) {
      const b = (await res.json().catch(() => ({}))) as { raison?: unknown; fin?: unknown }
      closeSession(isCloseReason(b.raison) ? b.raison : null, typeof b.fin === 'number' ? b.fin : null)
      return 'closed'
    }
    return res.status === 408 || res.status === 429 || res.status >= 500 ? 'retry' : 'drop'
  } catch {
    return 'retry'
  }
}

/** Envoie la file en lots (100 événements, 64 Ko) ; un lot qui échoue repart au prochain envoi, trois fois au plus. */
export function flush(opts: { keepalive?: boolean } = {}): Promise<void> {
  if (inflight && !opts.keepalive) return inflight
  const run = (async () => {
    const visit = getVisit()
    if (!visit) return
    const pending = getQueue().filter((i) => !sending.has(i.k))
    for (const batch of batches(pending)) {
      const keys = new Set(batch.map((i) => i.k))
      keys.forEach((k) => sending.add(k))
      const outcome = await send(visit.id, batch.map((i) => i.e), !!opts.keepalive)
      keys.forEach((k) => sending.delete(k))
      if (outcome === 'closed') return
      if (outcome === 'inactive') {
        write(MODE_KEY, null)
        memMode = null
        endVisit()
        return
      }
      if (outcome === 'retry') {
        setQueue(getQueue().map((i) => (keys.has(i.k) ? { ...i, n: i.n + 1 } : i)).filter((i) => i.n < MAX_TRIES))
        if (getQueue().length) schedule(20_000)
        return
      }
      setQueue(getQueue().filter((i) => !keys.has(i.k)))
    }
  })()
  if (opts.keepalive) return run
  inflight = run.finally(() => {
    inflight = null
  })
  return inflight
}

/** Pour les tests et le diagnostic : la file en attente (événement et nombre d'échecs). */
export function pendingEvents(): Array<{ type: string; tries: number }> {
  return getQueue().map((i) => ({ type: i.e.type, tries: i.n }))
}

/* ───────────────────────────── Vidéos ───────────────────────────── */

export interface TrackedVideo {
  id: string
  /** Le titre du catalogue, en français (celui que Sandboxes affiche). */
  title: string
  chapters: { t: number }[]
}

/** Secondes de lecture depuis le dernier événement de chaque vidéo (la cadence de 15 s). */
const sinceLast = new Map<string, number>()

const pctOf = (time: number, duration: number) => Math.min(100, Math.max(0, Math.round((time / duration) * 100)))

/** Où en est la lecture : `sec` est la position dans la vidéo, `libelle` son titre. */
function emitVideo(v: TrackedVideo, time: number, duration: number) {
  const chapitre = chapterKey(chapterIndexAt(v.chapters, time))
  track({ type: 'video', videoId: v.id, pct: pctOf(time, duration), sec: Math.max(0, Math.round(time)), ...(chapitre ? { chapitre } : {}), libelle: v.title })
  sinceLast.set(v.id, 0)
}

/** La lecture avance (`delta` : secondes réellement regardées depuis le dernier appel) ; 92 % compte comme vue. */
export function videoProgress(v: TrackedVideo, time: number, duration: number, delta: number): void {
  const visit = getVisit()
  if (!visit || !duration) return
  const played = (sinceLast.get(v.id) ?? 0) + Math.max(0, delta)
  sinceLast.set(v.id, played)
  if (played >= VIDEO_EVERY_SEC) emitVideo(v, time, duration)
  if (pctOf(time, duration) >= DONE_PCT && !visit.fins.includes(v.id)) {
    setVisit({ ...visit, fins: [...visit.fins, v.id] })
    track({ type: 'video_fin', videoId: v.id, libelle: v.title })
  }
}

/** À la pause : où en est la lecture (si elle a avancé depuis le dernier événement). */
export function videoPaused(v: TrackedVideo, time: number, duration: number): void {
  if (!getVisit() || !duration || (sinceLast.get(v.id) ?? 0) < 1) return
  emitVideo(v, time, duration)
}
