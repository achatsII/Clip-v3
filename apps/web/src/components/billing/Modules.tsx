'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, ClipboardCheck, GraduationCap, Send } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { moduleOffer } from '@/lib/billing/advice'
import { addonFor, FEATURE_LABELS, featureLabel, MODULES, type FeatureKey, type ModuleDef, type ModuleKey } from '@/lib/billing/catalog'
import type { BillingState, PublicPlan } from '@/lib/billing/client'
import { useMessages } from '@/lib/i18n'
import { logUsage } from '@/lib/model/repo'
import { askAdmin, myRequest } from '@/lib/model/requests'
import { notifyEvent } from '@/lib/notify'
import { useToggle } from '@/lib/toggles'
import { cn } from '@/lib/util/cn'
import { formatPrice } from '@/lib/billing/format'

export const MODULE_ICONS: Record<ModuleKey, ReactNode> = {
  academy: <GraduationCap className="h-6 w-6" />,
  records: <ClipboardCheck className="h-6 w-6" />,
}

/** Où vit chaque module dans l'app : « Ouvrir » y mène. */
export const MODULE_HREF: Record<ModuleKey, string> = { academy: '/equipe?vue=competences', records: '/registre' }

/** Les modules bâtis (leur toggle allumé) : on ne montre, ni ne vend, ce qui n'existe pas encore. */
export function useModules(): ModuleDef[] {
  const academy = useToggle('academy')
  const records = useToggle('recordsPlus')
  const on: Partial<Record<string, boolean>> = { academy, recordsPlus: records }
  return MODULES.filter((m) => on[m.toggle])
}

/**
 * Qui ne peut pas acheter le demande en un geste : l'administrateur le voit dans « À voir » (et
 * par courriel ou sur son téléphone si l'usine avertit). Une seule demande par fonction sur 30 jours.
 */
export function AskAdmin({ feature, targetName, offerId, primary, className }: { feature: string; targetName: string | null; offerId?: string; primary?: boolean; className?: string }) {
  const t = useMessages().billing.request
  const { data, profile, displayName } = useSession()
  const notifyOn = useToggle('notify')
  const toast = useToast()
  const mine = useQuery({ queryKey: ['request', profile.userId, feature], queryFn: () => myRequest(data, profile.userId, feature), staleTime: 60_000 })
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle')

  async function ask() {
    setState('busy')
    try {
      const r = await askAdmin(data, { id: profile.userId, name: displayName }, feature, targetName)
      setState('sent')
      if (!r.created) return
      const what = feature in FEATURE_LABELS ? featureLabel(feature as FeatureKey) : feature
      if (notifyOn) void notifyEvent({ kind: 'request', text: what, instruction: targetName ?? undefined })
      logUsage(data, { type: 'offer', source: 'app', offer: offerId ?? `feature:${feature}`, action: 'ask', userId: profile.userId })
      toast.success(t.sent, t.sentHint)
    } catch (e) {
      setState('idle')
      toast.error(t.failed, errorText(e))
    }
  }

  if (state === 'sent' || mine.data)
    return <p className={cn('rounded-2xl bg-violet-50 p-4 text-sm font-bold text-violet-900 dark:bg-violet-500/10 dark:text-violet-100', className)}>{state === 'sent' ? `${t.sent}. ${t.sentHint}` : t.already}</p>
  return (
    <Button size="lg" block variant={primary ? 'primary' : undefined} className={className} loading={state === 'busy' || mine.isLoading} onClick={() => void ask()} icon={<Send className="h-4 w-4" />}>
      {t.ask}
    </Button>
  )
}

/**
 * Un module sur la page Abonnement : ce qu'il donne, son prix pour le plan de l'usine, l'essai. Dans
 * l'app mobile (`inApp`, l'aperçu seulement), ni prix ni achat : un module ne se vend pas dans les magasins.
 */
export function ModuleCard({ m, plans, state, interval, isAdmin, busy, onBuy, inApp = false }: { m: ModuleDef; plans: PublicPlan[]; state: BillingState | null; interval: 'monthly' | 'yearly'; isAdmin: boolean; busy: boolean; onBuy: (code: string) => void; inApp?: boolean }) {
  const t = useMessages().billing
  const tx = t.modules[m.key]
  const owned = state?.features[m.feature] === true
  const eligible = !!addonFor(m, state?.plan_code)
  const { addon } = moduleOffer(plans, state, m)
  const price = addon?.prices.find((p) => p.interval === interval) ?? addon?.prices[0]
  const days = addon?.trial_days ?? 0
  return (
    <div className="glass-panel flex flex-col rounded-[32px] p-6">
      <div className="flex items-start gap-3">
        <span className="bg-gradient-accent shadow-accent flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white">{MODULE_ICONS[m.key]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-black tracking-tight">{tx.name}</p>
          <p className="text-sm font-bold text-slate-500">{tx.pitch}</p>
        </div>
        {owned && <span className="shrink-0 rounded-xl bg-emerald-100 px-2.5 py-1 text-[10px] font-black tracking-widest text-emerald-700 uppercase">{t.modules.active}</span>}
      </div>
      <ul className="mt-5 flex-1 space-y-2">
        {tx.points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm font-bold">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /> {p}
          </li>
        ))}
      </ul>
      {owned && (
        <Link href={MODULE_HREF[m.key]} className="btn-press glass-card mt-6 flex h-12 items-center justify-center gap-2 rounded-full text-sm font-black">
          {t.modules.open} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
      {!owned &&
        (inApp ? (
          <p className="mt-6 rounded-2xl bg-slate-900/5 p-3 text-center text-sm font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{eligible ? t.preview.moduleOff : t.modules.withPlans}</p>
        ) : !eligible ? (
          <p className="mt-6 rounded-2xl bg-slate-900/5 p-3 text-center text-sm font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{t.modules.withPlans}</p>
        ) : !addon || !price ? (
          <p className="mt-6 text-sm font-bold text-slate-500">{t.modules.notOnSale}</p>
        ) : (
          <div className="mt-6">
            <p className="text-3xl font-black tracking-tighter tabular-nums">
              {formatPrice(price.amount_cents, price.currency)}
              <span className="text-base font-bold text-slate-400"> {price.interval === 'yearly' ? t.perYear : t.perMonth}</span>
            </p>
            {days > 0 && <p className="text-sm font-black text-violet-700 dark:text-violet-300">{t.modules.trial(days)}</p>}
            <div className="mt-4">
              {isAdmin ? (
                <Button variant="primary" block size="lg" loading={busy} onClick={() => onBuy(addon.code)}>
                  {days > 0 ? t.modules.tryFree(days) : t.modules.add(tx.name)}
                </Button>
              ) : (
                <AskAdmin feature={m.feature} targetName={tx.name} offerId={`module:${m.key}`} />
              )}
            </div>
          </div>
        ))}
    </div>
  )
}
