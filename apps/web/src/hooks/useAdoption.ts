'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSession } from '@/components/providers/Session'
import { T } from '@/lib/model/repo'
import type { UsageEvent } from '@/lib/model/types'
import { adoptionStats } from '@/lib/stats/adoption'

/** Les événements des `days` derniers jours et leurs chiffres (même cache pour la page et le dossier). */
export function useAdoption(days: number) {
  const { data } = useSession()
  const since = useMemo(() => new Date(Date.now() - days * 86400_000).toISOString(), [days])
  const events = useQuery({
    queryKey: ['events', days],
    queryFn: () =>
      data.filter<UsageEvent>(T.event, {
        filter: { 'json_data.at': { $gte: since } },
        projection: { 'json_data.type': 1, 'json_data.instructionId': 1, 'json_data.stationId': 1, 'json_data.at': 1, 'json_data.durationSec': 1, 'json_data.source': 1, 'json_data.operation': 1 },
        sort: { _id: -1 },
        limit: 10000,
      }),
  })
  const stats = useMemo(() => adoptionStats((events.data ?? []).map((d) => d.json_data), days), [events.data, days])
  return { events, stats, since }
}
