'use client'

import { useQuery } from '@tanstack/react-query'
import { ExternalLink, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { callNative, hasCapability, nativeEnv } from '@/lib/bridge/native'
import { BillingError, type BillingClient, type BillingState, type PublicPlan, type StorePurchase } from '@/lib/billing/client'
import { useBilling } from '@/lib/billing/state'
import { APPLE_TERMS_URL, buyInStore, PRIVACY_URL, restoreInStore, storeDisclosure, storeFailureText, storeName, storePurchaseText, StorePurchaseError, storeSubscriptionsUrl, type DevicePlatform, type StoreNative } from '@/lib/billing/store'
import { useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'

/** La plateforme de l'appareil, dans la coquille ; `null` sur le web. */
export function devicePlatform(): DevicePlatform | null {
  const env = nativeEnv()
  return env ? (env.platform === 'android' ? 'android' : 'ios') : null
}

/** La coquille peut-elle vendre ici ? (Capacités `store.*` : clé RevenueCat, hors Expo Go, toggle allumé.) */
export const canBuyInStore = () => hasCapability('store.purchase')

const native: StoreNative = {
  purchase: (productId) => callNative('store.purchase', { productId }),
  restore: () => callNative('store.restore', {}),
}

/** Ouvre un lien hors de l'app (dans la coquille, par le navigateur du système). */
function openLink(url: string) {
  if (hasCapability('openExternal')) void callNative('openExternal', { url }).catch(() => undefined)
  else window.open(url, '_blank', 'noopener')
}

/** Les prix du magasin pour ces produits (dans la devise du compte du magasin). */
export function useStoreOffers(productIds: string[], when = true) {
  const ids = productIds.filter(Boolean)
  return useQuery({
    queryKey: ['store-offers', ...ids],
    queryFn: async () => (await callNative('store.offers', { productIds: ids })).offers,
    enabled: when && canBuyInStore() && ids.length > 0,
    staleTime: 10 * 60_000,
  })
}

/** Les liens que les magasins exigent avant l'achat. */
function StoreLegal({ platform, className }: { platform: DevicePlatform; className?: string }) {
  const t = useMessages()
  return (
    <p className={cn('text-xs font-bold', className)}>
      <button type="button" onClick={() => openLink(PRIVACY_URL)} className="underline underline-offset-2">
        {t.billing.store.privacy}
      </button>
      {platform === 'ios' && (
        <>
          {' · '}
          <button type="button" onClick={() => openLink(APPLE_TERMS_URL)} className="underline underline-offset-2">
            {t.billing.store.appleTerms}
          </button>
        </>
      )}
    </p>
  )
}

/**
 * Le prix du magasin et l'achat d'un plan dans l'app, avec les mentions exigées. L'achat n'existe
 * que si la plateforme le permet (`store_purchase.allowed`) ; sinon une phrase, sans lien ni prix
 * d'un paiement hors du magasin. Sans produit dans le magasin : le plan « arrive ».
 */
export function StoreBuy({ client, plan, interval, storePurchase, platform, onActive, tone = 'light' }: { client: BillingClient; plan: PublicPlan; interval: 'monthly' | 'yearly'; storePurchase: StorePurchase | undefined; platform: DevicePlatform; onActive?: () => void; tone?: 'light' | 'onColor' }) {
  const t = useMessages()
  const w = t.billing.store
  const { refresh } = useBilling()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const price = plan.prices.find((p) => p.interval === interval) ?? plan.prices[0]
  const productId = price?.store_product_id ?? ''
  const blocked = canBuyInStore() ? storePurchaseText(storePurchase, platform) : w.comingSoon
  // Les prix ne se demandent au magasin que si l'achat est permis.
  const offers = useStoreOffers([productId], !blocked)
  const offer = offers.data?.[productId]
  const muted = tone === 'onColor' ? 'text-white/85' : 'text-slate-500'
  if (blocked) return <p className={cn('rounded-2xl p-3 text-sm font-bold', tone === 'onColor' ? 'bg-white/15' : 'bg-slate-900/5 text-slate-600 dark:bg-white/10 dark:text-slate-300')}>{blocked}</p>
  if (offers.isLoading) return <Skeleton className="h-24 rounded-2xl" />
  if (!offer) return <p className={cn('text-sm font-bold', muted)}>{w.planComingSoon(storeName(platform))}</p>

  async function buy() {
    setBusy(true)
    try {
      const r = await buyInStore(client, native, productId, { platform, planCode: plan.code })
      if (r === 'active') {
        await refresh()
        toast.success(w.welcome(plan.name), w.planOpen)
        onActive?.()
      } else if (r === 'pending') toast.info(w.pending, w.pendingBody(storeName(platform)))
    } catch (e) {
      if (e instanceof StorePurchaseError) toast.error(w.failed, storeFailureText(e.kind, platform))
      else if (e instanceof BillingError && e.code === 'org_unresolved') toast.error(w.unresolved, w.unresolvedBody)
      else toast.error(w.failed, t.billing.retrySoon)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-2xl font-black tabular-nums">
        {offer.priceString}
        <span className={cn('text-sm font-bold', muted)}> {interval === 'yearly' ? t.billing.perYear : t.billing.perMonth}</span>
      </p>
      {offer.intro && offer.introEligible !== false && (
        <p className={cn('text-sm font-black', tone === 'onColor' ? 'text-white' : 'text-emerald-700 dark:text-emerald-300')}>
          {w.intro(offer.intro.priceString, offer.intro.periodNumberOfUnits, offer.intro.periodUnit)}
        </p>
      )}
      <Button variant={tone === 'onColor' ? 'dark' : 'primary'} size="lg" block loading={busy} onClick={buy}>
        {w.subscribeTo(plan.name)}
      </Button>
      <p className={cn('text-xs font-medium', muted)}>{storeDisclosure({ planName: plan.name, price: offer.priceString, interval, platform })}</p>
      <StoreLegal platform={platform} className={muted} />
    </div>
  )
}

/**
 * Restaurer les achats, et gérer l'abonnement là où il a été pris : dans ce magasin, sa page des
 * abonnements ; ailleurs, une phrase, sans lien ni prix.
 */
export function StoreAccount({ client, state, platform }: { client: BillingClient; state: BillingState; platform: DevicePlatform }) {
  const t = useMessages()
  const w = t.billing.store
  const { refresh } = useBilling()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  if (!canBuyInStore()) return null
  const paidElsewhere = state.channel === 'web' || ((state.channel === 'ios' || state.channel === 'android') && state.channel !== platform)
  return (
    <div className="mt-4 flex flex-col gap-2">
      {state.channel === platform && (
        <Button icon={<ExternalLink className="h-4 w-4" />} onClick={() => openLink(storeSubscriptionsUrl(platform))}>
          {w.manageIn(storeName(platform))}
        </Button>
      )}
      {paidElsewhere && state.plan_code && (
        <p className="text-sm font-bold text-slate-500">
          {state.channel === 'web' ? w.managedWhereBought : w.managedIn(storeName(state.channel as DevicePlatform))}
        </p>
      )}
      <Button
        variant="ghost"
        icon={<RotateCcw className="h-4 w-4" />}
        loading={busy}
        onClick={async () => {
          setBusy(true)
          try {
            const fresh = await restoreInStore(client, native)
            await refresh()
            if (fresh && fresh.channel === platform && fresh.plan_code) toast.success(w.restored, w.planOpen)
            else toast.info(w.nothingToRestore, w.nothingToRestoreBody(storeName(platform)))
          } catch (e) {
            toast.error(w.restoreFailed, e instanceof StorePurchaseError ? storeFailureText(e.kind, platform) : t.billing.retrySoon)
          } finally {
            setBusy(false)
          }
        }}
      >
        {w.restore}
      </Button>
    </div>
  )
}
