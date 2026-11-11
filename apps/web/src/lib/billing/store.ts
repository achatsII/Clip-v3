/**
 * L'achat d'un abonnement dans le magasin (App Store, Google Play), vu de la page : l'achat s'ouvre
 * dans la coquille (capacité `store` du pont, RevenueCat), puis la plateforme relit l'achat
 * (`mobileSync`) et ouvre le plan en quelques secondes ; l'état se relit en filet. Fonctions pures
 * (la coquille et le client sont passés en paramètre) : testées sans téléphone.
 *
 * Sur iPhone et Android, on vend dans le magasin, jamais par le paiement Stripe ; et rien, dans
 * l'app, ne mène à un paiement hors du magasin.
 */
import type { StoreFailure } from '@clip/bridge'
import { messages } from '@/lib/i18n'
import { BillingError, type BillingClient, type BillingState, type StorePurchase } from './client'

export type { StoreFailure }
export type DevicePlatform = 'ios' | 'android'

/** La politique de confidentialité, et, sur iPhone, les conditions standard d'Apple. */
export const PRIVACY_URL = 'https://www.intelligenceindustrielle.com/privacy-policy'
export const APPLE_TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'

export const storeName = (platform: DevicePlatform) => (platform === 'android' ? 'Google Play' : 'App Store')

/** La page des abonnements du magasin : un abonnement pris dans le magasin s'y gère et s'y annule. */
export const storeSubscriptionsUrl = (platform: DevicePlatform) => (platform === 'android' ? 'https://play.google.com/store/account/subscriptions' : 'https://apps.apple.com/account/subscriptions')

/** Ce que la coquille sait faire pour l'achat (le pont, injecté). */
export interface StoreNative {
  purchase: (productId: string) => Promise<{ outcome: 'purchased' | 'cancelled' | 'pending' | 'failed'; failure?: StoreFailure }>
  restore: () => Promise<{ ok: boolean; failure?: StoreFailure }>
}

export class StorePurchaseError extends Error {
  constructor(readonly kind: StoreFailure) {
    super(`store_${kind}`)
    this.name = 'StorePurchaseError'
  }
}

type SyncClient = Pick<BillingClient, 'mobileSync' | 'context'>

const LIVE = new Set(['trialing', 'active', 'grace'])
const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** L'achat est appliqué quand l'état montre un abonnement vivant de ce magasin, et le plan acheté. */
export const applied = (s: BillingState, platform: DevicePlatform, planCode?: string) => LIVE.has(s.state) && s.channel === platform && (!planCode || s.plan_code === planCode)

/**
 * La relecture par la plateforme. Rappelée trop tôt (429) : elle attend son délai et reprend une
 * fois ; indisponible (503) ou sans réseau : le webhook prendra le relais. org_unresolved remonte
 * (le magasin a encaissé, l'organisation ne peut pas recevoir l'achat : c'est pour le support).
 */
async function sync(client: SyncClient, sleep: (ms: number) => Promise<void>): Promise<BillingState | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await client.mobileSync()
    } catch (e) {
      if (e instanceof BillingError && e.code === 'rate_limited' && attempt === 0) {
        await sleep(Math.min(e.retryAfterSeconds ?? 5, 10) * 1000)
        continue
      }
      if (e instanceof BillingError && e.code === 'org_unresolved') throw e
      return null
    }
  }
  return null
}

/**
 * Achète le produit du magasin, puis fait relire l'achat. Rend `active` (le plan est ouvert),
 * `pending` (payé ou en attente d'approbation : le dire, l'état se relira au retour sur l'app) ou
 * `cancelled` (abandonné : rien à dire). Lève StorePurchaseError sinon.
 */
export async function buyInStore(
  client: SyncClient,
  native: StoreNative,
  productId: string,
  opts: { platform: DevicePlatform; planCode?: string; attempts?: number; waitMs?: number; sleep?: (ms: number) => Promise<void> },
): Promise<'active' | 'pending' | 'cancelled'> {
  const sleep = opts.sleep ?? pause
  const r = await native.purchase(productId)
  if (r.outcome === 'cancelled') return 'cancelled'
  if (r.outcome === 'failed') throw new StorePurchaseError(r.failure ?? 'store')
  if (r.outcome === 'pending') return 'pending'
  const synced = await sync(client, sleep)
  if (synced && applied(synced, opts.platform, opts.planCode)) return 'active'
  for (let i = 0; i < (opts.attempts ?? 4); i++) {
    await sleep(opts.waitMs ?? 2000)
    try {
      if (applied(await client.context(), opts.platform, opts.planCode)) return 'active'
    } catch {
      // Une relecture ratée n'annule pas l'achat : la suivante, ou le retour sur l'app, le verra.
    }
  }
  return 'pending'
}

/** « Restaurer mes achats » : retrouve les achats du compte du magasin, puis les fait relire. */
export async function restoreInStore(client: SyncClient, native: StoreNative, opts: { sleep?: (ms: number) => Promise<void> } = {}): Promise<BillingState | null> {
  const r = await native.restore()
  if (!r.ok) throw new StorePurchaseError(r.failure ?? 'store')
  return sync(client, opts.sleep ?? pause)
}

/** Ce qui empêche un achat, dans les mots de l'app (jamais le message du magasin). */
export function storeFailureText(kind: StoreFailure, platform: DevicePlatform): string {
  const store = storeName(platform)
  const t = messages().billing.store.failure
  switch (kind) {
    case 'not_ready':
      return t.notReady
    case 'product_missing':
      return t.productMissing(store)
    case 'other_account':
      return t.otherAccount(store)
    case 'network':
      return t.network
    case 'not_allowed':
      return t.notAllowed
    default:
      return t.other(store)
  }
}

/**
 * Pourquoi l'achat n'est pas offert ici, en une phrase, sans lien ni prix d'un paiement hors du
 * magasin. `null` : l'achat est permis.
 */
export function storePurchaseText(sp: StorePurchase | undefined, platform: DevicePlatform): string | null {
  const t = messages().billing
  if (!sp) return t.managedByAdmin
  if (sp.allowed) return null
  switch (sp.reason) {
    case 'team_organization':
      return t.store.blocked.team
    case 'managed_elsewhere':
      return sp.managed_in && sp.managed_in !== 'web' && sp.managed_in !== platform
        ? t.store.blocked.elsewhere(storeName(sp.managed_in))
        : t.store.blocked.elsewhereUnknown
    case 'org_unresolved':
      return t.store.blocked.unresolved
    default:
      return t.managedByAdmin
  }
}

/** Les mentions que les magasins exigent avant l'achat. */
export function storeDisclosure(o: { planName: string; price: string; interval: 'monthly' | 'yearly'; platform: DevicePlatform }): string {
  return messages().billing.store.disclosure(o.planName, o.price, o.interval === 'yearly', storeName(o.platform))
}
