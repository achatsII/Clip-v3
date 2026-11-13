'use client'

import { useQuery } from '@tanstack/react-query'
import { Check, Coins, FileText, Lock, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { nativeEnv } from '@/lib/bridge/native'
import { creditsReason, moduleOffer, planFor, renewalText } from '@/lib/billing/advice'
import { FEATURE_LABELS, FEATURE_ORDER, PLAN_PITCH, featureLabel, featureUnit, isLimitFeature, moduleOf, type FeatureKey } from '@/lib/billing/catalog'
import { formatPrice } from '@/lib/billing/format'
import { BillingError, creditsOf, limitOf, type BillingClient, type PublicPlan } from '@/lib/billing/client'
import { limitReason } from '@/lib/billing/usage'
import { useBilling, useEntitlement } from '@/lib/billing/state'
import { messages, num, useMessages } from '@/lib/i18n'
import { useToggle } from '@/lib/toggles'
import { AskAdmin, MODULE_ICONS, useModules } from './Modules'
import { devicePlatform, StoreBuy } from './Store'
import { cn, formatDate, plural } from '@/lib/util/cn'

export { formatPrice } from '@/lib/billing/format'

/** Une ligne de ce que donne un plan, en mots (jamais une clé brute). */
export function entitlementLines(plan: PublicPlan): string[] {
  const t = messages().billing.plans
  const out: string[] = []
  const e = plan.entitlements
  for (const key of FEATURE_ORDER) {
    if (!FEATURE_LABELS[key]) continue
    const label = featureLabel(key)
    const unit = featureUnit(key)
    const credit = e.credits?.find((c) => c.feature_key === key)
    if (credit) {
      out.push(t.perMonth(unit ? plural(credit.amount, unit[0], unit[1]) : num(credit.amount)))
      continue
    }
    if (e.limits && key in e.limits) {
      const v = e.limits[key]
      if (v === null) out.push(t.unlimited(label, key))
      // Sans unité, le libellé sert de nom.
      else if (v > 0) out.push(unit ? plural(v, unit[0], unit[1]) : plural(v, label.toLowerCase(), label.toLowerCase()))
      continue
    }
    if (e.features?.[key]) out.push(label)
  }
  return out
}

/** Les plans en vente ; `when` faux : rien n'est lu (une jauge loin de sa limite). */
export function usePlans(client: BillingClient, when = true) {
  const { enabled } = useBilling()
  return useQuery({ queryKey: ['billing-plans'], queryFn: () => client.plans(), enabled: enabled && when, staleTime: 10 * 60_000 })
}

/** Pastille de solde dans l'en-tête des écrans qui consomment des crédits. */
export function CreditPill() {
  const t = useMessages()
  const { enabled, state } = useBilling()
  const [open, setOpen] = useState(false)
  if (!enabled || !state) return null
  const c = creditsOf(state, 'ai_credits')
  if (!c) return null
  const low = c.granted > 0 && c.available / c.granted < 0.2
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn('btn-press glass-card flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black tabular-nums', low && 'text-amber-700 ring-2 ring-amber-300')}>
        <Coins className="h-4 w-4" /> {num(Math.round(c.available / (c.unit_scale || 1)))}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t.billing.aiCredits} size="sm">
        <p className="text-5xl font-black tracking-tighter tabular-nums">{num(Math.round(c.available))}</p>
        <p className="font-bold text-slate-500">{t.billing.pill.available}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-bold">
          <div className="glass-card rounded-2xl p-3">
            <p className="label-caps text-slate-400">{t.billing.pill.thisMonth}</p>
            <p className="tabular-nums">{t.billing.pill.granted(c.granted)}</p>
          </div>
          <div className="glass-card rounded-2xl p-3">
            <p className="label-caps text-slate-400">{t.billing.pill.used}</p>
            <p className="tabular-nums">{num(c.consumed)}</p>
          </div>
        </div>
        {c.period_end && <p className="mt-4 text-sm font-bold text-slate-500">{t.billing.renewsOn(formatDate(c.period_end))}</p>}
        <p className="mt-2 text-sm font-medium text-slate-500">{t.billing.pill.howItWorks}</p>
        <Link href="/reglages/abonnement" onClick={() => setOpen(false)} className="btn-press glass-card mt-5 flex h-12 items-center justify-center rounded-full font-black">
          {t.billing.pill.viewSubscription}
        </Link>
      </Modal>
    </>
  )
}

