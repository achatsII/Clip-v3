/**
 * Parler à la Gateway depuis une route du serveur, avec le jeton reçu (celui de la personne, ou
 * le jeton invité d'un lien de poste) : jamais un jeton du serveur, il n'en a pas.
 */
import { createGatewayClient } from '@/lib/gateway/client'
import { dataApi } from '@/lib/gateway/data'

export const GATEWAY_URL = (process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://qa.gateway.intelligenceindustrielle.com').replace(/\/$/, '')

/** Les données, vues avec ce jeton (sans rafraîchissement : un refus est un refus). */
export function dataWith(token: string) {
  return dataApi(createGatewayClient({ getToken: () => token, refresh: async () => false, onAuthFailure: () => undefined }))
}

/** Un appel JSON à la Gateway ; null si elle refuse ou ne répond pas. */
export async function gatewayJson<T>(path: string, token: string | null, init: { method?: string; body?: unknown } = {}): Promise<T | null> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  }).catch(() => null)
  if (!res?.ok) return null
  return (await res.json().catch(() => null)) as T | null
}

/** Le jeton du porteur, s'il y en a un. */
export function bearer(header: string | null): string | null {
  return header?.startsWith('Bearer ') && header.length > 20 ? header.slice(7) : null
}
