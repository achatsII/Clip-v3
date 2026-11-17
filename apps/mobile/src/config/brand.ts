import brands from '../../brands.json'

/**
 * La marque de cette build : CLIP (les clients de l'équipe) ou la marque publique en libre-service.
 * `EXPO_PUBLIC_BRAND`, posée par le profil de build (eas.json), est figée par Metro ; sans valeur, CLIP.
 * Les marques sont dans brands.json, que lit aussi app.config.js (nom, identifiants, icônes) : la coquille
 * n'en garde que le nom, l'adresse de son app web et sa langue par défaut. Mêmes valeurs que la marque du
 * web (apps/web/src/lib/brand/product.ts) ; la coquille reste autonome, sans import hors d'apps/mobile.
 */
export type BrandId = keyof typeof brands

export interface ShellBrand {
  id: BrandId
  /** Le nom, tel qu'il s'écrit dans une phrase. */
  name: string
  /** L'app web de production de la marque. */
  webUrl: string
  /** La langue des écrans natifs quand l'appareil n'en parle aucune que la coquille connaît. */
  defaultLang: 'fr' | 'en'
}

export const brandIdOf = (value: string | undefined | null): BrandId => {
  const id = (value ?? '').trim().toLowerCase()
  return Object.prototype.hasOwnProperty.call(brands, id) ? (id as BrandId) : 'clip'
}

export function brandOf(id: BrandId): ShellBrand {
  const b = brands[id]
  return { id, name: b.name, webUrl: b.webUrl, defaultLang: b.defaultLang === 'en' ? 'en' : 'fr' }
}

// Référence statique obligatoire : Metro n'inline pas un accès dynamique à process.env.
export const BRAND: ShellBrand = brandOf(brandIdOf(process.env.EXPO_PUBLIC_BRAND))

const TOKEN = /\bCLIP\b/g

/** Un texte de la coquille au nom de la marque (identique pour CLIP). */
export function brandText(s: string, b: ShellBrand = BRAND): string {
  return b.id === 'clip' ? s : s.replace(TOKEN, b.name)
}

/** Un dictionnaire entier au nom de la marque : chaque texte, et ce que rend chaque fonction. */
export function brandify<T>(value: T, b: ShellBrand = BRAND): T {
  if (b.id === 'clip') return value
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return brandText(v, b)
    if (typeof v === 'function') {
      const fn = v as (...args: unknown[]) => unknown
      return (...args: unknown[]) => {
        const r = fn(...args)
        return typeof r === 'string' ? brandText(r, b) : r
      }
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
    return v
  }
  return walk(value) as T
}
