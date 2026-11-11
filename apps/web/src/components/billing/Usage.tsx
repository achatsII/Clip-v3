'use client'

import { Gauge } from 'lucide-react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { useInstructions, useStations } from '@/hooks/queries'
import { planFor } from '@/lib/billing/advice'
import type { LimitFeature } from '@/lib/billing/catalog'
import type { LimitStatus } from '@/lib/billing/client'
import { useBilling, useLimit } from '@/lib/billing/state'
import { countEditors, offerText, usageLevel, usageText } from '@/lib/billing/usage'
import { cn } from '@/lib/util/cn'
import { usePlans } from './Billing'
import { billingClient } from './BillingRoot'

/** Les trois limites du plan, comptées par l'app (la plateforme ne les reçoit pas). `null` : rien à montrer. */
export function useUsage(): Record<LimitFeature, LimitStatus | null> {
  const { org } = useSession()
  const stations = useStations()
  const instructions = useInstructions()
  const stationLimit = useLimit('stations', stations.data?.length)
  const editorLimit = useLimit('editors', countEditors(org.json_data.members))
  const publishLimit = useLimit('published_instructions', instructions.data?.filter((d) => d.json_data.publishedVersion).length)
  return { stations: stationLimit, editors: editorLimit, published_instructions: publishLimit }
}

/**
 * Où l'on en est d'une limite du plan : une ligne discrète, puis, dès 80 %, la jauge s'allume et
 * dit quel plan en donne plus. Facturation éteinte ou limite illimitée : rien. `quiet` : rien
 * non plus tant qu'on est loin de la limite (sur un écran déjà chargé).
 */
export function UsageMeter({ feature, limit, quiet, className }: { feature: LimitFeature; limit: LimitStatus | null; quiet?: boolean; className?: string }) {
  const { state, openPaywall } = useBilling()
  const level = usageLevel(limit)
  const warn = level !== 'ok'
  const plans = usePlans(billingClient, warn)
  if (!limit || limit.limit === null || (quiet && !warn)) return null
  const next = warn && plans.data ? planFor(plans.data.plans, state, feature) : null
  const pct = limit.limit > 0 ? Math.min(100, (limit.used / limit.limit) * 100) : 100
  const text = usageText(feature, limit.used, limit.limit)
  return (
    <div className={cn(warn && 'rounded-[20px] bg-amber-50 p-3 dark:bg-amber-500/10', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-bold text-slate-600 tabular-nums dark:text-slate-300">{text} dans votre plan</p>
        {warn && (
          <span className="inline-flex items-center gap-1 text-xs font-black tracking-wide text-amber-800 uppercase dark:text-amber-200">
            <Gauge className="h-3.5 w-3.5" /> {level === 'full' ? 'Limite atteinte' : 'Bientôt plein'}
          </span>
        )}
      </div>
      <div role="meter" aria-label={text} aria-valuemin={0} aria-valuemax={limit.limit} aria-valuenow={limit.used} className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
        <div className={cn('h-full rounded-full transition-[width] duration-500', warn ? 'bg-amber-500' : 'bg-gradient-primary')} style={{ width: `${pct}%` }} />
      </div>
      {next && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{offerText(next, feature)}.</p>
          <Button size="sm" onClick={() => openPaywall({ feature, used: limit.used })}>
            Voir {next.name}
          </Button>
        </div>
      )}
    </div>
  )
}
