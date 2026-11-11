/**
 * Session d'un lien public : l'uuid du lien s'échange contre un jeton guest à portée limitée
 * (`GET /api/v1/redirect/{uuid}`). Sur 401, on rééchange l'uuid une fois.
 */
import { createGatewayClient, publicCall, type GatewayClient } from './client'

export interface GuestLink {
  token: string
  scope: { resources: Array<{ data_type: string; filter?: Record<string, unknown>; actions: string[] }> } | null
  permissions: string[]
  organizationId: string | null
}

interface RedirectResponse {
  access_token?: string
  data?: { permissions?: string[]; scope?: GuestLink['scope']; organization_id?: string }
}

export async function exchangeLink(uuid: string): Promise<GuestLink> {
  const res = await publicCall<RedirectResponse>(`/api/v1/redirect/${encodeURIComponent(uuid)}`)
  if (!res.access_token) throw new Error('Lien invalide')
  return { token: res.access_token, scope: res.data?.scope ?? null, permissions: res.data?.permissions ?? [], organizationId: res.data?.organization_id ?? null }
}

export function guestClient(uuid: string, initial: GuestLink, onDead: () => void): GatewayClient {
  let token = initial.token
  return createGatewayClient({
    getToken: () => token,
    refresh: async () => {
      try {
        token = (await exchangeLink(uuid)).token
        return true
      } catch {
        return false
      }
    },
    onAuthFailure: onDead,
  })
}

/** L'identifiant de la ressource ouverte par le lien (le `_id` du filtre d'un type de données). */
export function scopedId(link: GuestLink, dataType: string, field = '_id'): string | null {
  const r = link.scope?.resources.find((x) => x.data_type === dataType)
  const v = r?.filter?.[field]
  return typeof v === 'string' ? v : null
}

/** La page publique peut-elle lire à voix haute ? (`ai:tts` : jetons émis avant la voix en direct.) */
export function canReadAloud(permissions: string[]): boolean {
  return permissions.includes('ai:live') || permissions.includes('ai:tts')
}
