/**
 * Configuration publique de l'app web. Aucune de ces valeurs n'est un secret.
 */

/** Adresse de la Gateway Octopus (QA par défaut ; la production est le même hôte sans `qa.`). */
export const GATEWAY_URL = (process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://qa.gateway.intelligenceindustrielle.com').replace(/\/$/, '')

/**
 * Identifiant de l'application à la Gateway. CLIP V3 n'est pas encore enregistrée : elle se
 * connecte avec l'application partagée `html` (voir docs/architecture.md, §2).
 */
export const APP_IDENTIFIER = process.env.NEXT_PUBLIC_APP_IDENTIFIER || 'html'

/** Slug qui cloisonne les données de CLIP V3 tant qu'elle partage l'application `html`. */
export const APP_DATA_IDENTIFIER = 'clip-v3'

/** Vrai tant que l'app partage `html` : chaque document porte le slug, chaque lecture filtre dessus. */
export const SHARED_APP = APP_IDENTIFIER === 'html'

/** L'inscription libre n'existe que sur une application déclarée « self-service » à la Gateway. */
export const SELF_SERVICE = process.env.NEXT_PUBLIC_SELF_SERVICE === '1'

/** Facturation v2 (plans, crédits, paywall). Éteinte tant que `/api/v2/billing/*` répond 404. */
export const BILLING_V2 = process.env.NEXT_PUBLIC_BILLING_V2 === '1'

/** Slug du produit pour la facturation (`X-Product`) : l'identifiant à enregistrer. */
export const PRODUCT_SLUG = 'clip-v3'

export const APP_NAME = 'CLIP'
