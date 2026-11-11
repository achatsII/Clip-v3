'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useSession } from '@/components/providers/Session'
import { getAccessToken } from '@/lib/gateway/client'
import { connectRealtime, disconnectRealtime } from '@/lib/realtime/client'
import { isRealtimeEvent, refreshFor } from '@/lib/realtime/events'
import { useRealtimeAvailable } from '@/lib/toggles'
import { qk } from './queries'

/**
 * Posé une fois dans la coquille de l'app : écoute le canal de l'usine et relit aussitôt ce qui a
 * changé ailleurs (une création qui commence, avance ou finit sur le téléphone). Sans temps réel
 * (pas de clé Ably), rien ne se passe : la relecture à intervalle suffit.
 */
export function RealtimeBridge() {
  const available = useRealtimeAvailable()
  const { profile } = useSession()
  const qc = useQueryClient()
  const orgId = profile.orgId

  useEffect(() => {
    if (!available || !orgId) return
    let off = () => undefined as void
    let alive = true
    void connectRealtime(orgId, getAccessToken).then((channel) => {
      if (!channel || !alive) return
      const onEvent = (m: { data?: unknown }) => {
        if (!isRealtimeEvent(m.data)) return
        for (const key of refreshFor(m.data)) {
          if (key === 'creations') void qc.invalidateQueries({ queryKey: qk.creations })
          else if (key === 'instructions') void qc.invalidateQueries({ queryKey: qk.instructions })
          else void qc.invalidateQueries({ queryKey: qk.instruction(key.slice('instruction:'.length)) })
        }
      }
      void channel.subscribe('event', onEvent)
      off = () => channel.unsubscribe('event', onEvent)
    })
    return () => {
      alive = false
      off()
    }
  }, [available, orgId, qc])

  // Quitter l'app (déconnexion) ferme la connexion.
  useEffect(() => () => disconnectRealtime(), [])
  return null
}
