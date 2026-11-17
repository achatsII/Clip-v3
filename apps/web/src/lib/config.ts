/**
 * Configuration publique de l'app web. Aucune de ces valeurs n'est un secret.
 */
import { PRODUCT } from './brand/product'

/** Adresse de la Gateway Octopus (QA par défaut ; la production est le même hôte sans `qa.`). */
export const GATEWAY_URL = (process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://qa.gateway.intelligenceindustrielle.com').replace(/\/$/, '')

/**
 * Identifiant de l'application à la Gateway : `clip-v2`, l'application de Clip. Avant, Clip se
 * connectait par l'application partagée `html` ; `NEXT_PUBLIC_APP_IDENTIFIER=html` y ramène
 * (voir docs/architecture.md, §2).
 */
export const DEFAULT_APP_IDENTIFIER = 'clip-v2'
export const APP_IDENTIFIER = process.env.NEXT_PUBLIC_APP_IDENTIFIER || DEFAULT_APP_IDENTIFIER

/**
 * Le slug que portent les documents écrits sous `html` (et qu'on y filtre), et la clé de la branche
 * de Clip dans le workflow n8n Job_start. Il ne change pas avec l'identifiant de connexion.
 */
export const APP_DATA_IDENTIFIER = 'clip-v3'

/** Vrai seulement si l'app partage `html` : chaque document porte alors le slug, chaque lecture filtre dessus. */
export const SHARED_APP = APP_IDENTIFIER === 'html'

/** L'inscription libre n'existe que sur une application déclarée « self-service » à la Gateway. */
export const SELF_SERVICE = process.env.NEXT_PUBLIC_SELF_SERVICE === '1'

/** Facturation v2 (plans, crédits, paywall). Éteinte tant que `/api/v2/billing/*` répond 404. */
export const BILLING_V2 = process.env.NEXT_PUBLIC_BILLING_V2 === '1'

/**
 * Le taux de l'IA facturée : combien de crédits pour un dollar canadien de coût réel (le taux
 * standard de la plateforme, celui d'askAi). Il ne s'affiche jamais : l'écran parle en crédits.
 */
export const AI_CREDITS_PER_CAD = 1000

/** Slug du produit pour la facturation (`X-Product`) : l'identifiant à enregistrer. */
export const PRODUCT_SLUG = 'clip-v3'

/** Le nom du produit, celui de la marque de cette build (`src/lib/brand/product.ts`). */
export const APP_NAME = PRODUCT.name
