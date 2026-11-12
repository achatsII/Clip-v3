'use client'

/**
 * La connexion Ably de l'onglet : une seule, ouverte au besoin, sur le canal de l'organisation.
 * Chargée à la demande (le module n'entre pas dans les écrans qui ne s'en servent pas). Sans
 * connexion, publier ne fait rien : la relecture à intervalle prend le relais.
 */
import type { Realtime, RealtimeChannel } from 'ably'
import { orgChannel, type RealtimeEvent } from './events'

let client: Realtime | null = null
const listeners = new Set<(e: RealtimeEvent) => void>()

/** Cet onglet, pour les autres : deux appareils d'une même personne ne se confondent pas. */
export const deviceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `d-${Date.now()}-${Math.random().toString(36).slice(2)}`

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
      channel = client.channels.get(orgChannel(orgId))
      return channel
    })
    .catch(() => null)
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
}
