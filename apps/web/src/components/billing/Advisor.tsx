'use client'

import { useQuery } from '@tanstack/react-query'
import { Coins, Gauge, Lock } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { usePublishedCount, useStations } from '@/hooks/queries'
import { nativeEnv } from '@/lib/bridge/native'
import { amountOf } from '@/lib/billing/advice'
import { candidates, pickOffer, snooze, type Offer } from '@/lib/billing/advisor'
import { readAdvisor, writeAdvisor, type AdvisorStored } from '@/lib/billing/advisorStore'
import { addonFor, FEATURE_LABELS, featureLabel, MODULES, type LimitFeature, type ModuleKey } from '@/lib/billing/catalog'
import type { PublicPlan } from '@/lib/billing/client'
import { useBilling } from '@/lib/billing/state'
import { offerText, usageText } from '@/lib/billing/usage'
import { useMessages, type Messages } from '@/lib/i18n'
import { logUsage, T } from '@/lib/model/repo'
import { useToggle } from '@/lib/toggles'
import { usePlans } from './Billing'
import { billingClient } from './BillingRoot'
import { MODULE_ICONS, useModules } from './Modules'
import { useUsage } from './Usage'

const DAY = 86400_000

/**
 * L'offre du conseiller d'achat (toggle `salesAdvisor`), à l'accueil seulement : une à la fois, tirée
 * de l'usage de l'usine (une limite qui se remplit, une fonction fermée essayée plusieurs fois, un
 * module que l'usage appelle). Les comptes sont lus avant de choisir : une offre montrée ne disparaît
 * pas parce qu'un compte se charge encore.
 */
function useAdvisor() {
  const { enabled, state } = useBilling()
  const on = useToggle('salesAdvisor')
  const { profile, data, can } = useSession()
  const active = enabled && on && can('instructions', 'write') && !!state
  const plans = usePlans(billingClient, active)
  const usage = useUsage()
  const stations = useStations()
  const published = usePublishedCount()
  // Un module ne se vend pas dans les magasins : dans l'app, seulement les plans.
  const built = useModules()
  const sellable = useMemo(() => (nativeEnv() ? [] : built.map((m) => m.key)), [built])
  const [now] = useState(() => Date.now())
  const since = useMemo(() => new Date(now - 30 * DAY).toISOString(), [now])
  const wants = (key: ModuleKey) => {
    const m = MODULES.find((x) => x.key === key)!
    return active && sellable.includes(key) && !!addonFor(m, state?.plan_code) && state?.features[m.feature] !== true
  }
  const trainings = useQuery({
    queryKey: ['advisor', 'trainings', since],
    queryFn: () => data.count(T.training, { 'json_data.at': { $gte: since }, 'json_data.passed': { $eq: true } }),
    enabled: wants('academy'),
    staleTime: 3600_000,
  })
  const checks = useQuery({
    queryKey: ['advisor', 'checks', since],
    queryFn: () => data.count(T.execution, { 'json_data.finishedAt': { $gte: since }, 'json_data.answers.0': { $exists: true } }),
    enabled: wants('records'),
    staleTime: 3600_000,
  })
  const [stored, setStored] = useState<AdvisorStored | null>(null)
  useEffect(() => {
    if (active) setStored(readAdvisor(profile.userId))
  }, [active, profile.userId])

  const ready = active && !!stored && !!plans.data && stations.data !== undefined && published.data !== undefined && (!wants('academy') || trainings.isFetched) && (!wants('records') || checks.isFetched)
  const pick = useMemo(() => {
    if (!ready || !state || !stored || !plans.data) return null
    const limits: Partial<Record<LimitFeature, { used: number; limit: number | null }>> = {}
    for (const [k, l] of Object.entries(usage) as Array<[LimitFeature, (typeof usage)[LimitFeature]]>) if (l) limits[k] = { used: l.used, limit: l.limit }
    const list = candidates({ state, plans: plans.data.plans, usage: limits, tries: stored.tries, evidence: { academy: trainings.data ?? null, records: checks.data ?? null }, modules: sellable, now })
    return pickOffer(list, stored.memory, now)
  }, [ready, state, stored, plans.data, usage, trainings.data, checks.data, sellable, now])

  // La mémoire suit le choix ; une offre qui paraît se note une fois (pour mesurer ce qui sert).
  useEffect(() => {
    if (!pick || !stored || JSON.stringify(pick.memory) === JSON.stringify(stored.memory)) return
    const next = { ...stored, memory: pick.memory }
    writeAdvisor(profile.userId, next)
    setStored(next)
    if (pick.fresh && pick.offer) logUsage(data, { type: 'offer', source: 'app', offer: pick.offer.id, action: 'shown', userId: profile.userId })
  }, [pick, stored, profile.userId, data])

  const later = (offer: Offer) => {
    if (!stored) return
    const next = { ...stored, memory: snooze(stored.memory, offer.id, Date.now()) }
    writeAdvisor(profile.userId, next)
    setStored(next)
    logUsage(data, { type: 'offer', source: 'app', offer: offer.id, action: 'later', userId: profile.userId })
  }
  return { offer: pick?.offer ?? null, plans: plans.data?.plans ?? [], later }
}

