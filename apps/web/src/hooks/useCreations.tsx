'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useSession } from '@/components/providers/Session'
import { useToast } from '@/components/ui/Toast'
import { creationOf, diffCreations, POLL_BUSY_MS, POLL_IDLE_MS } from '@/lib/ai/creation'
import { ranHere } from '@/lib/ai/jobs'
import type { DataApi } from '@/lib/gateway/data'
import { messages } from '@/lib/i18n'
import { T } from '@/lib/model/repo'
import type { Instruction } from '@/lib/model/types'
import { qk } from './queries'

/** Une petite lecture : seulement les instructions en création, leur titre et leur état. */
function fetchCreations(data: DataApi) {
  return data.filter<Instruction>(T.instruction, {
    filter: { 'json_data.generating': { $ne: null }, 'json_data.status': { $ne: 'archived' } },
    projection: { 'json_data.title': 1, 'json_data.generating': 1 },
    sort: { _id: -1 },
    limit: 20,
  })
}

/**
 * Les instructions en création sur un appareil de l'usine. Une seule requête, partagée ; seul le
 * surveillant (`poll`) la relit à intervalle : toutes les 10 s pendant une création, toutes les
 * 60 s sinon quand `idle` (accueil et liste), jamais onglet caché.
 */
export function useCreations(poll?: { idle: boolean }) {
  const { data } = useSession()
  return useQuery({
    queryKey: qk.creations,
    queryFn: () => fetchCreations(data),
    staleTime: 5_000,
    refetchInterval: poll
      ? (query) => ((query.state.data ?? []).some((d) => creationOf(d.json_data).kind === 'running') ? POLL_BUSY_MS : poll.idle ? POLL_IDLE_MS : false)
      : undefined,
  })
}

/**
 * Posé une fois dans la coquille de l'app, pour qui crée des instructions : rafraîchit les listes
 * quand une création commence ou finit sur un autre appareil, rouvre l'instruction finie, et
 * l'annonce (sauf si cet onglet l'a faite, ou qu'on la regarde déjà).
 */
export function CreationWatcher() {
  const pathname = usePathname()
  const router = useRouter()
  const qc = useQueryClient()
  const toast = useToast()
  const { data } = useSession()
  const creations = useCreations({ idle: pathname === '/accueil' || pathname === '/instructions' })
  const seen = useRef<Set<string> | null>(null)
  const titles = useRef(new Map<string, string>())
  const where = useRef(pathname)
  where.current = pathname

  useEffect(() => {
    if (!creations.data) return
    for (const d of creations.data) titles.current.set(d._id, d.json_data.title)
    const now = new Set(creations.data.map((d) => d._id))
    const before = seen.current
    seen.current = now
    if (!before) return
    const { started, finished } = diffCreations(before, now)
    if (!started.length && !finished.length) return
    void qc.invalidateQueries({ queryKey: qk.instructions })
    for (const id of finished) {
      void qc.invalidateQueries({ queryKey: qk.instruction(id) })
      if (ranHere(id) || where.current === `/instructions/${id}`) continue
      const t = messages()
      const title = titles.current.get(id) ?? t.instructions.watcher.untitled
      const open = { label: t.common.open, onClick: () => router.push(`/instructions/${id}`) }
      void data
        .get<Instruction>(T.instruction, id)
        .then((doc) => {
          const i = doc?.json_data
          if (!i || i.generating) return
          const failed = !!i.generationError && (!i.generation || i.generationError.at > i.generation.at)
          if (failed) toast.error(t.instructions.watcher.failed(title), i.generationError!.message, open)
          else if (i.draft) toast.success(t.instructions.watcher.ready(title), t.instructions.watcher.readyText, open)
        })
        .catch(() => undefined)
    }
  }, [creations.data, qc, data, toast, router])

  return null
}
