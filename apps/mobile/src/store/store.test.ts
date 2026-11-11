import Purchases, { purchasesError, storeProduct, PURCHASES_ERROR_CODE } from '../../__mocks__/react-native-purchases'
import { capabilitiesFor } from '../config/capabilities'
import { validators } from '../bridge/validate'
import { routeBridgeMessage } from '../bridge/router'
import { BRIDGE_VERSION } from '../bridge/protocol'
import type { PublicConfig } from '../bridge/protocol'

const env = { executionEnvironment: 'standalone' }
jest.mock('expo-constants', () => ({
  __esModule: true,
  get default() {
    return env
  },
  ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone', Bare: 'bare' },
}))

/** Un module frais à chaque test : sa connexion à RevenueCat ne déborde pas sur le suivant. */
function fresh(): typeof import('./store') {
  let mod!: typeof import('./store')
  jest.isolateModules(() => {
    mod = require('./store')
  })
  return mod
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_cle_publique'
  env.executionEnvironment = 'standalone'
})

describe('l’achat dans le magasin, côté coquille', () => {
  it('sans clé RevenueCat, ou dans Expo Go, rien ne se branche', async () => {
    delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    const s = fresh()
    expect(s.storeEnabled()).toBe(false)
    await s.connectStore('ORG-1')
    expect(Purchases.configure).not.toHaveBeenCalled()
    expect(await s.purchaseInStore('clip_v3_solo_monthly_v1')).toEqual({ outcome: 'failed', failure: 'not_ready' })
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = 'appl_cle_publique'
    env.executionEnvironment = 'storeClient'
    expect(fresh().storeEnabled()).toBe(false)
  })

  it('l’acheteur est l’organisation, en minuscules ; une autre organisation, puis la déconnexion', async () => {
    const s = fresh()
    await s.connectStore('ORG-1')
    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: 'appl_cle_publique', appUserID: 'org-1' })
    await s.connectStore('org-1')
    expect(Purchases.logIn).not.toHaveBeenCalled()
    await s.connectStore('ORG-2')
    expect(Purchases.logIn).toHaveBeenCalledWith('org-2')
    expect(s.storeReady()).toBe(true)
    await s.connectStore(null)
    expect(Purchases.logOut).toHaveBeenCalled()
    expect(s.storeReady()).toBe(false)
  })

  it('un achat qui réussit, abandonné, en attente, ou qui revient à une autre organisation', async () => {
    const s = fresh()
    await s.connectStore('org-1')
    Purchases.getProducts.mockResolvedValue([storeProduct('clip_v3_solo_monthly_v1')])
    expect(await s.purchaseInStore('clip_v3_solo_monthly_v1')).toEqual({ outcome: 'purchased' })
    expect(Purchases.purchaseStoreProduct).toHaveBeenCalledWith(expect.objectContaining({ identifier: 'clip_v3_solo_monthly_v1' }))
    Purchases.purchaseStoreProduct.mockRejectedValueOnce(purchasesError(PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR))
    expect(await s.purchaseInStore('clip_v3_solo_monthly_v1')).toEqual({ outcome: 'cancelled' })
    Purchases.purchaseStoreProduct.mockRejectedValueOnce(purchasesError(PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR))
    expect(await s.purchaseInStore('clip_v3_solo_monthly_v1')).toEqual({ outcome: 'pending' })
    Purchases.purchaseStoreProduct.mockRejectedValueOnce(purchasesError(PURCHASES_ERROR_CODE.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR))
    expect(await s.purchaseInStore('clip_v3_solo_monthly_v1')).toEqual({ outcome: 'failed', failure: 'other_account' })
    Purchases.purchaseStoreProduct.mockRejectedValueOnce(purchasesError(PURCHASES_ERROR_CODE.NETWORK_ERROR))
    expect(await s.purchaseInStore('clip_v3_solo_monthly_v1')).toEqual({ outcome: 'failed', failure: 'network' })
  })

  it('un produit pas encore créé dans le magasin se dit, sans ouvrir d’achat', async () => {
    const s = fresh()
    await s.connectStore('org-1')
    Purchases.getProducts.mockResolvedValue([])
    expect(await s.purchaseInStore('clip_v3_usine_yearly_v1')).toEqual({ outcome: 'failed', failure: 'product_missing' })
    expect(Purchases.purchaseStoreProduct).not.toHaveBeenCalled()
  })

  it('les prix viennent du magasin ; sur Google Play, « produit:offre de base » est le même produit', async () => {
    const s = fresh()
    Purchases.getProducts.mockResolvedValue([storeProduct('clip_v3_equipe_monthly_v1:monthly', { priceString: '299,00 $', price: 299, pricePerMonth: 299 })])
    const offers = await s.storeOffers(['clip_v3_equipe_monthly_v1', 'clip_v3_equipe_yearly_v1'])
    expect(Object.keys(offers)).toEqual(['clip_v3_equipe_monthly_v1'])
    expect(offers.clip_v3_equipe_monthly_v1).toMatchObject({ priceString: '299,00 $', price: 299, currencyCode: 'CAD', perMonth: 299 })
  })

  it('restaurer : retrouve les achats, ou dit qu’ils appartiennent à une autre organisation', async () => {
    const s = fresh()
    expect(await s.restoreInStore()).toEqual({ ok: false, failure: 'not_ready' })
    await s.connectStore('org-1')
    expect(await s.restoreInStore()).toEqual({ ok: true })
    Purchases.restorePurchases.mockRejectedValueOnce(purchasesError(PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR))
    expect(await s.restoreInStore()).toEqual({ ok: false, failure: 'other_account' })
  })
})

