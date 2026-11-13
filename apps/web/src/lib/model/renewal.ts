/**
 * La relecture périodique d'une instruction publiée (toggle `renewal`) : on la revoit tous les N
 * mois. Un mois avant l'échéance, l'éditeur, la liste et l'accueil le rappellent ; si rien n'a
 * changé, « Toujours bonne » repousse l'échéance d'un geste, sans nouvelle version. Une publication
 * la repousse aussi. Rien ne bloque l'opérateur : une révision en retard se voit, elle ne coupe pas.
 */
import type { Instruction, OrgSettings, Renewal } from './types'

/** Les choix offerts, en mois ; null : jamais. */
export const RENEWAL_CHOICES = [6, 12, 24, null] as const
/** Le défaut d'une usine qui n'a rien choisi : chaque année. */
export const DEFAULT_RENEWAL_MONTHS = 12
/** On le rappelle un mois avant. */
export const RENEWAL_SOON_DAYS = 30

export type RenewalState = 'none' | 'ok' | 'soon' | 'late'

/** La même date, N mois plus tard (le 31 janvier + 1 mois = le dernier jour de février). */
export function addMonths(iso: string, months: number): string {
  const d = new Date(iso)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return d.toISOString()
}

/** La relecture après une publication ou une confirmation, faite le `at`. */
export function renewalFrom(months: number | null, at: string, byName: string): Renewal {
  return { months, dueAt: months ? addMonths(at, months) : null, lastAt: at, lastByName: byName }
}

/** La période d'une instruction : la sienne, sinon celle de l'usine, sinon chaque année. */
export function renewalMonthsOf(instr: Pick<Instruction, 'renewal'>, org: Pick<OrgSettings, 'renewalMonths'>): number | null {
  if (instr.renewal && instr.renewal.months !== undefined) return instr.renewal.months
  return org.renewalMonths === undefined ? DEFAULT_RENEWAL_MONTHS : org.renewalMonths
}

/** Où en est la relecture : à jour, bientôt (un mois avant), en retard, ou sans échéance. */
export function renewalState(i: Pick<Instruction, 'renewal' | 'publishedVersion' | 'status'>, now = Date.now()): RenewalState {
  if (!i.publishedVersion || i.status === 'archived' || !i.renewal?.dueAt) return 'none'
  const due = Date.parse(i.renewal.dueAt)
  if (!Number.isFinite(due)) return 'none'
  if (due <= now) return 'late'
  return due - now <= RENEWAL_SOON_DAYS * 86_400_000 ? 'soon' : 'ok'
}

/** À revoir maintenant (bientôt ou en retard). */
export const needsRenewal = (i: Pick<Instruction, 'renewal' | 'publishedVersion' | 'status'>, now = Date.now()) => {
  const s = renewalState(i, now)
  return s === 'soon' || s === 'late'
}
