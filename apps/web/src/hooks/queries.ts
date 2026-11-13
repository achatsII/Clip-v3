'use client'

import { useInfiniteQuery, useQuery, type QueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSession } from '@/components/providers/Session'
import { listCheckpoints } from '@/lib/model/checkpoints'
import { RENEWAL_SOON_DAYS } from '@/lib/model/renewal'
import { listFeedback, listStations, listVersions, T } from '@/lib/model/repo'
import {
  countAll,
  countInstructions,
  countPublished,
  coveredStations,
  inboxInstructions,
  instructionsAtStation,
  instructionsWhere,
  publishedPerStation,
  searchInstructions,
  statsIndex,
  trainingCatalog,
  type LibraryQuery,
  type StationRef,
} from '@/lib/model/search'
import type { Doc } from '@/lib/gateway/data'
import type { CategoryKey, Instruction, InstructionContent } from '@/lib/model/types'

export const qk = {
  instructions: ['instructions'] as const,
  instruction: (id: string) => ['instruction', id] as const,
  stations: ['stations'] as const,
  versions: (id: string) => ['versions', id] as const,
  checkpoints: (id: string) => ['checkpoints', id] as const,
  feedback: ['feedback'] as const,
  feedbackFor: (id: string) => ['feedback', id] as const,
  members: ['members'] as const,
  creations: ['creations'] as const,
}

/*
 * Les instructions, à grande échelle : chaque écran demande ce qu'il lui faut (une recherche, un
 * compte, une file), jamais la liste complète. Toutes les clés commencent par `instructions` : une
 * écriture qui invalide `qk.instructions` les rafraîchit toutes.
 */
const iq = (...parts: unknown[]) => ['instructions', ...parts] as const

/** Les postes tels que la recherche les connaît (un mot qui nomme un poste trouve ses instructions). */
export function useStationRefs(): StationRef[] {
  const stations = useStations()
  return useMemo(() => (stations.data ?? []).map((s) => ({ id: s._id, name: s.json_data.name, code: s.json_data.code, area: s.json_data.area })), [stations.data])
}

