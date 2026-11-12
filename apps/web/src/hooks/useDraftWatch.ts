'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useSession } from '@/components/providers/Session'
import { T } from '@/lib/model/repo'
import { deviceId, useRealtimeState } from '@/lib/realtime/client'
import { remoteChange, WATCH_MS, WATCH_WINDOW_MS, type WrittenBy } from '@/lib/realtime/watch'

/**
 * Suit une instruction quand le direct ne passe pas (voir `src/lib/realtime/watch.ts`) : relue
 * toutes les 8 s. Direct branché, les annonces arrivent seules ; on vérifie quand même une fois
 * quand il revient (une annonce a pu se perdre pendant la coupure) et quand on revient à l'écran.
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
  const { id, enabled } = opts

  /** Une lecture minuscule : la date et l'appareil du dernier enregistrement de cette instruction. */
  const check = useCallback(async () => {
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
    const row = rows?.find((r) => r._id === id)?.json_data
    if (row && remoteChange(row, { at: ref.current.known(), device: deviceId }) && ref.current.idle()) ref.current.onRemote(row)
  }, [data, id])

  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => void check(), WATCH_MS)
    return () => clearInterval(timer)
  }, [active, check])

  // Le direct qui revient après une coupure : une annonce a pu se perdre entre-temps.
  const was = useRef(rt)
  useEffect(() => {
    const before = was.current
    was.current = rt
    if (enabled && rt === 'live' && before !== 'live' && before !== 'off') void check()
  }, [rt, enabled, check])

  // Revenir à l'écran (onglet, fenêtre, app) : on vérifie tout de suite, au plus une fois par 5 s.
  useEffect(() => {
    if (!enabled) return
    let last = 0
    const look = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 5000) return
      last = Date.now()
      void check()
    }
    document.addEventListener('visibilitychange', look)
    window.addEventListener('focus', look)
    return () => {
      document.removeEventListener('visibilitychange', look)
      window.removeEventListener('focus', look)
    }
  }, [enabled, check])

  return { active }
}
