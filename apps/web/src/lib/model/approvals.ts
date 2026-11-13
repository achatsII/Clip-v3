/**
 * L'approbation à plusieurs (toggle `multiApproval`, mode `all`) : chaque groupe de l'usine
 * (« Qualité », « Chef d'atelier ») signe l'instruction en revue, et elle se publie à la dernière
 * signature. Une signature vaut pour le contenu signé : modifié ensuite, il faut la refaire.
 */
import { hashText } from '../util/hash'
import type { ApprovalGroup, InstructionContent, OrgSettings, ReviewRequest, Signature } from './types'

export const MAX_GROUPS = 4

/** Les groupes qui doivent signer ; aucun hors du mode « plusieurs signatures » ou toggle coupé. */
export function signingGroups(org: Pick<OrgSettings, 'approval'>, on: boolean): ApprovalGroup[] {
  if (!on || org.approval.mode !== 'all') return []
  return (org.approval.groups ?? []).filter((g) => g.name.trim())
}

/** Faut-il une approbation pour publier ? À plusieurs, même un approbateur demande les signatures. */
export function needsApproval(org: Pick<OrgSettings, 'approval'>, actorRole: string, multiOn: boolean): boolean {
  if (org.approval.mode === 'none') return false
  if (org.approval.mode === 'all' && multiOn && signingGroups(org, multiOn).length) return true
  return actorRole !== 'admin' && actorRole !== 'approver'
}

/** L'empreinte d'un contenu : une signature vaut pour ce qui a été signé. */
export const contentHash = (c: InstructionContent): string => hashText(JSON.stringify(c))

export interface GroupState {
  group: ApprovalGroup
  /** La signature du contenu tel qu'il est. */
  signature: Signature | null
  /** Signé, mais sur un contenu modifié depuis : à refaire. */
  stale: boolean
}

/** Où en est chaque groupe pour ce contenu. */
export function signingState(groups: ApprovalGroup[], review: ReviewRequest | null | undefined, content: InstructionContent): GroupState[] {
  const hash = contentHash(content)
  return groups.map((group) => {
    const mine = (review?.signatures ?? []).filter((s) => s.groupId === group.id)
    const signature = mine.find((s) => s.hash === hash) ?? null
    return { group, signature, stale: !signature && mine.length > 0 }
  })
}

/** Peut-elle signer pour ce groupe ? Un membre ; un groupe sans membre : tout approbateur. */
export function canSign(group: ApprovalGroup, userId: string, mayApprove: boolean): boolean {
  if (!mayApprove) return false
  return group.memberIds.length ? group.memberIds.includes(userId) : true
}

/** Les groupes que cette personne peut signer maintenant (pas encore signés pour ce contenu). */
export function groupsToSign(state: GroupState[], userId: string, mayApprove: boolean): ApprovalGroup[] {
  return state.filter((s) => !s.signature && canSign(s.group, userId, mayApprove)).map((s) => s.group)
}

/**
 * Ajoute les signatures de cette personne pour ces groupes (une ancienne signature du groupe est
 * remplacée) ; rend la liste à jour, et si chaque groupe a signé ce contenu.
 */
export function addSignatures(existing: Signature[], groups: ApprovalGroup[], signing: ApprovalGroup[], actor: { id: string; name: string }, hash: string, at: string): { signatures: Signature[]; complete: boolean } {
  const ids = new Set(signing.map((g) => g.id))
  const signatures = [...existing.filter((s) => !ids.has(s.groupId)), ...signing.map((g) => ({ groupId: g.id, groupName: g.name, by: actor.id, byName: actor.name, at, hash }))]
  const complete = groups.every((g) => signatures.some((s) => s.groupId === g.id && s.hash === hash))
  return { signatures, complete }
}

/** Les signatures, telles que la version les garde (et une ligne pour « approuvée par »). */
export function approvalsOf(signatures: Signature[], groups: ApprovalGroup[], hash: string): { approvals: Array<{ group: string; byName: string; at: string }>; line: string } {
  const approvals = groups.flatMap((g) => {
    const s = signatures.find((x) => x.groupId === g.id && x.hash === hash)
    return s ? [{ group: g.name, byName: s.byName, at: s.at }] : []
  })
  return { approvals, line: approvals.map((a) => `${a.byName} (${a.group})`).join(', ') }
}