/** Une recherche, page après page (« Voir plus »). */
export function useInstructionSearch(query: LibraryQuery, stations: StationRef[], enabled = true) {
  const { data } = useSession()
  return useInfiniteQuery({
    queryKey: iq('search', query, stations.length),
    queryFn: ({ pageParam }) => searchInstructions(data, query, stations, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next,
    enabled,
  })
}

/** Combien d'instructions correspondent à la recherche. */
export function useInstructionCount(query: LibraryQuery, stations: StationRef[], enabled = true) {
  const { data } = useSession()
  return useQuery({ queryKey: iq('count', query, stations.length), queryFn: () => countInstructions(data, query, stations), enabled })
}

/** Les catégories en usage (les filtres n'offrent qu'elles). */
export function useCategoriesInUse() {
  const { data } = useSession()
  return useQuery({
    queryKey: iq('categories'),
    queryFn: async () => new Set((await data.distinct(T.instruction, 'json_data.category', { 'json_data.status': { $ne: 'archived' } })) as CategoryKey[]),
    staleTime: 5 * 60_000,
  })
}

/** Le nombre d'instructions publiées (la limite du plan). */
export function usePublishedCount() {
  const { data } = useSession()
  return useQuery({ queryKey: iq('published-count'), queryFn: () => countPublished(data), staleTime: 60_000 })
}

/** Ce que « À voir » regarde : à approuver, et mes instructions où l'on demande des changements. */
export function useInboxInstructions(enabled = true) {
  const { data, profile } = useSession()
  return useQuery({ queryKey: iq('inbox', profile.userId), queryFn: () => inboxInstructions(data, profile.userId), enabled })
}

/** L'accueil : de petites requêtes ciblées plutôt que toute la bibliothèque. */
export function useHomeLibrary() {
  const { data, profile, me } = useSession()
  const soon = useMemo(() => new Date(Date.now() + RENEWAL_SOON_DAYS * 86_400_000).toISOString(), [])
  const yearAgo = useMemo(() => new Date(Date.now() - 366 * 86_400_000).toISOString(), [])
  const focus = me.categories.length > 0 || me.stationIds.length > 0
  const review = useQuery({ queryKey: iq('home', 'review'), queryFn: () => instructionsWhere(data, { 'json_data.status': { $eq: 'review' } }, 100) })
  const renew = useQuery({ queryKey: iq('home', 'renew'), queryFn: () => instructionsWhere(data, { $and: [{ 'json_data.publishedVersion': { $gt: 0 } }, { 'json_data.renewal.dueAt': { $lte: soon } }] }, 5, { 'json_data.renewal.dueAt': 1 }) })
  const drafts = useQuery({
    queryKey: iq('home', 'drafts', profile.userId),
    queryFn: () => instructionsWhere(data, { $and: [{ 'json_data.authorId': { $eq: profile.userId } }, { 'json_data.status': { $ne: 'review' } }, { $or: [{ 'json_data.publishedVersion': { $in: [null, 0] } }, { 'json_data.dirty': { $eq: true } }] }] }, 4),
  })
  const mine = useQuery({
    queryKey: iq('home', 'focus', me.categories, me.stationIds),
    queryFn: () =>
      instructionsWhere(data, { $and: [{ 'json_data.publishedVersion': { $gt: 0 } }, { $or: [...(me.categories.length ? [{ 'json_data.category': { $in: me.categories } }] : []), ...(me.stationIds.length ? [{ 'json_data.stationIds': { $in: me.stationIds } }] : [])] }] }, 6),
    enabled: focus,
  })
  const published = usePublishedCount()
  const total = useQuery({ queryKey: iq('home', 'total'), queryFn: () => countAll(data) })
  const covered = useQuery({ queryKey: iq('home', 'covered'), queryFn: () => coveredStations(data) })
  const dates = useQuery({
    queryKey: iq('home', 'dates'),
    queryFn: async () =>
      (await data.filter<Instruction>(T.instruction, { filter: { $and: [{ 'json_data.status': { $ne: 'archived' } }, { 'json_data.publishedAt': { $gte: yearAgo } }] }, projection: { 'json_data.publishedAt': 1 }, limit: 10_000 })).map((d) => d.json_data.publishedAt!).filter(Boolean),
  })
  return { review, renew, drafts, mine, published, total, covered, dates }
}

/** Le nombre d'instructions publiées par poste. */
export function useStationCounts() {
  const { data } = useSession()
  return useQuery({ queryKey: iq('per-station'), queryFn: () => publishedPerStation(data), staleTime: 60_000 })
}

/** Les instructions d'un poste. */
export function useStationInstructions(stationId: string) {
  const { data } = useSession()
  return useQuery({ queryKey: iq('station', stationId), queryFn: () => instructionsAtStation(data, stationId) })
}

/** Les instructions publiées qui ont des questions de formation (la matrice). */
export function useTrainingCatalog(enabled = true) {
  const { data } = useSession()
  return useQuery({ queryKey: iq('training'), queryFn: () => trainingCatalog(data), enabled })
}

/** Ce que les statistiques lisent des instructions. */
export function useStatsIndex(since: string, enabled = true) {
  const { data } = useSession()
  return useQuery({ queryKey: iq('stats', since), queryFn: () => statsIndex(data, since), enabled })
}

export function useInstruction(id: string) {
  const { data } = useSession()
  return useQuery({
    queryKey: qk.instruction(id),
    queryFn: async () => {
      const doc = await data.get<Instruction>(T.instruction, id)
      if (!doc) throw Object.assign(new Error('Instruction introuvable'), { notFound: true })
      return doc
    },
    retry: false,
  })
}

/**
 * Ce qu'on vient d'enregistrer, dans le cache de l'instruction : revenir à l'éditeur (depuis l'aperçu,
 * la liste) montre le dernier brouillon, pas celui de la première lecture.
 */
export function cacheInstruction(qc: QueryClient, id: string, partial: Partial<Instruction>) {
  qc.setQueryData<Doc<Instruction>>(qk.instruction(id), (old) => (old ? { ...old, json_data: { ...old.json_data, ...partial } } : old))
}

export function cacheDraft(qc: QueryClient, id: string, draft: InstructionContent) {
  cacheInstruction(qc, id, { draft, title: draft.title, kind: draft.kind, category: draft.category, tags: draft.tags, stepCount: draft.steps.length })
}

export function useStations() {
  const { data } = useSession()
  return useQuery({ queryKey: qk.stations, queryFn: () => listStations(data), staleTime: 60_000 })
}

export function useVersions(id: string, enabled = true) {
  const { data } = useSession()
  return useQuery({ queryKey: qk.versions(id), queryFn: () => listVersions(data, id), enabled })
}

/** Les points de retour du brouillon (sans leur contenu), pour l'historique. */
export function useCheckpoints(id: string, enabled = true) {
  const { data } = useSession()
  return useQuery({ queryKey: qk.checkpoints(id), queryFn: () => listCheckpoints(data, id), enabled })
}

export function useFeedback(filter?: Record<string, unknown>, key: readonly unknown[] = qk.feedback) {
  const { data } = useSession()
  return useQuery({ queryKey: key, queryFn: () => listFeedback(data, filter) })
}
