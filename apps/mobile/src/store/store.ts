/**
 * L'achat d'un abonnement dans le magasin (App Store, Google Play), par RevenueCat.
 *
 * Sur iPhone et Android, un contenu numérique se paie dans le magasin, jamais par le paiement
 * Stripe du web. RevenueCat garde l'achat ; la plateforme de facturation le relit et ouvre le plan.
 * L'acheteur, pour RevenueCat, est l'organisation (en minuscules), jamais la personne. La page web
 * ouvre l'achat par le pont, puis demande à la plateforme de relire (mobileSync).
 *
 * Module natif : il part dans une build EAS, jamais dans une mise à jour à distance seule. Il se
 * charge au premier usage, derrière storeEnabled() : sans clé (EXPO_PUBLIC_REVENUECAT_IOS_KEY,
 * EXPO_PUBLIC_REVENUECAT_ANDROID_KEY) ou dans Expo Go, il n'est jamais appelé, et la coquille
 * n'annonce pas la capacité `store`.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'
import type { PurchasesStoreProduct } from 'react-native-purchases'
import type { StoreFailure, StoreOffer } from '../bridge/protocol'

type PurchasesModule = typeof import('react-native-purchases').default
let purchasesModule: PurchasesModule | null = null
function Purchases(): PurchasesModule {
  // Chargé au premier usage (voir plus haut), d'où un require et non un import.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (!purchasesModule) purchasesModule = require('react-native-purchases').default as PurchasesModule
  return purchasesModule
}

/** La clé publique RevenueCat de la plateforme : une clé de SDK, sans secret. */
function storeApiKey(): string | null {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || null
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || null
  return null
}

/** L'achat dans le magasin est-il possible dans cette version de l'app ? (Jamais dans Expo Go.) */
export function storeEnabled(): boolean {
  return storeApiKey() !== null && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
}

let configured = false
let connectedOrg: string | null = null

/** RevenueCat connaît l'acheteur par son organisation ; `null` : la déconnexion. */
export async function connectStore(orgId: string | null): Promise<void> {
  const key = storeApiKey()
  if (!key || !storeEnabled()) return
  const org = orgId?.toLowerCase() ?? null
  if (org === connectedOrg) return
  if (org === null) {
    connectedOrg = null
    try {
      await Purchases().logOut()
    } catch {
      /* déjà anonyme */
    }
    return
  }
  if (!configured) {
    Purchases().configure({ apiKey: key, appUserID: org })
    configured = true
  } else {
    await Purchases().logIn(org)
  }
  connectedOrg = org
}

/** Prêt à acheter : la clé, et l'organisation connectée (sinon l'achat ne se rattacherait à personne). */
export function storeReady(): boolean {
  return storeEnabled() && configured && connectedOrg !== null
}

// Sur Google Play, RevenueCat nomme un abonnement « <abonnement>:<offre de base> ».
const sameProduct = (identifier: string, productId: string) => identifier === productId || identifier.split(':')[0] === productId

const offerOf = (p: PurchasesStoreProduct): Omit<StoreOffer, 'introEligible'> => ({
  priceString: p.priceString,
  price: p.price,
  currencyCode: p.currencyCode,
  perMonth: p.pricePerMonth ?? null,
  intro: p.introPrice ? { priceString: p.introPrice.priceString, price: p.introPrice.price, periodUnit: p.introPrice.periodUnit, periodNumberOfUnits: p.introPrice.periodNumberOfUnits } : null,
})

/** Les offres du magasin, par produit demandé ; un produit absent du magasin n'y est pas. */
export async function storeOffers(productIds: string[]): Promise<Record<string, StoreOffer>> {
  if (!storeEnabled() || productIds.length === 0) return {}
  const products = await Purchases().getProducts(productIds)
  let eligibility: Record<string, { status: number }> = {}
  if (Platform.OS === 'ios') {
    try {
      eligibility = await Purchases().checkTrialOrIntroductoryPriceEligibility(productIds)
    } catch {
      /* inconnu */
    }
  }
  const STATUS = Purchases().INTRO_ELIGIBILITY_STATUS
  const offers: Record<string, StoreOffer> = {}
  for (const id of productIds) {
    const product = products.find((p) => sameProduct(p.identifier, id))
    if (!product) continue
    const status = eligibility[id]?.status
    offers[id] = {
      ...offerOf(product),
      introEligible: status === STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE ? true : status === STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE ? false : null,
    }
  }
  return offers
}

/** Ce que dit une erreur du SDK : abandon et paiement en attente ne sont pas des échecs. */
export function readStoreError(e: unknown): StoreFailure | 'cancelled' | 'pending' {
  if ((e as { userCancelled?: unknown } | null)?.userCancelled === true) return 'cancelled'
  const code = (e as { code?: unknown } | null)?.code
  if (code === undefined || code === null) return 'store'
  const C = Purchases().PURCHASES_ERROR_CODE
  const is = (...names: (keyof typeof C)[]) => names.some((n) => C[n] !== undefined && C[n] === code)
  if (is('PURCHASE_CANCELLED_ERROR')) return 'cancelled'
  if (is('PAYMENT_PENDING_ERROR')) return 'pending'
  if (is('RECEIPT_ALREADY_IN_USE_ERROR', 'RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR')) return 'other_account'
  if (is('NETWORK_ERROR', 'OFFLINE_CONNECTION_ERROR')) return 'network'
  if (is('PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR')) return 'product_missing'
  if (is('PURCHASE_NOT_ALLOWED_ERROR')) return 'not_allowed'
  return 'store'
}

/** Ouvre l'achat du produit (le `store_product_id` du prix). L'abandon n'est pas une erreur. */
export async function purchaseInStore(productId: string): Promise<{ outcome: 'purchased' | 'cancelled' | 'pending' | 'failed'; failure?: StoreFailure }> {
  if (!storeReady()) return { outcome: 'failed', failure: 'not_ready' }
  try {
    const products = await Purchases().getProducts([productId])
    const product = products.find((p) => p.identifier === productId) ?? products.find((p) => sameProduct(p.identifier, productId))
    if (!product) return { outcome: 'failed', failure: 'product_missing' }
    await Purchases().purchaseStoreProduct(product)
    return { outcome: 'purchased' }
  } catch (e) {
    const read = readStoreError(e)
    if (read === 'cancelled' || read === 'pending') return { outcome: read }
    return { outcome: 'failed', failure: read }
  }
}

/** « Restaurer mes achats ». Un achat d'une autre organisation ne se transfère jamais. */
export async function restoreInStore(): Promise<{ ok: boolean; failure?: StoreFailure }> {
  if (!storeReady()) return { ok: false, failure: 'not_ready' }
  try {
    await Purchases().restorePurchases()
    return { ok: true }
  } catch (e) {
    const read = readStoreError(e)
    return { ok: false, failure: read === 'cancelled' || read === 'pending' ? 'store' : read }
  }
}
