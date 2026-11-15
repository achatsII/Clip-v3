/**
 * L'envoi par morceaux des gros fichiers : le protocole TUS de la Gateway (spec 10-files, §2.8.6 à
 * §2.8.8), toggle `resumableUpload`.
 *
 * Le fichier part en morceaux de 4 Mo, du navigateur directement à la Gateway. Un morceau raté se
 * renvoie seul, à partir de ce que la Gateway a vraiment reçu. Réseau coupé, l'envoi attend son
 * retour (10 minutes au plus) au lieu d'échouer. Et la session reste retenue 24 h sur l'appareil :
 * « Réessayer » reprend là où l'envoi s'était arrêté, sans renvoyer ce qui est déjà parti.
 *
 * Clip V1 envoie de la même façon, mais chaque morceau passe par son propre serveur (Vercel, au plus
 * 4,5 Mo par requête) : la Gateway ne montrait pas encore ses en-têtes TUS au navigateur. Elle les
 * montre maintenant (CORS vérifié en QA le 2026-11-14) : ici, rien ne transite par Vercel.
 */
import { GATEWAY_URL } from '../config'
import { messages } from '@/lib/i18n'
import { ApiError } from './client'

export const TUS_URL = `${GATEWAY_URL}/api/v1/files/upload/multipart`
/** Sous ce seuil, un seul envoi (URL présignée) va plus vite que des morceaux. */
export const RESUMABLE_MIN_BYTES = 16 * 1024 * 1024
/** La taille d'un morceau : celle que Clip V1 envoie depuis des mois à la même Gateway. */
export const CHUNK_BYTES = 4 * 1024 * 1024
/** Le temps qu'une session reste retenue sur l'appareil pour reprendre un envoi. */
const KEEP_MS = 24 * 3600_000
const STORE_PREFIX = 'clip_tus:'
/** Des essais de suite sans rien envoyer avant d'abandonner. Le réseau coupé ne compte pas : on l'attend. */
const MAX_FAILURES = 6
const BACKOFF_MS = [1000, 2000, 4000, 8000, 15_000, 30_000]
/** Le temps qu'on attend le retour du réseau avant de dire que l'envoi a échoué. */
const OFFLINE_MAX_MS = 10 * 60_000
/** Après le dernier morceau, la Gateway range le fichier : quelques secondes, parfois plus de 5. */
const FINALIZE_ATTEMPTS = 8
/** Un morceau de 4 Mo passe en moins de 2 minutes, même à 300 kbit/s. */
const CHUNK_TIMEOUT_MS = 120_000

export interface ResumableTarget {
  /** Le nom du fichier, déjà nettoyé. */
  name: string
  type: string
  /** Le dossier de stockage (`clip-v3/captures`). */
  path: string
  /** La clé de reprise : le même fichier, au même endroit, reprend sa session. */
  fingerprint: string
}

export interface ResumableResult {
  url: string
  /** Le chemin du fichier dans le stockage, s'il est connu (pour le supprimer). */
  key: string
}

export interface ChunkRequest {
  url: string
  body: Blob
  headers: Record<string, string>
  onProgress?: (loaded: number) => void
}

export interface ChunkResponse {
  status: number
  header: (name: string) => string | null
}

export interface ResumableDeps {
  getToken: () => string | null
  refresh: () => Promise<boolean>
  fetch?: typeof fetch
  /** Le PATCH d'un morceau (XMLHttpRequest par défaut, pour la progression). */
  sendChunk?: (req: ChunkRequest) => Promise<ChunkResponse>
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
  sleep?: (ms: number) => Promise<void>
  isOnline?: () => boolean
  /** Attend le retour du réseau ; faux si `maxMs` passe sans lui. */
  waitOnline?: (maxMs: number) => Promise<boolean>
}

export interface ResumableCallbacks {
  onProgress?: (sent: number, total: number) => void
  /** Vrai quand l'envoi attend le retour du réseau, faux quand il repart. */
  onWait?: (waiting: boolean) => void
}

