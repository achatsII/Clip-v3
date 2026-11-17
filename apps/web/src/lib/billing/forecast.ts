/**
 * À ce rythme : le jour où les crédits de la période seront épuisés, d'après ce qui s'est consommé
 * depuis son début. Pour le voir venir (page Abonnement, conseiller d'achat), jamais pour refuser :
 * c'est la plateforme qui décide. Rien à dire trop tôt dans la période (moins de 3 jours), sans
 * consommation, ou quand les crédits tiendront jusqu'au renouvellement.
 */
import type { CreditBucket } from './client'

const DAY = 86400_000
/** Il faut au moins ce recul pour qu'un rythme veuille dire quelque chose. */
export const FORECAST_MIN_DAYS = 3
/** Une période mensuelle, quand la plateforme ne rend pas son début. */
const MONTH = 30.44 * DAY

export interface CreditsForecast {
  /** Le jour où il n'en restera plus, à ce rythme. */
  runsOutAt: string
  /** Combien de jours avant le renouvellement. */
  daysShort: number
  /** Le renouvellement. */
  renewsAt: string
}

export function creditsForecast(c: Pick<CreditBucket, 'available' | 'consumed' | 'period_end' | 'period_start'> | null | undefined, now: number): CreditsForecast | null {
  if (!c?.period_end) return null
  const end = Date.parse(c.period_end)
  const start = c.period_start ? Date.parse(c.period_start) : end - MONTH
  if (!Number.isFinite(end) || !Number.isFinite(start) || now >= end) return null
  const elapsed = (now - start) / DAY
  if (elapsed < FORECAST_MIN_DAYS || c.consumed <= 0) return null
  const perDay = c.consumed / elapsed
  const runsOut = now + (Math.max(0, c.available) / perDay) * DAY
  if (runsOut >= end - DAY) return null
  return { runsOutAt: new Date(runsOut).toISOString(), daysShort: Math.ceil((end - runsOut) / DAY), renewsAt: c.period_end }
}
