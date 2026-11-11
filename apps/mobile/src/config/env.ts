/**
 * L'adresse de l'app web que la coquille affiche.
 *
 * Par défaut, l'app web de production. `EXPO_PUBLIC_CLIP_WEB_URL` la remplace (développement sur
 * le réseau local, préproduction) ; elle est figée dans la build (Metro remplace la référence
 * statique). Une valeur donnée mais invalide ne retombe pas sur la production : la coquille montre
 * l'écran de configuration, pour que l'erreur se voie.
 */

/** L'app web de production (Vercel). */
export const PRODUCTION_WEB_URL = 'https://clip-v3.vercel.app'

export interface WebTarget {
  /** Adresse de départ, sans barre oblique finale. */
  url: string
  /** Origine (schéma + hôte + port) : la frontière de confiance du pont. */
  origin: string
}

export function parseWebTarget(raw: string | undefined | null): WebTarget | null {
  if (!raw) return null
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return null
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  return { url: trimmed, origin: `${parsed.protocol}//${parsed.host}` }
}

/** L'adresse donnée si elle existe, sinon la production. */
export function resolveWebTarget(raw: string | undefined | null): WebTarget | null {
  return raw && raw.trim() ? parseWebTarget(raw) : parseWebTarget(PRODUCTION_WEB_URL)
}

export function getWebTarget(): WebTarget | null {
  // Référence statique obligatoire : Metro n'inline pas un accès dynamique à process.env.
  return resolveWebTarget(process.env.EXPO_PUBLIC_CLIP_WEB_URL)
}

/** Vrai si l'adresse appartient à l'app web (même origine). */
export function isSameOrigin(url: string, origin: string): boolean {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}` === origin
  } catch {
    return false
  }
}
