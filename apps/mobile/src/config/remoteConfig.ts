import type { NativePlatform, PublicConfig } from '../bridge/protocol'
import { fetchWithRetry } from '../net/http'

/**
 * Lit `GET {web}/api/config`. Toute réponse illisible ou absente donne `null` :
 * l'appelant applique alors le comportement de base (aucun blocage, capacités natives).
 */
export async function fetchPublicConfig(
  origin: string,
  appVersion: string,
  platform: NativePlatform,
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>,
): Promise<PublicConfig | null> {
  try {
    const res = await fetchWithRetry(
      `${origin}/api/config`,
      {
        headers: {
          Accept: 'application/json',
          'X-App-Version': appVersion,
          'X-App-Platform': platform,
        },
        timeoutMs: 6_000,
        retries: 1,
      },
      fetchImpl,
    )
    if (!res.ok) return null
    return parsePublicConfig(await res.json())
  } catch {
    return null
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Valide la forme reçue ; ignore ce qui est inconnu, refuse ce qui est faux. */
export function parsePublicConfig(raw: unknown): PublicConfig | null {
  if (!isRecord(raw) || raw.configVersion !== 1) return null

  const forceUpdate: PublicConfig['forceUpdate'] = {}
  if (isRecord(raw.forceUpdate)) {
    for (const platform of ['ios', 'android'] as const) {
      const rule = raw.forceUpdate[platform]
      if (isRecord(rule) && typeof rule.versions === 'string') {
        forceUpdate[platform] = {
          versions: rule.versions,
          storeUrl: typeof rule.storeUrl === 'string' ? rule.storeUrl : '',
        }
      }
    }
  }

  const toggles: Record<string, boolean> = {}
  if (isRecord(raw.toggles)) {
    for (const [key, value] of Object.entries(raw.toggles)) {
      if (typeof value === 'boolean') toggles[key] = value
    }
  }

  return {
    configVersion: 1,
    forceUpdate,
    toggles,
    realtime: raw.realtime === true,
  }
}
