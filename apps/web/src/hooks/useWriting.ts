'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/components/providers/Session'
import { loadPersonal } from '@/lib/learning/store'
import { useToggle } from '@/lib/toggles'

/** La clé des préférences de rédaction d'une personne (toggle `learnFromEdits`). */
export const writingKey = (userId: string) => ['writing', userId] as const

/** Les préférences de rédaction de la personne connectée : une fiche, relue au besoin ; rien si la fonction est coupée. */
export function usePersonalWriting() {
  const { data, profile } = useSession()
  const on = useToggle('learnFromEdits')
  return useQuery({ queryKey: writingKey(profile.userId), queryFn: () => loadPersonal(data, profile.userId), enabled: on, staleTime: 5 * 60_000 })
}
