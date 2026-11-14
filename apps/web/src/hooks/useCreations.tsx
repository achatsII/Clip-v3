'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useSession } from '@/components/providers/Session'
import { useToast } from '@/components/ui/Toast'
import { creationOf, diffCreations, POLL_BUSY_MS, POLL_IDLE_MS } from '@/lib/ai/creation'
import { ranHere } from '@/lib/ai/jobs'
import { finishServerGeneration } from '@/lib/ai/runGeneration'
import { jobOutcome, readServerJob, serverJobIds } from '@/lib/ai/serverJob'
import type { DataApi } from '@/lib/gateway/data'
import { messages } from '@/lib/i18n'
import { T } from '@/lib/model/repo'
import type { Instruction } from '@/lib/model/types'
import { useToggle } from '@/lib/toggles'
import { qk, useStations } from './queries'

/** Les travaux au serveur que cet onglet est en train de terminer (une seule fois chacun). */
const finishingHere = new Set<string>()

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

/** Ce que l'accueil propose de rouvrir : les créations des dernières 24 heures. */
export const RECENT_CREATIONS_MS = 24 * 3600_000

/** Une petite lecture : les instructions créées par l'IA depuis `since`, les plus récentes d'abord. */
function fetchRecentCreations(data: DataApi, since: string) {
  return data.filter<Instruction>(T.instruction, {
    filter: { 'json_data.generation.at': { $gte: since }, 'json_data.status': { $ne: 'archived' } },
    projection: { 'json_data.title': 1, 'json_data.generation.at': 1, 'json_data.coverUrl': 1, 'json_data.stepCount': 1, 'json_data.generating': 1 },
    sort: { 'json_data.generation.at': -1 },
    limit: 8,
  })
}

/**
 * Les instructions qui viennent d'être créées (24 h), pour les ouvrir de l'accueil. Sa clé commence
 * par celle des créations : une création finie (temps réel ou relecture) la fait relire aussitôt.
 */
export function useRecentCreations() {
  const { data } = useSession()
  return useQuery({
    queryKey: [...qk.creations, 'recent'],
    queryFn: () => fetchRecentCreations(data, new Date(Date.now() - RECENT_CREATIONS_MS).toISOString()),
    staleTime: 30_000,
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
  const { data, files, ai, profile, displayName } = useSession()
  const creations = useCreations({ idle: pathname === '/accueil' || pathname === '/instructions' })
  const stations = useStations()
  // La génération au serveur : les travaux des créations en cours, relus toutes les 10 s (jamais onglet caché).
  const serverToggle = useToggle('serverGeneration')
  const running = (creations.data ?? []).filter((d) => creationOf(d.json_data).kind === 'running')
  const jobIds = serverToggle ? serverJobIds(running) : []
  const jobs = useQuery({
    queryKey: [...qk.creations, 'jobs', jobIds],
    queryFn: () => Promise.all(jobIds.map(async (id) => ({ id, job: await readServerJob(data, id) }))),
    enabled: jobIds.length > 0,
    refetchInterval: POLL_BUSY_MS,
    staleTime: 5_000,
  })
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
    // Une création finie se propose aussitôt à l'accueil (« Viennent d'être créées »).
    if (finished.length) void qc.invalidateQueries({ queryKey: [...qk.creations, 'recent'] })
    for (const id of finished) {
      void qc.invalidateQueries({ queryKey: qk.instruction(id) })
      if (ranHere(id) || where.current === `/instructions/${id}`) continue
      announce(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creations.data, qc, data, toast, router])

  /** Annonce une création finie (prête ou ratée), avec un lien pour l'ouvrir. */
  function announce(id: string) {
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

  // Un travail fini au serveur : cet onglet termine l'instruction (vignettes, repères, enregistrement),
  // une seule fois. L'appareil qui l'a lancée est peut-être fermé.
  useEffect(() => {
    if (!jobs.data || !stations.data) return
    for (const { id: jobId, job } of jobs.data) {
      const outcome = jobOutcome(job?.json_data)
      if (outcome.kind === 'running' || outcome.kind === 'done' || finishingHere.has(jobId)) continue
      const creation = running.find((d) => d.json_data.generating?.jobId === jobId)
      if (!creation) continue
      finishingHere.add(jobId)
      const id = creation._id
      void data
        .get<Instruction>(T.instruction, id)
        .then((doc) => (doc ? finishServerGeneration({ doc, job, data, files, ai, stations: stations.data ?? [], actor: { id: profile.userId, name: displayName } }) : undefined))
        .catch(() => undefined)
        .finally(() => {
          // Terminée (ou ratée) ici sans qu'on la regarde : on l'annonce ; l'appareil qui l'a lancée peut être ailleurs.
          if (where.current !== `/instructions/${id}`) announce(id)
          void qc.invalidateQueries({ queryKey: qk.creations })
          void qc.invalidateQueries({ queryKey: qk.instruction(id) })
          setTimeout(() => finishingHere.delete(jobId), 60_000)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.data, stations.data])

  return null
}
