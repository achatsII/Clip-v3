/**
 * Organisation (`/api/v1/org/*`) : membres et invitations. Le refus « pas administrateur » arrive
 * selon la route en 401, 403 ou 500 (piège n° 2 de la référence) : on lit `error` avant de conclure.
 */
import { ApiError, getAccessToken, type GatewayClient } from './client'

export interface Member {
  user_id: string
  email: string
  full_name: string | null
  role: string
}

export function isNotAdmin(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false
  const text = JSON.stringify(e.detail ?? '').toLowerCase()
  return [401, 403, 500].includes(e.status) && (text.includes('not admin') || text.includes('unauthorized') || e.status === 403)
}

/** Lit un claim du jeton courant (sans vérifier la signature : pour l'affichage seulement). */
export function tokenClaim(name: string): unknown {
  const token = getAccessToken()
  if (!token) return undefined
  try {
    const part = token.split('.')[1]
    const json = JSON.parse(decodeURIComponent(escape(atob(part.replace(/-/g, '+').replace(/_/g, '/')))))
    return (json as Record<string, unknown>)[name]
  } catch {
    return undefined
  }
}

/** L'accès applicatif de CLIP pour cette organisation (nécessaire pour inviter). */
export function currentGrantId(): string | null {
  for (const k of ['grant_id', 'grantId', 'x-grant-id']) {
    const v = tokenClaim(k)
    if (typeof v === 'string' && v) return v
  }
  return null
}

export function orgApi(client: GatewayClient) {
  return {
    async members(): Promise<Member[]> {
      const res = await client.call<{ members?: Member[] }>('/api/v1/org/memberships')
      return res.members ?? []
    },
    async invite(email: string, grantIds: string[]): Promise<void> {
      await client.call('/api/v1/org/invitations/invite', { method: 'POST', body: { email: email.trim().toLowerCase(), role: 'user', grant_ids: grantIds } })
    },
    async remove(userId: string): Promise<void> {
      await client.call('/api/v1/org/memberships/remove', { method: 'DELETE', body: { user_id: userId } })
    },
  }
}
