/**
 * Une marque par entreprise (décision du 2026-11-18). CLIP et Kiplo passent par la même application de la
 * plateforme (`clip-v2`) : sans cette règle, un client de CLIP qui installe Kiplo s'y connecterait et verrait les
 * prix du libre-service. Chaque entreprise appartient donc à une marque, et l'autre marque l'y renvoie.
 *
 * - Une entreprise ouverte d'abord dans CLIP est CLIP (l'équipe installe ses clients dans CLIP).
 * - Une entreprise est Kiplo seulement si elle vient d'être créée par l'inscription libre de Kiplo : un client de
 *   CLIP qui ouvrirait Kiplo avant CLIP n'y est pas enfermé.
 * - Les entreprises d'avant n'ont pas de marque : elles restent ouvertes partout.
 */
import { PRODUCT, PRODUCTS, type BrandId, type Product } from './product'

const SIGNUP_KEY = 'clip_signup_brand'

/** À l'inscription libre : l'entreprise qui va se créer appartient à la marque où l'on s'inscrit. */
export function rememberSignup(p: Product = PRODUCT): void {
  try {
    sessionStorage.setItem(SIGNUP_KEY, p.id)
  } catch {
    // Stockage refusé (navigation privée) : l'entreprise restera ouverte partout.
  }
}

/**
 * La marque d'une entreprise dont les réglages se créent (sa première ouverture) : CLIP dans CLIP ; la marque publique
 * seulement juste après son inscription libre (lue une seule fois) ; sinon aucune.
 */
export function brandForNewOrg(p: Product = PRODUCT): BrandId | undefined {
  if (p.id === 'clip') return 'clip'
  try {
    const signedUp = sessionStorage.getItem(SIGNUP_KEY)
    sessionStorage.removeItem(SIGNUP_KEY)
    return signedUp === p.id ? p.id : undefined
  } catch {
    return undefined
  }
}

/** La marque où l'entreprise travaille, quand ce n'est pas celle de cette build ; `null` : on est au bon endroit. */
export function otherBrandOf(org: { brand?: BrandId } | null | undefined, p: Product = PRODUCT): Product | null {
  const brand = org?.brand
  return brand && brand !== p.id ? (PRODUCTS[brand] ?? null) : null
}
