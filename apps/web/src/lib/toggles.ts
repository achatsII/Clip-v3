'use client'

/**
 * Feature toggles pilotés par le serveur (`GET /api/config`). Serveur injoignable : chaque toggle
 * prend sa valeur de repli, qui n'active jamais une fonction nouvelle ni n'ajoute de blocage.
 */
import { useQuery } from '@tanstack/react-query'
import type { PublicConfig } from '@clip/bridge'
import { FALLBACK_TOGGLES, type ToggleName } from './toggleDefaults'

export type { ToggleName }

async function fetchConfig(): Promise<PublicConfig | null> {
  try {
    const res = await fetch('/api/config', { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as PublicConfig
  } catch {
    return null
  }
}

export function usePublicConfig() {
  return useQuery({ queryKey: ['public-config'], queryFn: fetchConfig, staleTime: 5 * 60_000, retry: 1 })
}

export function useToggle(name: ToggleName): boolean {
  const q = usePublicConfig()
  if (!q.data) return FALLBACK_TOGGLES[name]
  return q.data.toggles[name] ?? FALLBACK_TOGGLES[name]
}

export function useRealtimeAvailable(): boolean {
  return !!usePublicConfig().data?.realtime
}
