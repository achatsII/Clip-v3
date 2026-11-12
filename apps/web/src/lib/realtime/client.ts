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
const stateListeners = new Set<() => void>()

export function setRealtimeState(next: RealtimeState, why?: unknown) {
  if (next === 'down' && state !== 'down') console.warn('[CLIP] Temps réel indisponible', why ?? '')
  if (state === next) return
  state = next
  stateListeners.forEach((fn) => fn())
}

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

export function connectRealtime(orgId: string, getToken: () => string | null): Promise<RealtimeChannel | null> {
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
          const token = getToken()
          if (!token) return callback('Connexion requise', null)
          fetch('/api/realtime/token', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`jeton ${r.status}`))))
            .then((tokenRequest) => callback(null, tokenRequest), (e: unknown) => callback(e instanceof Error ? e.message : 'jeton', null))
        },
      })
      // L'état de la connexion, pour le dire à l'écran (le canal branché, lui, se confirme à l'abonnement).
      client.connection.on((change) => {
        if (change.current === 'connecting' || change.current === 'disconnected') setRealtimeState('connecting')
        else if (change.current === 'suspended' || change.current === 'failed') setRealtimeState('down', change.reason?.message ?? change.current)
        else if (change.current === 'connected' && channel?.state === 'attached') setRealtimeState('live')
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

/** Dit aux autres appareils de l'usine ce qui vient de changer ; sans connexion, ne fait rien. */
export function publishRealtime(event: RealtimeEvent): void {
  if (!channel) return
  void channel.publish('event', event).catch(() => undefined)
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
  setRealtimeState('off')
}
