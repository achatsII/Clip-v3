'use client'

import { useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { useToast } from '@/components/ui/Toast'
import { useMessages } from '@/lib/i18n'
import { getAccessToken, refreshSession } from '@/lib/gateway/client'
import { connectRealtime, deviceId, disconnectRealtime, dispatchRealtime, noteRealtimeStart, setRealtimeState } from '@/lib/realtime/client'
import { isRealtimeEvent, refreshFor } from '@/lib/realtime/events'
import { useRealtimeAvailable, useToggle } from '@/lib/toggles'
import { qk } from './queries'

/** Les relectures d'une instruction après l'annonce de son brouillon. */
const RELOOK_MS = [1500, 4000]

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
  const toast = useToast()
  const router = useRouter()
  const t = useMessages()
  const liveEditing = useToggle('liveEditing')
  // Ce qu'il faut savoir au moment de l'événement, sans reconnecter le canal à chaque changement.
  const here = useRef({ pathname: '', userId: profile.userId, liveEditing, t, toast, router })
  here.current = { pathname: usePathname(), userId: profile.userId, liveEditing, t, toast, router }
  const offered = useRef(new Map<string, number>())
  // « Reconnecter » au témoin, quand le direct n'a pas pu démarrer.
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const again = () => setAttempt((n) => n + 1)
    window.addEventListener('clip:realtime-retry', again)
    return () => window.removeEventListener('clip:realtime-retry', again)
  }, [])

  useEffect(() => {
    noteRealtimeStart({ available, hasOrg: !!orgId })
    if (!available || !orgId) return
    let off = () => undefined as void
    let alive = true
    void connectRealtime(orgId, getAccessToken, refreshSession).then((channel) => {
      if (!channel || !alive) return
      const onEvent = (m: { data?: unknown }) => {
        if (!isRealtimeEvent(m.data)) return
        if (m.data.type === 'draft' && m.data.from === deviceId) return
        dispatchRealtime(m.data)
        // Vos propres modifications sur un autre appareil : l'ordinateur propose de les suivre (démo,
        // travail à deux écrans). Une fois par instruction toutes les 10 minutes, jamais pour les autres.
        const h = here.current
        if (m.data.type === 'draft' && h.liveEditing && m.data.userId === h.userId && !h.pathname.includes(m.data.id)) {
          const last = offered.current.get(m.data.id) ?? 0
          if (Date.now() - last > 10 * 60_000) {
            offered.current.set(m.data.id, Date.now())
            const id = m.data.id
            h.toast.info(h.t.shell.live.editingElsewhere(m.data.title ?? '', m.data.device), undefined, { label: h.t.common.open, onClick: () => h.router.push(`/instructions/${id}`) })
          }
        }
        for (const key of refreshFor(m.data)) {
          if (key === 'creations') void qc.invalidateQueries({ queryKey: qk.creations })
          else if (key === 'instructions') void qc.invalidateQueries({ queryKey: qk.instructions })
          else void qc.invalidateQueries({ queryKey: qk.instruction(key.slice('instruction:'.length)) })
        }
        // La Gateway peut rendre l'ancienne version un court instant après l'enregistrement : le
        // lecteur ouvert sur l'instruction se relit encore un peu après, pour ne rien manquer.
        if (m.data.type === 'draft') {
          const key = qk.instruction(m.data.id)
          for (const wait of RELOOK_MS) setTimeout(() => void qc.invalidateQueries({ queryKey: key }), wait)
        }
      }
      // Le canal branché (ou refusé) se dit à l'écran : le témoin du direct, la relecture de secours.
      channel.subscribe('event', onEvent).then(
        () => setRealtimeState('live'),
        (e: unknown) => setRealtimeState('down', e),
      )
      off = () => channel.unsubscribe('event', onEvent)
    })
    return () => {
      alive = false
      off()
    }
  }, [available, orgId, qc, attempt])

  // Quitter l'app (déconnexion) ferme la connexion.
  useEffect(() => () => disconnectRealtime(), [])
  return null
}