interface Saved {
  url: string
  size: number
  at: number
  /** L'adresse publique annoncée à la création. */
  hint?: string
  key?: string
  /** Tous les octets ont été confirmés : il ne restait que l'adresse finale. */
  sentAll?: boolean
}

interface Status {
  exists: boolean
  offset: number
  url?: string
  key?: string
}

function b64(text: string): string {
  let bin = ''
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte)
  return btoa(bin)
}

/** `Upload-Metadata` : chaque valeur en base64. `filetype` comme Clip V1, `contentType` comme la spec. */
export function tusMetadata(t: Pick<ResumableTarget, 'name' | 'type' | 'path'>): string {
  return [
    ['filename', t.name],
    ['filetype', t.type],
    ['contentType', t.type],
    ['path', t.path],
  ]
    .map(([k, v]) => `${k} ${b64(v)}`)
    .join(',')
}

/**
 * L'adresse d'une session. La Gateway rend parfois l'adresse interne de son service
 * (`http://host.docker.internal:1080/files/{id}`) : seul l'identifiant compte, on le remet sous
 * l'adresse publique de la Gateway, tel quel (Clip V1 fait de même).
 */
export function sessionUrl(location: string): string | null {
  const id = location.split(/[?#]/)[0].split('/').filter(Boolean).pop()
  return id ? `${TUS_URL}/${id}` : null
}

function browserStorage(): ResumableDeps['storage'] {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function waitForNetwork(maxMs: number): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(true)
  return new Promise((resolve) => {
    const finish = (ok: boolean) => {
      window.removeEventListener('online', onOnline)
      clearTimeout(timer)
      resolve(ok)
    }
    const onOnline = () => finish(true)
    const timer = setTimeout(() => finish(typeof navigator === 'undefined' || navigator.onLine !== false), maxMs)
    window.addEventListener('online', onOnline)
  })
}

function xhrChunk(req: ChunkRequest): Promise<ChunkResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PATCH', req.url)
    for (const [k, v] of Object.entries(req.headers)) xhr.setRequestHeader(k, v)
    xhr.timeout = CHUNK_TIMEOUT_MS
    if (req.onProgress) xhr.upload.onprogress = (e) => e.lengthComputable && req.onProgress!(e.loaded)
    xhr.onload = () => resolve({ status: xhr.status, header: (name) => xhr.getResponseHeader(name) })
    xhr.onerror = () => reject(new Error('network'))
    xhr.ontimeout = () => reject(new Error('timeout'))
    xhr.send(req.body)
  })
}

/** Une panne passagère : réseau, délai, serveur occupé. On réessaie. */
const transient = (status: number) => status === 0 || status === 408 || status === 429 || status >= 500

/**
 * Envoie `file` par morceaux et rend son adresse publique. Erreurs : `401` (session morte),
 * `tus_unavailable` (la Gateway refuse ce mode : l'appelant envoie le fichier d'un bloc),
 * `offline` ou `network` (l'envoi peut reprendre plus tard, par la même clé).
 */
