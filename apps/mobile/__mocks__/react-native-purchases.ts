// Le SDK de RevenueCat dans les tests : aucun appel natif. Gabarit du
// skill billing, posé dans __mocks__/ à côté de node_modules : Jest le prend alors
// à la place du vrai module, sans jest.mock.
//
// Chaque fonction est un jest.fn qu'un test programme (mockResolvedValueOnce,
// mockRejectedValueOnce). Par défaut : aucun produit dans le magasin, un achat qui réussit,
// une restauration sans achat, une éligibilité à l'essai inconnue. Les codes d'erreur sont
// ceux du SDK (react-native-purchases 10) ; purchasesError en fabrique une comme le SDK la lève.
const PURCHASES_ERROR_CODE = {
  UNKNOWN_ERROR: '0',
  PURCHASE_CANCELLED_ERROR: '1',
  STORE_PROBLEM_ERROR: '2',
  PURCHASE_NOT_ALLOWED_ERROR: '3',
  PURCHASE_INVALID_ERROR: '4',
  PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR: '5',
  PRODUCT_ALREADY_PURCHASED_ERROR: '6',
  RECEIPT_ALREADY_IN_USE_ERROR: '7',
  NETWORK_ERROR: '10',
  RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR: '13',
  OPERATION_ALREADY_IN_PROGRESS_ERROR: '15',
  PAYMENT_PENDING_ERROR: '20',
  CONFIGURATION_ERROR: '23',
  OFFLINE_CONNECTION_ERROR: '35',
} as const;

const INTRO_ELIGIBILITY_STATUS = {
  INTRO_ELIGIBILITY_STATUS_UNKNOWN: 0,
  INTRO_ELIGIBILITY_STATUS_INELIGIBLE: 1,
  INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2,
  INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS: 3,
} as const;

/** Une erreur du SDK, telle que RevenueCat la lève : un code, un message. */
export function purchasesError(code: (typeof PURCHASES_ERROR_CODE)[keyof typeof PURCHASES_ERROR_CODE], message = 'erreur du magasin simulée') {
  return Object.assign(new Error(message), {
    code,
    userCancelled: code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
    readableErrorCode: code,
    userInfo: { readableErrorCode: code },
    underlyingErrorMessage: '',
  });
}

/** Un produit du magasin, avec ce que lit achat-magasin.ts (prix, devise, prix par mois, offre). */
export function storeProduct(identifier: string, over: Record<string, unknown> = {}) {
  return {
    identifier,
    title: identifier,
    description: '',
    priceString: '4,99 $',
    price: 4.99,
    currencyCode: 'CAD',
    pricePerMonth: 4.99,
    introPrice: null,
    ...over,
  };
}

type FakeProduct = ReturnType<typeof storeProduct>;

const Purchases = {
  PURCHASES_ERROR_CODE,
  INTRO_ELIGIBILITY_STATUS,
  configure: jest.fn((_config: { apiKey: string; appUserID?: string | null }) => undefined),
  logIn: jest.fn(async (_appUserID: string) => ({ customerInfo: {}, created: false })),
  logOut: jest.fn(async () => ({})),
  getProducts: jest.fn(async (_ids: string[]): Promise<FakeProduct[]> => []),
  purchaseStoreProduct: jest.fn(async (product: { identifier: string }) => ({ customerInfo: {}, productIdentifier: product.identifier })),
  restorePurchases: jest.fn(async () => ({})),
  checkTrialOrIntroductoryPriceEligibility: jest.fn(async (_ids: string[]): Promise<Record<string, { status: number }>> => ({})),
};

export { PURCHASES_ERROR_CODE, INTRO_ELIGIBILITY_STATUS };
export default Purchases;
