/**
 * Ce que l'on utilise des limites du plan (postes, rédacteurs, instructions publiées), en mots.
 * Fonctions pures, testées : la jauge s'allume à 80 %, la fenêtre des refus dit où l'on en est,
 * et ni l'une ni l'autre n'annonce un compte faux.
 */
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

const NOUN: Record<LimitFeature, [string, string]> = {
  stations: ['poste', 'postes'],
  editors: ['rédacteur', 'rédacteurs'],
  published_instructions: ['instruction publiée', 'instructions publiées'],
}

const fmt = (n: number) => n.toLocaleString('fr-CA')
/** En français, 0 et 1 prennent le singulier. */
const noun = (feature: LimitFeature, n: number) => NOUN[feature][n > 1 ? 1 : 0]

/** « 5 postes », « 1 rédacteur ». */
export function countText(feature: LimitFeature, n: number): string {
  return `${fmt(n)} ${noun(feature, n)}`
}

/** « 21 postes sur 25 ». */
export function usageText(feature: LimitFeature, used: number, limit: number): string {
  return `${fmt(used)} ${noun(feature, used)} sur ${fmt(limit)}`
}

/** Le titre de la fenêtre quand une limite la fait ouvrir. */
export const LIMIT_TITLE: Record<LimitFeature, string> = {
  stations: 'Plus de postes',
  editors: 'Plus de rédacteurs',
  published_instructions: 'Plus d’instructions publiées',
}

/**
 * Pourquoi la fenêtre s'ouvre pour une limite : ce que le plan permet, et où l'on en est quand
 * l'écran le sait (`used` absent : on ne dit pas de compte).
 */
export function limitReason(feature: LimitFeature, limit: number | null, used?: number): string {
  const tail = feature === 'editors' ? ' Les lecteurs et les opérateurs ne se comptent jamais.' : ''
  if (limit === null) return `Votre plan n’a pas de limite ici.${tail}`
  if (limit <= 0) return `Votre plan actuel n’en comprend pas.${tail}`
  if (used === undefined) return `Votre plan permet ${fmt(limit)} ${noun(feature, limit)}.${tail}`
  if (used >= limit) return `Votre plan permet ${fmt(limit)} ${noun(feature, limit)} : la limite est atteinte.${tail}`
  return `Vous en êtes à ${usageText(feature, used, limit)}.${tail}`
}

/** Ce que le plan conseillé donne pour cette limite : « Équipe : 25 postes ». */
export function offerText(plan: PublicPlan, feature: LimitFeature): string {
  const n = amountOf(plan, feature)
  return n === Infinity ? `${plan.name} : ${NOUN[feature][1]} sans limite` : `${plan.name} : ${fmt(n)} ${noun(feature, n)}`
}

/** Les rédacteurs comptés par le plan : tous les membres sauf les lecteurs, invitations comprises (au moins soi). */
export function countEditors(members: Record<string, MemberSettings>): number {
  return Math.max(1, Object.values(members).filter((m) => m.role !== 'reader').length)
}