export async function uploadResumable(file: Blob, target: ResumableTarget, deps: ResumableDeps, cb: ResumableCallbacks = {}): Promise<ResumableResult> {
  const doFetch = deps.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init))
  const sendChunk = deps.sendChunk ?? xhrChunk
  const store = deps.storage === undefined ? browserStorage() : deps.storage
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const isOnline = deps.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine !== false)
  const waitOnline = deps.waitOnline ?? waitForNetwork
  const t = messages().common.errors
  const total = file.size
  const storeKey = STORE_PREFIX + target.fingerprint

  const auth = (): Record<string, string> => {
    const token = deps.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  const expired = () => new ApiError(t.sessionExpired, 401)

  /** Une requête, et un seul rafraîchissement de la session sur 401. */
  async function authed<R extends { status: number }>(run: () => Promise<R>): Promise<R> {
    const first = await run()
    if (first.status !== 401) return first
    if (!(await deps.refresh())) throw expired()
    const second = await run()
    if (second.status === 401) throw expired()
    return second
  }

  function remember(saved: Saved | null) {
    try {
      if (saved) store?.setItem(storeKey, JSON.stringify(saved))
      else store?.removeItem(storeKey)
    } catch {
      /* stockage plein ou fermé : l'envoi marche, sans reprise après coup */
    }
  }

  function recall(): Saved | null {
    try {
      const raw = store?.getItem(storeKey)
      const saved = raw ? (JSON.parse(raw) as Saved) : null
      if (saved && saved.size === total && typeof saved.url === 'string' && Date.now() - saved.at < KEEP_MS) return saved
    } catch {
      /* une session illisible ne sert à rien */
    }
    remember(null)
    return null
  }

  let failures = 0
  /** Avant un nouvel essai : le retour du réseau s'il est coupé, sinon un délai qui grandit. */
  async function pause(): Promise<void> {
    if (!isOnline()) {
      cb.onWait?.(true)
      const back = await waitOnline(OFFLINE_MAX_MS)
      cb.onWait?.(false)
      if (!back) throw new ApiError(t.uploadNetwork, 0, null, 'offline')
      return
    }
    failures++
    if (failures > MAX_FAILURES) throw new ApiError(t.uploadNetwork, 0, null, 'network')
    await sleep(BACKOFF_MS[Math.min(failures - 1, BACKOFF_MS.length - 1)])
  }

  /** Où en est la session, selon la Gateway. Une panne passagère se réessaie. */
  async function status(url: string): Promise<Status> {
    for (;;) {
      let res: Response
      try {
        res = await authed(() => doFetch(url, { method: 'GET', headers: { 'Tus-Resumable': '1.0.0', ...auth() } }))
      } catch (e) {
        if (e instanceof ApiError) throw e
        await pause()
        continue
      }
      if (res.status === 404 || res.status === 410) return { exists: false, offset: 0 }
      if (transient(res.status)) {
        await pause()
        continue
      }
      if (!res.ok) throw new ApiError(t.uploadFailed, res.status, null, 'tus_unavailable')
      const offset = Number(res.headers.get('Upload-Offset') ?? '')
      return {
        exists: true,
        offset: Number.isFinite(offset) && offset >= 0 ? Math.min(offset, total) : 0,
        url: res.headers.get('X-Public-Url') ?? undefined,
        key: res.headers.get('X-S3-Key') ?? undefined,
      }
    }
  }

  async function create(): Promise<Saved> {
    for (;;) {
      let res: Response
      try {
        res = await authed(() =>
          doFetch(TUS_URL, {
            method: 'POST',
            headers: { 'Tus-Resumable': '1.0.0', 'Upload-Length': String(total), 'Upload-Metadata': tusMetadata(target), ...auth() },
          }),
        )
      } catch (e) {
        if (e instanceof ApiError) throw e
        await pause()
        continue
      }
      if (transient(res.status)) {
        await pause()
        continue
      }
      const location = res.ok ? res.headers.get('Location') : null
      const url = location ? sessionUrl(location) : null
      // Route absente, taille refusée, droit manquant… : l'appelant envoie le fichier d'un bloc.
      if (!url) throw new ApiError(t.uploadPrepare, res.status, null, 'tus_unavailable')
      const saved: Saved = { url, size: total, at: Date.now(), hint: res.headers.get('X-Public-Url') ?? undefined, key: res.headers.get('X-S3-Key') ?? undefined }
      remember(saved)
      failures = 0
      return saved
    }
  }

  let session = recall()
  let offset = 0
  let doneUrl: string | undefined
  let doneKey: string | undefined

  // Une session retenue : la Gateway dit ce qu'elle a déjà.
  if (session) {
    let s: Status | null = null
    try {
      s = await status(session.url)
    } catch (e) {
      // Une session qu'on ne peut plus lire (droit, format) : on en ouvre une autre.
      if (!(e instanceof ApiError) || e.code !== 'tus_unavailable') throw e
    }
    if (s?.exists) {
      offset = s.offset
      if (s.url && offset >= total) {
        doneUrl = s.url
        doneKey = s.key
      }
    } else if (s && session.sentAll && session.hint) {
      // Tout était parti, puis la Gateway a rangé le fichier et fermé la session.
      doneUrl = session.hint
      doneKey = session.key
    } else {
      remember(null)
      session = null
    }
  }
  if (!session) session = await create()
  cb.onProgress?.(offset, total)

  let restarted = false
  // Garde-fou : des tours sans aucun octet de plus finissent par une erreur, jamais par une boucle sans fin.
  let best = offset
  let stalls = 0
  while (!doneUrl && offset < total) {
    if (offset > best) {
      best = offset
      stalls = 0
    } else if (++stalls > MAX_FAILURES * 2 + 2) {
      throw new ApiError(t.uploadNetwork, 0, null, 'network')
    }
    const start = offset
    const chunk = file.slice(start, Math.min(start + CHUNK_BYTES, total))
    let res: ChunkResponse | null = null
    try {
      res = await authed(() =>
        sendChunk({
          url: session!.url,
          body: chunk,
          headers: { 'Tus-Resumable': '1.0.0', 'Upload-Offset': String(start), 'Content-Type': 'application/offset+octet-stream', ...auth() },
          onProgress: (loaded) => cb.onProgress?.(Math.min(start + loaded, total), total),
        }),
      )
    } catch (e) {
      if (e instanceof ApiError) throw e
      res = null
    }

    if (res && (res.status === 204 || res.status === 200)) {
      const next = Number(res.header('Upload-Offset') ?? '')
      if (Number.isFinite(next) && next > start) {
        offset = Math.min(next, total)
        failures = 0
        const url = res.header('X-Public-Url')
        if (url && offset >= total) {
          doneUrl = url
          doneKey = res.header('X-S3-Key') ?? session.key
        }
        cb.onProgress?.(offset, total)
        continue
      }
    } else if (res && (res.status === 404 || res.status === 410)) {
      // La session a disparu (expirée, nettoyée) : on recommence, une seule fois.
      if (restarted) throw new ApiError(t.uploadFailed, res.status, null, 'network')
      restarted = true
      remember(null)
      session = await create()
      offset = 0
      cb.onProgress?.(0, total)
      continue
    } else if (res && res.status !== 409 && !transient(res.status)) {
      // Un morceau refusé (taille, format) : ce mode ne convient pas, l'appelant envoie d'un bloc.
      remember(null)
      throw new ApiError(t.uploadRefused, res.status, null, 'tus_unavailable')
    } else if (!res || transient(res.status)) {
      await pause()
    }

    // Reprendre exactement où la Gateway en est (un morceau coupé a pu arriver en partie).
    const s = await status(session.url)
    if (!s.exists) {
      if (restarted) throw new ApiError(t.uploadFailed, 404, null, 'network')
      restarted = true
      remember(null)
      session = await create()
      offset = 0
    } else {
      if (s.offset > offset) failures = 0
      offset = s.offset
      if (s.url && offset >= total) {
        doneUrl = s.url
        doneKey = s.key
      }
    }
    cb.onProgress?.(offset, total)
  }

  if (!doneUrl) {
    // Tout est reçu. La Gateway range le fichier, puis donne son adresse (parfois après 5 s).
    remember({ ...session, sentAll: true })
    for (let i = 0; i < FINALIZE_ATTEMPTS && !doneUrl; i++) {
      const s = await status(session.url)
      if (s.url && s.offset >= total) {
        doneUrl = s.url
        doneKey = s.key
        break
      }
      // Session fermée : le fichier est rangé, à l'adresse annoncée à la création.
      if (!s.exists) break
      await sleep(Math.min(1000 * (i + 1), 5000))
    }
    doneUrl = doneUrl ?? session.hint
    doneKey = doneKey ?? session.key
  }
  // Sans adresse, la session reste retenue : « Réessayer » ne renverra rien, il redemandera l'adresse.
  if (!doneUrl) throw new ApiError(t.uploadUnconfirmed, 500, null, 'network')
  remember(null)
  cb.onProgress?.(total, total)
  return { url: doneUrl, key: doneKey ?? '' }
}
