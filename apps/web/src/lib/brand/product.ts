/**
 * Deux marques, un seul produit (décision du 2026-11-17).
 *
 * - **CLIP** : la version des clients d'Intelligence Industrielle, vendue par son équipe. Aucun prix du
 *   libre-service ne s'y montre (tout y est « sur devis ») : la version publique coûte bien moins cher
 *   et ne doit pas faire concurrence aux contrats en cours.
 * - **Kiplo** (nom choisi le 2026-11-17, à la place de Gesto) : la version publique, en libre-service (site,
 *   App Store), qui ne nomme jamais Intelligence Industrielle dans ses textes. « Filmez le geste. L'IA écrit l'instruction. »
 *
 * La build choisit la marque (`NEXT_PUBLIC_BRAND=kiplo` ; l'ancien `gesto` vaut encore Kiplo) ; sans valeur, CLIP. Le code, les données et la
 * Gateway sont les mêmes : seuls changent le nom, le logo, ce qui se vend en ligne et ce qui se montre.
 * Le nom se change ici (un seul endroit) : les textes gardent le jeton `CLIP` (`Clip` sur le site), que
 * `brandify` remplace une fois par dictionnaire chargé.
 *
 * Aucun import de valeur ici : le script des icônes (`scripts/brand-icons.mjs`) lit ce fichier tel quel.
 */
import type { MarkId } from './marks'

export type BrandId = 'clip' | 'kiplo'

export interface Product {
  id: BrandId
  /** Le nom, tel qu'il s'écrit dans une phrase. */
  name: string
  /** Le symbole, pris dans la banque de `./marks.ts`. */
  mark: MarkId
  /** Le mot à côté du symbole : dessiné (le mot « clip » de la banque) ou écrit en Inter Black. */
  wordmark: 'drawn' | 'text'
  /** L'entreprise nommée (« Propulsé par », mentions, données structurées) ; `null` : jamais nommée. */
  company: string | null
  companyUrl: string | null
  /** Les prix du libre-service se montrent (site, Abonnement, conseiller) ; sinon, tout est sur devis. */
  selfServePrices: boolean
  /** Le forfait Usine et ses modules se proposent (vente par l'équipe, rendez-vous). */
  enterprise: boolean
  /** L'espace Découvrir, pour les prospects de l'équipe de vente. */
  decouvrir: boolean
  /**
   * Le film du site (« Voir le film », ses données structurées et le plan du site). Sa voix nomme CLIP et
   * propose une démo : la marque publique attend le sien.
   */
  film: boolean
  /**
   * Le site public se laisse trouver par les moteurs. Non pour CLIP (vendu par l'équipe, et ses textes
   * attendent l'approbation du moteur marketing, D115) : seule la marque publique se fait indexer, ce qui
   * évite aussi deux sites au même contenu.
   */
  siteIndexed: boolean
  /** La langue quand le navigateur n'en demande aucune que l'outil parle. */
  defaultLang: 'fr' | 'en'
  /**
   * Qui exploite le produit, nommé seulement là où la loi l'exige (la politique de confidentialité :
   * Loi 25, RGPD). Intelligence Industrielle : Kiplo se publie dans son compte développeur principal,
   * à côté de CLIP (décision du 2026-11-17) ; se change ici, en un seul endroit.
   */
  legal: { entity: string; address: string; email: string }
}

const II_LEGAL = { entity: 'Intelligence Industrielle', address: '266, rue Saint-Paul Est, Montréal (Québec) H2Y 1G9, Canada', email: 'info@intelligenceindustrielle.com' }

