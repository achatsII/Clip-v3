/**
 * Qui appelle une route du serveur, avec son jeton : la personne, son usine, ses réglages et son rôle
 * dans CLIP (lus avec son propre jeton : le serveur n'en a pas).
 */
import type { Doc } from '@/lib/gateway/data'
import { T } from '@/lib/model/repo'
import { roleOf } from '@/lib/model/roles'
import type { MemberRole, OrgSettings } from '@/lib/model/types'
import { dataWith, gatewayJson } from './gateway'

interface Me {
  user?: { sub?: string }
  results?: { email?: string; profile?: { fullname?: string }; organization?: { id?: string } }
}
interface OrgMe {
  organization?: { role?: string; org_id?: string }
}

export interface Caller {
  userId: string
  email: string
  name: string
  orgId: string
  role: MemberRole
  org: Doc<OrgSettings>
}

export async function callerOf(token: string): Promise<Caller | null> {
  const [me, orgMe] = await Promise.all([gatewayJson<Me>('/api/v1/auth/me', token), gatewayJson<OrgMe>('/api/v1/org/me', token)])
  const userId = me?.user?.sub
  if (!userId) return null
  const org = (await dataWith(token).filter<OrgSettings>(T.org, { sort: { _id: 1 }, limit: 1 }).catch(() => []))[0]
  if (!org) return null
  const email = me?.results?.email ?? ''
  return {
    userId,
    email,
    name: me?.results?.profile?.fullname || email,
    orgId: me?.results?.organization?.id || orgMe?.organization?.org_id || '',
    role: roleOf(org.json_data, { userId, email, orgRole: orgMe?.organization?.role ?? null }),
    org,
  }
}
