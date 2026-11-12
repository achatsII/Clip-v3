'use client'

import { useEffect, useRef } from 'react'
import { useSession } from '@/components/providers/Session'
import { T } from '@/lib/model/repo'
import { deviceId, useRealtimeState } from '@/lib/realtime/client'
import { remoteChange, WATCH_MS, WATCH_WINDOW_MS, type WrittenBy } from '@/lib/realtime/watch'

/**
 * Suit une instruction quand le direct ne passe pas (voir `src/lib/realtime/watch.ts`). Avec le
 * direct branché, ne fait rien : les annonces arrivent toutes seules.
 */
export function useDraftWatch(opts: {
  id: string
  /** Faux : ne rien suivre (toggle coupé). */
  enabled: boolean
  /** La date du dernier brouillon que cet écran connaît (écrit ici ou repris). */
  known: () => string | null
  /** Faux pendant qu'on modifie ici : on ne relit rien par-dessus. */
  idle: () => boolean
  onRemote: (row: WrittenBy) => void
}) {
  const { data } = useSession()
  const rt = useRealtimeState()
  const ref = useRef(opts)
  ref.current = opts
  const active = opts.enabled && rt !== 'live'
  const { id } = opts

  useEffect(() => {
    if (!active) return
    let stopped = false
    const tick = async () => {
      if (document.visibilityState !== 'visible' || !ref.current.idle()) return
      const since = new Date(Date.now() - WATCH_WINDOW_MS).toISOString()
      const rows = await data
        .filter<WrittenBy>(T.instruction, {
          filter: { 'json_data.updatedAt': { $gte: since } },
          projection: { 'json_data.updatedAt': 1, 'json_data.updatedFrom': 1, 'json_data.updatedVia': 1, 'json_data.updatedByName': 1 },
          sort: { 'json_data.updatedAt': -1 },
          limit: 40,
        })
        .catch(() => null)
      if (stopped || !rows) return
      const row = rows.find((r) => r._id === id)?.json_data
      if (row && remoteChange(row, { at: ref.current.known(), device: deviceId }) && ref.current.idle()) ref.current.onRemote(row)
    }
    const timer = setInterval(() => void tick(), WATCH_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [active, data, id])

  return { active }
}