/** Petit cadenas à côté d'une action hors plan. */
export function LockBadge({ className }: { className?: string }) {
  const t = useMessages()
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-lg bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-black tracking-wide text-white uppercase', className)}>
      <Lock className="h-3 w-3" /> {t.billing.lockBadge}
    </span>
  )
}

/** Bandeau de solde bas : une fois vers 20 %, une fois vers 5 %, mémorisé par période. */
export function LowBalanceBanner() {
  const t = useMessages()
  const { enabled, state, openPaywall } = useBilling()
  const [hidden, setHidden] = useState<string | null>(null)
  const c = state ? creditsOf(state, 'ai_credits') : null
  const ratio = c && c.granted > 0 ? c.available / c.granted : 1
  const level = ratio <= 0.05 ? '5' : ratio <= 0.2 ? '20' : null
  const key = c && level ? `clip_pref_lowbal_${c.period_end ?? 'p'}_${level}` : null
  useEffect(() => {
    try {
      setHidden(key && localStorage.getItem(key) ? key : null)
    } catch {
      setHidden(null)
    }
  }, [key])
  if (!enabled || !c || !level || !key || hidden === key) return null
  return (
    <div className="animate-slide-up mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[24px] bg-amber-50 p-4 dark:bg-amber-500/10">
      <Coins className="h-5 w-5 shrink-0 text-amber-600" />
      <p className="min-w-48 flex-1 text-sm font-bold text-amber-900 dark:text-amber-200">
        {t.billing.lowBalance.text(Math.round(c.available), c.period_end ? formatDate(c.period_end) : null)}
      </p>
      {/* Sur un téléphone, le bouton passe sous la phrase au lieu de l'écraser. */}
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" onClick={() => openPaywall({ feature: 'ai_credits' })}>
          {t.billing.lowBalance.more}
        </Button>
        <button
          type="button"
          aria-label={t.common.close}
          onClick={() => {
            try {
              localStorage.setItem(key, '1')
            } catch {
              /* facultatif */
            }
            setHidden(key)
          }}
          className="btn-press flex h-11 w-11 items-center justify-center rounded-xl text-amber-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/** La feuille par-dessus la tâche : pourquoi, ce que le plan conseillé donne, l'achat. */
export function Paywall({ client }: { client: BillingClient }) {
  const t = useMessages()
  const { paywall, closePaywall, state, refresh, preview } = useBilling()
  const { role, can } = useSession()
  // Qui n'achète pas peut quand même plaider : le dossier pour la direction, avec ce plan proposé.
  const reportOn = useToggle('valueReport')
  const stats = useEntitlement('adoption_stats')
  const toast = useToast()
  const plans = usePlans(client)
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('yearly')
  const [busy, setBusy] = useState(false)
  const modulesOn = useModules()
  const advisorOn = useToggle('salesAdvisor')
  if (!paywall) return null
  const feature = (paywall.feature ?? (paywall.refusal?.featureKey as FeatureKey | undefined)) || undefined
  const refusedCredits = paywall.refusal?.code === 'insufficient_credits'
  const credits = refusedCredits || feature === 'ai_credits'
  const inShell = !!nativeEnv()
  // Dans l'app, la vraie vente passe par le magasin. L'aperçu, lui, ne vend rien : « Voir CLIP avec … »
  // change l'aperçu, sans prix ni essai du web (règles des magasins).
  const storeSale = inShell && !preview
  const previewInApp = inShell && preview
  // Un module (Académie, Relevés) : son essai si le plan le reçoit, sinon le plan qui le reçoit. Un
  // module ne se vend pas dans les magasins : dans l'app, rien à acheter pour lui.
  const mod = credits ? null : moduleOf(feature)
  const shownModule = mod && modulesOn.some((m) => m.key === mod.key) ? mod : null
  const mo = shownModule && plans.data ? moduleOffer(plans.data.plans, state, shownModule, paywall.refusal?.upgradeAddon) : null
  const addon = storeSale ? null : (mo?.addon ?? null)
  const plan = plans.data ? (shownModule ? (mo?.plan ?? null) : planFor(plans.data.plans, state, credits ? 'ai_credits' : feature, paywall.refusal?.upgradePlan)) : null
  /** Ce qui s'achète : le module, sinon le plan. */
  const offer = addon ?? plan
  const mt = shownModule ? t.billing.modules[shownModule.key] : null
  const platform = devicePlatform()
  const isAdmin = role === 'admin'
  const c = creditsOf(state, 'ai_credits')
  // Une limite comptée par l'app : on dit ce que le plan permet et où l'on en est.
  const limitKey = !credits && isLimitFeature(feature) ? feature : null
  const limit = limitKey ? limitOf(state, limitKey, paywall.used) : null
  const price = offer?.prices.find((p) => p.interval === interval) ?? offer?.prices[0]
  const monthly = offer?.prices.find((p) => p.interval === 'monthly')
  const yearly = offer?.prices.find((p) => p.interval === 'yearly')
  const trialDays = addon?.trial_days ?? 0
  const saving = monthly && yearly ? Math.round(100 - (yearly.amount_cents / (monthly.amount_cents * 12)) * 100) : 0
  const w = t.billing.paywall

  const title = credits
    ? plan || !plans.data
      ? w.moreCredits
      : t.billing.aiCredits
    : limitKey
      ? t.billing.limits.title[limitKey]
      : mt
        ? mt.name
        : feature && FEATURE_LABELS[feature]
        ? featureLabel(feature)
        : w.unlockMore
  const why = credits
    ? creditsReason(c, refusedCredits)
    : paywall.refusal?.code === 'subscription_suspended'
      ? w.suspended
      : limitKey && limit
        ? limitReason(limitKey, limit.limit, paywall.used)
        : mt && shownModule
          ? addon || !plan
            ? mt.pitch
            : t.billing.modules.needsPlan(mt.name, plan.name)
          : w.notInPlan

  async function buy() {
    if (!offer || !price || price.interval === 'one_time') return
    setBusy(true)
    try {
      const back = window.location.href
      const url = await client.checkout(offer.code, price.interval, { success: back, cancel: back })
      window.location.assign(url)
    } catch (e) {
      if (e instanceof BillingError && e.status === 403) toast.error(t.billing.checkout.adminOnly, t.billing.checkout.askToUpgrade)
      else if (e instanceof BillingError && e.status === 409) {
        try {
          window.location.assign(await client.portal(window.location.href))
        } catch {
          toast.error(w.manageFromPage)
        }
      } else toast.error(t.billing.checkout.failed, t.billing.retrySoon)
      void refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={closePaywall} size="md" title={<span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[var(--primary)]" /> {title}</span>}>
      <p className="font-medium text-slate-600 dark:text-slate-300">{why}</p>
      {plans.isLoading ? (
        <div className="skeleton mt-5 h-48 rounded-[28px]" />
      ) : addon && mt && shownModule ? (
        // Un module : sa propre couleur (l'accent), ce qu'il donne, l'essai puis le prix.
        <div className="bg-gradient-accent shadow-accent relative mt-5 overflow-hidden rounded-[28px] p-6 text-white">
          <span className="grid-pattern absolute inset-0 opacity-50" />
          <div className="relative">
            <p className="label-caps flex items-center gap-1.5 opacity-80">
              {t.billing.modules.eyebrow} · {mt.name}
            </p>
            <p className="flex items-center gap-2 text-3xl font-black tracking-tighter">
              {MODULE_ICONS[shownModule.key]} {trialDays > 0 && !inShell ? t.billing.modules.trial(trialDays) : mt.name}
            </p>
            <ul className="mt-4 space-y-1.5">
              {mt.points.map((l) => (
                <li key={l} className="flex items-center gap-2 text-sm font-bold">
                  <Check className="h-4 w-4 shrink-0" /> {l}
                </li>
              ))}
            </ul>
            {price && !inShell && (
              <p className={cn('mt-4 font-black tabular-nums', trialDays > 0 ? 'text-lg' : 'text-2xl')}>
                {trialDays > 0 ? t.billing.modules.after(`${formatPrice(price.amount_cents, price.currency)} ${price.interval === 'yearly' ? t.billing.perYear : t.billing.perMonth}`) : formatPrice(price.amount_cents, price.currency)}
                {trialDays === 0 && <span className="text-sm font-bold opacity-80"> {price.interval === 'yearly' ? t.billing.perYear : t.billing.perMonth}</span>}
              </p>
            )}
          </div>
        </div>
      ) : plan ? (
        <div className="bg-gradient-primary shadow-primary relative mt-5 overflow-hidden rounded-[28px] p-6 text-white">
          <span className="grid-pattern absolute inset-0 opacity-50" />
          <div className="relative">
            <p className="label-caps opacity-80">{w.recommended}</p>
            <p className="text-3xl font-black tracking-tighter">{plan.name}</p>
            <p className="text-sm font-bold opacity-90">{PLAN_PITCH[plan.code] ?? ''}</p>
            <ul className="mt-4 space-y-1.5">
              {entitlementLines(plan).slice(0, 6).map((l) => (
                <li key={l} className="flex items-center gap-2 text-sm font-bold">
                  <Check className="h-4 w-4 shrink-0" /> {l}
                </li>
              ))}
            </ul>
            {!inShell && price && (
              <p className="mt-4 text-2xl font-black tabular-nums">
                {formatPrice(price.amount_cents, price.currency)}
                <span className="text-sm font-bold opacity-80"> {price.interval === 'yearly' ? t.billing.perYear : t.billing.perMonth}</span>
              </p>
            )}
          </div>
        </div>
      ) : shownModule && storeSale ? (
        <p className="mt-4 font-bold text-slate-500">{t.billing.managedByAdmin}</p>
      ) : credits && plans.data ? (
        <p className="mt-4 font-bold text-slate-500">{renewalText(c)}</p>
      ) : (
        <p className="mt-4 font-bold text-slate-500">{w.seePlansPage}</p>
      )}
      {offer && monthly && yearly && (!inShell || (storeSale && platform)) && (
        <div className="mt-4 flex justify-center gap-2">
          {(['monthly', 'yearly'] as const).map((iv) => (
            <button key={iv} type="button" onClick={() => setInterval(iv)} className={cn('btn-press h-10 rounded-xl px-4 text-sm font-black', interval === iv ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card')}>
              {/* Dans l'app, les prix sont ceux du magasin : l'économie ne se calcule pas sur le catalogue. */}
              {iv === 'monthly' ? t.billing.interval.monthly : !inShell && saving > 0 ? t.billing.interval.yearlySaving(saving) : t.billing.interval.yearly}
            </button>
          ))}
        </div>
      )}
      <div className="mt-6 flex flex-col gap-2">
        {addon && mt && shownModule ? (
          isAdmin ? (
            <Button variant="primary" size="lg" block loading={busy} onClick={buy}>
              {previewInApp ? t.billing.preview.seeWith(mt.name) : trialDays > 0 ? t.billing.modules.tryFree(trialDays) : t.billing.modules.add(mt.name)}
            </Button>
          ) : advisorOn ? (
            <AskAdmin primary feature={shownModule.feature} targetName={mt.name} offerId={`module:${shownModule.key}`} />
          ) : (
            <p className="rounded-2xl bg-slate-900/5 p-4 text-sm font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{t.billing.subscription.askAdmin}</p>
          )
        ) : !plan ? null : storeSale && platform ? (
          // Dans l'app : l'achat dans le magasin, s'il est permis ; sinon une phrase, sans lien ni prix.
          <StoreBuy
            client={client}
            plan={plan}
            interval={interval}
            storePurchase={plans.data?.store_purchase}
            platform={platform}
            onActive={() => {
              const retry = paywall.retry
              closePaywall()
              retry?.()
            }}
          />
        ) : storeSale ? (
          <p className="rounded-2xl bg-slate-900/5 p-4 text-sm font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{w.managedByAdmin}</p>
        ) : isAdmin ? (
          <Button variant="primary" size="lg" block loading={busy} onClick={buy}>
            {previewInApp ? t.billing.preview.seeWith(plan.name) : w.upgradeTo(plan.name)}
          </Button>
        ) : (
          <>
            {/* Qui n'achète pas le demande en un geste (conseiller d'achat) ; sinon, la phrase. */}
            {advisorOn && feature ? (
              <AskAdmin primary feature={feature} targetName={plan.name} />
            ) : (
              <p className="rounded-2xl bg-slate-900/5 p-4 text-sm font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{w.askAdmin(plan.name)}</p>
            )}
            {reportOn && can('stats') && stats !== 'locked' && (
              <Link href={`/statistiques/dossier?plan=${encodeURIComponent(plan.code)}`} onClick={closePaywall} className="btn-press glass-card flex h-12 items-center justify-center gap-2 rounded-full text-sm font-black">
                <FileText className="h-4 w-4" /> {w.valueReport}
              </Link>
            )}
          </>
        )}
        <Link href="/reglages/abonnement" onClick={closePaywall} className="btn-press flex h-12 items-center justify-center rounded-full text-sm font-black text-slate-600 dark:text-slate-300">
          {w.allPlans}
        </Link>
      </div>
    </Modal>
  )
}