describe('les capacités du magasin annoncées à la page', () => {
  const config = (storePurchases?: boolean): PublicConfig => ({ configVersion: 1, forceUpdate: {}, toggles: storePurchases === undefined ? {} : { storePurchases }, realtime: false })
  it('seulement si l’app peut acheter et que le serveur l’allume ; jamais sans serveur', () => {
    expect(capabilitiesFor(config(true), { store: true })).toEqual(expect.arrayContaining(['store.connect', 'store.offers', 'store.purchase', 'store.restore']))
    expect(capabilitiesFor(config(true), { store: false })).not.toContain('store.purchase')
    expect(capabilitiesFor(config(false), { store: true })).not.toContain('store.purchase')
    expect(capabilitiesFor(config(), { store: true })).not.toContain('store.purchase')
    expect(capabilitiesFor(null, { store: true })).not.toContain('store.purchase')
  })

  it('les requêtes du magasin sont validées', () => {
    expect(validators['store.purchase']({ productId: 'clip_v3_solo_monthly_v1' })).toEqual({ ok: true, value: { productId: 'clip_v3_solo_monthly_v1' } })
    expect(validators['store.purchase']({ productId: 'https://evil' }).ok).toBe(false)
    expect(validators['store.connect']({ orgId: 'ORG-1' })).toEqual({ ok: true, value: { orgId: 'org-1' } })
    expect(validators['store.connect']({ orgId: null })).toEqual({ ok: true, value: { orgId: null } })
    expect(validators['store.offers']({ productIds: Array.from({ length: 21 }, (_, i) => `p${i}`) }).ok).toBe(false)
  })
})

describe('une requête du magasin, par le vrai routeur de la coquille', () => {
  const message = JSON.stringify({ v: BRIDGE_VERSION, id: 'r1', type: 'store.purchase', payload: { productId: 'clip_v3_solo_monthly_v1' } })
  const purchase = jest.fn(async () => ({ outcome: 'purchased' as const }))

  it('atteint son module quand les capacités du magasin sont annoncées', async () => {
    const res = await routeBridgeMessage(message, { capabilities: () => capabilitiesFor({ configVersion: 1, forceUpdate: {}, toggles: { storePurchases: true }, realtime: false }, { store: true }), handlers: { 'store.purchase': purchase } })
    expect(res).toMatchObject({ id: 'r1', ok: true, result: { outcome: 'purchased' } })
    expect(purchase).toHaveBeenCalledWith({ productId: 'clip_v3_solo_monthly_v1' })
  })

  it('est refusée (unsupported) quand elles ne le sont pas', async () => {
    purchase.mockClear()
    const res = await routeBridgeMessage(message, { capabilities: () => capabilitiesFor(null, { store: true }), handlers: { 'store.purchase': purchase } })
    expect(res).toMatchObject({ ok: false, error: { code: 'unsupported' } })
    expect(purchase).not.toHaveBeenCalled()
  })
})

