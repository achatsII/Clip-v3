/**
 * Ce que l'on utilise des limites du plan (postes, rédacteurs, instructions publiées), en mots.
 * Fonctions pures, testées : la jauge s'allume à 80 %, la fenêtre des refus dit où l'on en est,
 * et ni l'une ni l'autre n'annonce un compte faux.
 */
import { messages } from '@/lib/i18n'
import { amountOf } from './advice'
import type { LimitFeature } from './catalog'
import type { PublicPlan } from './client'
import type { MemberSettings } from '../model/types'

/** Dès 80 % d'une limite, la jauge le montre et dit quel plan en donne plus. */
export const NEAR_RATIO = 0.8

export type UsageLevel = 'ok' | 'near' | 'full'

export function usageLevel(l: { used: number; limit: number | null } | null | undefined): UsageLevel {
  if (!l || l.limit === null) return 'ok'
  if (l.used >= l.limit) return 'full'
  return l.used / l.limit >= NEAR_RATIO ? 'near' : 'ok'
}

/** Le nom d'une limite et ses deux formes, dans la langue de l'outil (le pluriel suit la langue). */
const noun = (feature: LimitFeature) => messages().billing.limits.nouns[feature]

/** « 5 postes », « 1 rédacteur ». */
export function countText(feature: LimitFeature, n: number): string {
  return messages().billing.limits.count(n, noun(feature))
}

/** « 21 postes sur 25 ». */
export function usageText(feature: LimitFeature, used: number, limit: number): string {
  return messages().billing.limits.outOf(used, limit, noun(feature))
}

/**
 * Pourquoi la fenêtre s'ouvre pour une limite : ce que le plan permet, et où l'on en est quand
 * l'écran le sait (`used` absent : on ne dit pas de compte).
 */
export function limitReason(feature: LimitFeature, limit: number | null, used?: number): string {
  const t = messages().billing.limits
  const tail = feature === 'editors' ? ` ${t.notCounted}` : ''
  if (limit === null) return `${t.noLimit}${tail}`
  if (limit <= 0) return `${t.notIncluded}${tail}`
  if (used === undefined) return `${t.allows(countText(feature, limit))}${tail}`
  if (used >= limit) return `${t.reached(countText(feature, limit))}${tail}`
  return `${t.at(usageText(feature, used, limit))}${tail}`
}

/** Ce que le plan conseillé donne pour cette limite : « Équipe : 25 postes ». */
export function offerText(plan: PublicPlan, feature: LimitFeature): string {
  const t = messages().billing.limits
  const n = amountOf(plan, feature)
  return n === Infinity ? t.offerUnlimited(plan.name, noun(feature)) : t.offer(plan.name, countText(feature, n))
}

/** Les rédacteurs comptés par le plan : tous les membres sauf les lecteurs, invitations comprises (au moins soi). */
export function countEditors(members: Record<string, MemberSettings>): number {
  return Math.max(1, Object.values(members).filter((m) => m.role !== 'reader').length)
}