export const PRODUCTS: Record<BrandId, Product> = {
  clip: {
    id: 'clip',
    name: 'CLIP',
    mark: 'pile',
    wordmark: 'drawn',
    company: 'Intelligence Industrielle',
    companyUrl: 'https://www.intelligenceindustrielle.com',
    selfServePrices: false,
    enterprise: true,
    decouvrir: true,
    film: true,
    siteIndexed: false,
    defaultLang: 'fr',
    legal: II_LEGAL,
  },
  kiplo: {
    id: 'kiplo',
    name: 'Kiplo',
    // « Filmer, puis lire » : le point qui enregistre, puis la lecture. Le geste filmé devient l'instruction.
    mark: 'filmer',
    wordmark: 'text',
    company: null,
    companyUrl: null,
    selfServePrices: true,
    enterprise: false,
    decouvrir: false,
    film: false,
    siteIndexed: true,
    defaultLang: 'en',
    legal: II_LEGAL,
  },
}

/** La politique de confidentialité de la marque : celle d'Intelligence Industrielle pour CLIP ; la page du site pour Kiplo. */
export function privacyHref(lang: string): string {
  if (PRODUCT.company) return 'https://www.intelligenceindustrielle.com/privacy-policy'
  return lang === 'fr' ? '/confidentialite' : lang === 'en' ? '/en/privacy' : `/${lang}/privacy`
}

/** Les noms que la build accepte pour la marque publique : `kiplo`, et `gesto`, son nom d'avant le 2026-11-17. */
const PUBLIC_BRAND_IDS = new Set(['kiplo', 'gesto'])

export const brandIdOf = (value: string | undefined): BrandId => (PUBLIC_BRAND_IDS.has(value?.trim().toLowerCase() ?? '') ? 'kiplo' : 'clip')

/** La marque de cette build. */
export const PRODUCT: Product = PRODUCTS[brandIdOf(process.env.NEXT_PUBLIC_BRAND)]

const TOKEN = /\b(?:CLIP|Clip)\b/g
// L'entreprise, quand la marque ne la nomme pas : « d’Intelligence Industrielle » devient « de Kiplo ».
const COMPANY_ELIDED = /\b([dD])[’']Intelligence Industrielle\b/g
const COMPANY = /\bIntelligence Industrielle\b/g

/** Un texte de la source avec le nom de la marque (identique pour CLIP). */
export function brandText(s: string, p: Product = PRODUCT): string {
  if (p.id === 'clip') return s
  let out = s.replace(TOKEN, p.name)
  if (!p.company) out = out.replace(COMPANY_ELIDED, (_, d: string) => `${d}e ${p.name}`).replace(COMPANY, p.name)
  return out
}

/**
 * Un dictionnaire (ou n'importe quel arbre de textes) au nom de la marque : chaque texte, et ce que rend
 * chaque fonction quand c'est un texte. Pour CLIP, le dictionnaire tel quel.
 */
export function brandify<T>(value: T, p: Product = PRODUCT): T {
  if (p.id === 'clip') return value
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return brandText(v, p)
    if (typeof v === 'function') {
      const fn = v as (...args: unknown[]) => unknown
      return (...args: unknown[]) => {
        const r = fn(...args)
        return typeof r === 'string' ? brandText(r, p) : r
      }
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
    return v
  }
  return walk(value) as T
}

/**
 * Le titre et la description que le serveur écrit avant que l'outil connaisse la langue de la personne
 * (layout.tsx) : dans la langue par défaut de la marque. `DocumentTitle` (Providers) les traduit ensuite.
 */
export const SERVER_META =
  PRODUCT.defaultLang === 'en'
    ? {
        lang: 'en',
        title: `${PRODUCT.name} — Work instructions`, // i18n-ignore : rendu au serveur
        description: 'Film the job and talk: AI writes the work instruction. Operators find it at the right station, at the right moment.', // i18n-ignore : rendu au serveur
      }
    : {
        lang: 'fr-CA',
        title: `${PRODUCT.name} — Instructions de travail`, // i18n-ignore : rendu au serveur
        description: "Filmez, parlez, l'IA rédige l'instruction de travail. Vos opérateurs la trouvent au bon poste, au bon moment.", // i18n-ignore : rendu au serveur
      }
