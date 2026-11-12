'use client'

/**
 * La connexion Ably de l'onglet : une seule, ouverte au besoin, sur le canal de l'organisation.
 * Chargée à la demande (le module n'entre pas dans les écrans qui ne s'en servent pas). Sans
 * connexion, publier ne fait rien : la relecture à intervalle prend le relais.
 */
import type { Realtime, RealtimeChannel } from 'ably'
import { useSyncExternalStore } from 'react'
import { inNativeShell } from '../bridge/native'
import { orgChannel, type RealtimeEvent } from './events'

let client: Realtime | null = null
const listeners = new Set<(e: RealtimeEvent) => void>()

/**
 * Où en est le direct sur cet appareil : `live` quand le canal de l'usine est branché (on reçoit et
 * on envoie) ; `connecting` en route ; `down` quand il ne passe pas (jeton refusé, réseau qui
 * bloque) ; `off` sans temps réel. Les écrans s'en servent pour le dire, et pour se relire seuls
 * quand le direct ne passe pas.
 */
export type RealtimeState = 'off' | 'connecting' | 'live' | 'down'
let state: RealtimeState = 'off'
/** Pourquoi le direct ne passe pas (message technique, montré au survol du témoin). */
let reason = ''
const stateListeners = new Set<() => void>()

export function setRealtimeState(next: RealtimeState, why?: unknown) {
  if (next === 'down') {
    const text = why instanceof Error ? why.message : typeof why === 'string' ? why : (why as { message?: string } | undefined)?.message ?? ''
    if (state !== 'down') console.warn('[CLIP] Temps réel indisponible', why ?? '')
    reason = text
  }
  if (state === next) return
  state = next
  stateListeners.forEach((fn) => fn())
}

export const realtimeReason = () => reason

export function useRealtimeState(): RealtimeState {
  return useSyncExternalStore(
    (fn) => {
      stateListeners.add(fn)
      return () => {
        stateListeners.delete(fn)
      }
    },
    () => state,
    () => 'off',
  )
}

