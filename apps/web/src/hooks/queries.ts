'use client'

import { useQuery, type QueryClient } from '@tanstack/react-query'
import { useSession } from '@/components/providers/Session'
import { listCheckpoints } from '@/lib/model/checkpoints'
import { listFeedback, listInstructions, listStations, listVersions, T } from '@/lib/model/repo'
import type { Doc } from '@/lib/gateway/data'
import type { Instruction, InstructionContent } from '@/lib/model/types'

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

export function useInstructions() {
  const { data } = useSession()
  return useQuery({ queryKey: qk.instructions, queryFn: () => listInstructions(data) })
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
