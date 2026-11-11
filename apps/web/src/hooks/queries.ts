'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/components/providers/Session'
import { listFeedback, listInstructions, listStations, listVersions, T } from '@/lib/model/repo'
import type { Instruction } from '@/lib/model/types'

export const qk = {
  instructions: ['instructions'] as const,
  instruction: (id: string) => ['instruction', id] as const,
  stations: ['stations'] as const,
  versions: (id: string) => ['versions', id] as const,
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

export function useStations() {
  const { data } = useSession()
  return useQuery({ queryKey: qk.stations, queryFn: () => listStations(data), staleTime: 60_000 })
}

export function useVersions(id: string, enabled = true) {
  const { data } = useSession()
  return useQuery({ queryKey: qk.versions(id), queryFn: () => listVersions(data, id), enabled })
}

export function useFeedback(filter?: Record<string, unknown>, key: readonly unknown[] = qk.feedback) {
  const { data } = useSession()
  return useQuery({ queryKey: key, queryFn: () => listFeedback(data, filter) })
}