/** Cet onglet, pour les autres : deux appareils d'une même personne ne se confondent pas. */
export const deviceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`

/** Ce que chaque enregistrement d'un brouillon écrit pour les autres écrans : la date, et l'appareil qui écrit. */
export const writtenBy = (at: string) => ({ updatedAt: at, updatedFrom: deviceId, updatedVia: inNativeShell() ? ('app' as const) : ('web' as const) })

/** S'abonne à ce qui arrive des autres appareils (reçu par `RealtimeBridge`). */
export function onRealtime(fn: (e: RealtimeEvent) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Remet un événement reçu aux écrans abonnés. */
export function dispatchRealtime(e: RealtimeEvent): void {
  listeners.forEach((fn) => fn(e))
}
let channel: RealtimeChannel | null = null
let connecting: Promise<RealtimeChannel | null> | null = null
let org: string | null = null
/**
 * Les annonces faites pendant que la connexion se rétablit (téléphone sorti de veille, retour de
 * l'appareil photo) : gardées, la dernière par instruction, et envoyées dès qu'elle revient.
 */
const pending = new Map<string, RealtimeEvent>()

function flushPending() {
  if (!channel || client?.connection.state !== 'connected') return
  const events = [...pending.values()]
  pending.clear()
  for (const e of events) void channel.publish('event', e).catch(() => pending.set(`${e.type}:${e.id}`, e))
}

/** Un canal resté en échec ou suspendu, la connexion revenue : on le rebranche (Ably ne le fait pas seul). */
function ensureAttached() {
  if (!channel || client?.connection.state !== 'connected') return
  if (channel.state !== 'attached' && channel.state !== 'attaching') void channel.attach().catch((e: unknown) => setRealtimeState('down', e))
}

/** Revenir à l'écran, ou au réseau : on se reconnecte tout de suite, sans attendre le prochain essai (15 à 30 s). */
export function wakeRealtime() {
  const st = client?.connection.state
  if (client && st && st !== 'connected' && st !== 'connecting' && st !== 'closing') client.connection.connect()
  else ensureAttached()
}
if (typeof window !== 'undefined') {
  const wake = () => document.visibilityState === 'visible' && wakeRealtime()
  document.addEventListener('visibilitychange', wake)
  window.addEventListener('online', wake)
  window.addEventListener('focus', wake)
  window.addEventListener('pageshow', wake)
  // Coupé et à l'écran : on réessaie aussi de soi-même, une connexion en échec ne revenant pas seule.
  setInterval(() => {
    if (state === 'down') wake()
  }, 30_000)
}

/**
 * `refresh` : rafraîchit la session de la Gateway (un onglet resté ouvert longtemps a un jeton
 * expiré ; sans lui, le direct ne pouvait plus se rebrancher).
 */
export function connectRealtime(orgId: string, getToken: () => string | null, refresh?: () => Promise<boolean>): Promise<RealtimeChannel | null> {
  if (channel && org === orgId) return Promise.resolve(channel)
  if (connecting && org === orgId) return connecting
  disconnectRealtime()
  org = orgId
  setRealtimeState('connecting')
  connecting = import('ably')
    .then(({ Realtime }) => {
      client = new Realtime({
        // Ses propres messages ne reviennent pas à l'appareil qui les envoie.
        echoMessages: false,
        authCallback: (_params, callback) => {
          const ask = (token: string | null) => (token ? fetch('/api/realtime/token', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }) : Promise.resolve(null))
          void (async () => {
            try {
              let res = await ask(getToken())
              // Jeton de la Gateway expiré (onglet resté ouvert, ordinateur en veille) : rafraîchi une fois.
              if ((!res || res.status === 401) && refresh && (await refresh())) res = await ask(getToken())
              if (!res) return callback('Connexion requise', null)
              if (!res.ok) return callback(`jeton ${res.status}`, null)
              callback(null, await res.json())
            } catch (e) {
              callback(e instanceof Error ? e.message : 'jeton', null)
            }
          })()
        },
      })
      // L'état de la connexion, pour le dire à l'écran (le canal branché, lui, se confirme à l'abonnement).
      client.connection.on((change) => {
        if (change.current === 'connecting' || change.current === 'disconnected') setRealtimeState('connecting')
        else if (change.current === 'suspended' || change.current === 'failed') setRealtimeState('down', change.reason?.message ?? change.current)
        else if (change.current === 'connected') {
          if (channel?.state === 'attached') setRealtimeState('live')
          else ensureAttached()
          flushPending()
        }
      })
      channel = client.channels.get(orgChannel(orgId))
      channel.on((change) => {
        if (change.current === 'attached') setRealtimeState('live')
        else if (change.current === 'failed' || change.current === 'suspended') setRealtimeState('down', change.reason?.message ?? change.current)
      })
      return channel
    })
    .catch((e: unknown) => {
      setRealtimeState('down', e)
      return null
    })
    .finally(() => {
      connecting = null
    })
  return connecting
}

/**
 * Dit aux autres appareils de l'usine ce qui vient de changer. Sans connexion pour l'instant,
 * l'annonce attend qu'elle revienne (et on la rappelle tout de suite) ; sans temps réel, rien.
 */
export function publishRealtime(event: RealtimeEvent): void {
  if (!channel || !client) return
  const key = `${event.type}:${event.id}`
  if (client.connection.state !== 'connected') {
    pending.set(key, event)
    wakeRealtime()
    return
  }
  void channel.publish('event', event).catch(() => {
    pending.set(key, event)
    wakeRealtime()
  })
}

export function disconnectRealtime(): void {
  try {
    client?.close()
  } catch {
    /* déjà fermée */
  }
  client = null
  channel = null
  org = null
  pending.clear()
  setRealtimeState('off')
}
