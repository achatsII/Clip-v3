'use client'

import { ArrowLeft, Check, Coins, ExternalLink, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useState } from 'react'
import { billingClient } from '@/components/billing/BillingRoot'
import { entitlementLines, formatPrice, usePlans } from '@/components/billing/Billing'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Field'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { PageHeader, Panel } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { nativeEnv } from '@/lib/bridge/native'
import { FEATURED_PLAN, PLAN_PITCH } from '@/lib/billing/catalog'
import { BillingError, creditsOf } from '@/lib/billing/client'
import { useBilling } from '@/lib/billing/state'
import { BILLING_V2 } from '@/lib/config'
import { cn, formatDate } from '@/lib/util/cn'

const STATE_LABEL: Record<string, string> = {
  none: 'Aucun abonnement',
  trialing: 'Essai en cours',
  active: 'Actif',
  grace: 'Paiement en retard — vos fonctions restent ouvertes',
  suspended: 'Suspendu — réglez la facture',
  canceled: 'Annulé',
  expired: 'Expiré',
}

export default function SubscriptionPage() {
  if (!BILLING_V2) notFound()
  return <Subscription />
}

function Subscription() {
  const { role } = useSession()
  const toast = useToast()
  const { state, loading, refresh } = useBilling()
  const plans = usePlans(billingClient)
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('yearly')
  const [busy, setBusy] = useState<string | null>(null)
  const inShell = !!nativeEnv()
  const isAdmin = role === 'admin'
  const c = creditsOf(state, 'ai_credits')

  async function buy(code: string) {
    setBusy(code)
    try {
      const back = `${window.location.origin}/reglages/abonnement`
      window.location.assign(await billingClient.checkout(code, interval, { success: `${back}?merci=1`, cancel: back }))
    } catch (e) {
      if (e instanceof BillingError && e.code === 'checkout_refused') await manage()
      else if (e instanceof BillingError && e.status === 403) toast.error(e.reason === 'plan_not_on_sale' ? 'Ce plan ne s’achète pas encore' : 'Seul l’administrateur peut acheter')
      else toast.error('Le paiement ne s’est pas ouvert', 'Réessayez dans un instant.')
    } finally {
      setBusy(null)
    }
  }

  async function manage() {
    try {
      window.location.assign(await billingClient.portal(`${window.location.origin}/reglages/abonnement`))
    } catch (e) {
      if (e instanceof BillingError && e.status === 409 && e.manageUrl) window.location.assign(e.manageUrl)
      else if (e instanceof BillingError && e.status === 404) toast.info('Aucun paiement encore', 'Choisissez un plan pour commencer.')
      else toast.error('Le portail ne s’est pas ouvert')
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/reglages" className="inline-flex items-center gap-1 text-sm font-black text-slate-500">
        <ArrowLeft className="h-4 w-4" /> Réglages
      </Link>
      <PageHeader title="Abonnement" subtitle="Les opérateurs ne sont jamais comptés : vous payez la création, les postes et l’IA." />

      {loading ? (
        <Skeleton className="h-40" />
      ) : state ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <p className="label-caps text-slate-500">Plan actuel</p>
            <p className="text-3xl font-black tracking-tighter">{plans.data?.plans.find((p) => p.code === state.plan_code)?.name ?? state.plan_code ?? 'Gratuit'}</p>
            <p className={cn('mt-1 text-sm font-black', state.state === 'grace' || state.state === 'suspended' ? 'text-amber-600' : 'text-slate-500')}>
              {STATE_LABEL[state.state] ?? state.state}
              {state.cancel_at_period_end && state.current_period_end ? ` · se termine le ${formatDate(state.current_period_end)}` : ''}
            </p>
            {!inShell && isAdmin && state.channel === 'web' && (
              <Button className="mt-4" icon={<ExternalLink className="h-4 w-4" />} onClick={manage}>
                Gérer l’abonnement et les factures
              </Button>
            )}
          </Panel>
          {c && (
            <Panel>
              <p className="label-caps flex items-center gap-1.5 text-slate-500">
                <Coins className="h-3.5 w-3.5" /> Crédits IA
              </p>
              <p className="text-3xl font-black tracking-tighter tabular-nums">
                {Math.round(c.available).toLocaleString('fr-CA')} <span className="text-lg text-slate-400">/ {c.granted.toLocaleString('fr-CA')}</span>
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                <div className="bg-gradient-primary h-full rounded-full" style={{ width: `${Math.min(100, (c.available / Math.max(1, c.granted)) * 100)}%` }} />
              </div>
              {c.period_end && <p className="mt-2 text-sm font-bold text-slate-500">Renouvellement le {formatDate(c.period_end)}.</p>}
            </Panel>
          )}
        </div>
      ) : (
        <ErrorState title="L’état de l’abonnement n’a pas pu être lu" onRetry={() => void refresh()} />
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black tracking-tight">Les plans</h2>
          {!inShell && <Segmented value={interval} onChange={setInterval} options={[{ value: 'monthly', label: 'Mensuel' }, { value: 'yearly', label: 'Annuel · 2 mois offerts' }]} />}
        </div>
        {plans.isLoading ? (
          <div className="grid gap-5 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-96 rounded-[32px]" />
            ))}
          </div>
        ) : plans.error ? (
          <ErrorState error={plans.error} onRetry={() => plans.refetch()} />
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {(plans.data?.plans ?? [])
              .filter((p) => p.kind === 'base')
              .map((p) => {
                const price = p.prices.find((x) => x.interval === interval) ?? p.prices[0]
                const current = p.is_current || p.code === state?.plan_code
                const highlight = p.code === FEATURED_PLAN
                return (
                  <div key={p.code} className={cn('relative flex flex-col overflow-hidden rounded-[32px] p-6', highlight ? 'bg-gradient-primary shadow-primary text-white' : 'glass-panel')}>
                    {highlight && <span className="grid-pattern absolute inset-0 opacity-40" />}
                    <div className="relative flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-black tracking-tight">{p.name}</p>
                        {current && <span className={cn('rounded-xl px-2.5 py-1 text-[10px] font-black tracking-widest uppercase', highlight ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700')}>Actuel</span>}
                      </div>
                      <p className={cn('mt-1 text-sm font-bold', highlight ? 'text-white/85' : 'text-slate-500')}>{PLAN_PITCH[p.code] ?? ''}</p>
                      {!inShell && (
                        <p className="mt-4 text-4xl font-black tracking-tighter tabular-nums">
                          {price ? formatPrice(price.amount_cents, price.currency) : 'Gratuit'}
                          {price && <span className={cn('text-base font-bold', highlight ? 'text-white/80' : 'text-slate-400')}> / {price.interval === 'yearly' ? 'an' : 'mois'}</span>}
                        </p>
                      )}
                      {price?.tax_behavior === 'exclusive' && <p className={cn('text-xs font-bold', highlight ? 'text-white/70' : 'text-slate-400')}>avant taxes</p>}
                      <ul className="mt-5 space-y-2">
                        {entitlementLines(p).map((l) => (
                          <li key={l} className="flex items-start gap-2 text-sm font-bold">
                            <Check className={cn('mt-0.5 h-4 w-4 shrink-0', highlight ? 'text-white' : 'text-emerald-500')} /> {l}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {!inShell && price && !current && (
                      <div className="relative mt-6">
                        {isAdmin ? (
                          <Button variant={highlight ? 'dark' : 'primary'} block size="lg" loading={busy === p.code} icon={<Sparkles className="h-4 w-4" />} onClick={() => buy(p.code)}>
                            Choisir {p.name}
                          </Button>
                        ) : (
                          <p className={cn('rounded-2xl p-3 text-center text-sm font-bold', highlight ? 'bg-white/15' : 'bg-slate-900/5')}>Demandez à l’administrateur</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}
        {inShell && <p className="mt-4 text-sm font-bold text-slate-500">Votre plan se gère par l’administrateur de votre usine.</p>}
      </section>
      <p className="text-sm font-medium text-slate-500">Besoin de plusieurs usines, de l’authentification unique ou d’un contrat ? Écrivez-nous : un plan Entreprise se prépare sur mesure.</p>
    </div>
  )
}
