/**
 * Le rôle d'une personne dans l'usine : son réglage (ou celui posé à son invitation), sinon
 * administrateur si la plateforme le dit ou si elle a ouvert CLIP la première, sinon rédactrice.
 * Partagé par l'app et par les routes du serveur.
 */
import type { MemberRole, OrgSettings } from './types'

export function roleOf(org: Pick<OrgSettings, 'members' | 'createdBy'>, profile: { userId: string; email: string; orgRole: string | null }): MemberRole {
  const explicit = org.members[profile.userId]?.role ?? org.members[`email:${profile.email.toLowerCase()}`]?.role
  if (explicit) return explicit
  if (profile.orgRole === 'admin') return 'admin'
  if (org.createdBy && org.createdBy === profile.userId) return 'admin'
  return 'author'
}