/** Ce que la carte dit d'une offre : un titre, une phrase, une icône. */
function describe(offer: Offer, plans: PublicPlan[], t: Messages): { title: string; text: string; icon: ReactNode } {
  const a = t.billing.advisor
  const plan = (code: string | null) => plans.find((p) => p.code === code) ?? null
  const trial = (code: string | null) => {
    const days = plan(code)?.trial_days ?? 0
    return days > 0 ? t.billing.modules.trial(days) : ''
  }
  if (offer.kind === 'limit') {
    const p = plan(offer.plan)
    const offerLine = p ? offerText(p, offer.feature) : ''
    return { title: a.limitTitle[offer.feature], text: (offer.full ? a.limitFull : a.limitNear)(usageText(offer.feature, offer.used, offer.limit), offerLine), icon: <Gauge className="h-6 w-6" /> }
  }
  if (offer.kind === 'module') {
    const text = offer.module === 'academy' ? a.academy(offer.evidence, trial(offer.addon)) : a.records(offer.evidence, trial(offer.addon))
    return { title: offer.module === 'academy' ? a.academyTitle : a.recordsTitle, text, icon: MODULE_ICONS[offer.module] }
  }
  if (offer.feature === 'ai_credits') {
    const p = plan(offer.plan)
    const line = p ? `${p.name} : ${t.billing.plans.perMonth(t.billing.credits(amountOf(p, 'ai_credits')))}` : ''
    return { title: a.creditsTitle, text: a.credits(offer.tries, line), icon: <Coins className="h-6 w-6" /> }
  }
  const mod = MODULES.find((m) => m.feature === offer.feature)
  const title = offer.feature in FEATURE_LABELS ? featureLabel(offer.feature) : offer.feature
  if (mod) {
    const name = t.billing.modules[mod.key].name
    const text = offer.addon ? a.triedModule(offer.tries, name, trial(offer.addon)) : a.triedModulePlan(offer.tries, name, plan(offer.plan)?.name ?? '')
    return { title: name, text, icon: MODULE_ICONS[mod.key] }
  }
  return { title, text: a.tried(offer.tries, plan(offer.plan)?.name ?? ''), icon: <Lock className="h-6 w-6" /> }
}

/** La carte de l'offre, à l'accueil : « Voir l'offre » ouvre la fenêtre d'achat, « Plus tard » la range un mois. */
export function OfferCard() {
  const t = useMessages()
  const { openPaywall } = useBilling()
  const { data, profile } = useSession()
  const { offer, plans, later } = useAdvisor()
  if (!offer) return null
  const { title, text, icon } = describe(offer, plans, t)
  const open = () => {
    logUsage(data, { type: 'offer', source: 'app', offer: offer.id, action: 'open', userId: profile.userId })
    openPaywall({ feature: offer.feature, used: offer.kind === 'limit' ? offer.used : undefined, source: 'advisor' })
  }
  return (
    <section className="glass-panel animate-slide-up flex flex-col gap-4 rounded-[32px] p-5 sm:flex-row sm:items-center" aria-label={t.billing.advisor.eyebrow}>
      <span className="bg-gradient-accent shadow-accent flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="label-caps text-violet-600 dark:text-violet-300">{t.billing.advisor.eyebrow}</p>
        <p className="text-lg font-black tracking-tight">{title}</p>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{text}</p>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button type="button" onClick={() => later(offer)} className="btn-press h-11 rounded-full px-4 text-sm font-black text-slate-500 dark:text-slate-400">
          {t.billing.advisor.later}
        </button>
        <Button onClick={open}>{t.billing.advisor.see}</Button>
      </div>
    </section>
  )
}
