/**
 * L'adresse de l'app web que la coquille affiche.
 *
 * `EXPO_PUBLIC_CLIP_WEB_URL` est figée dans la build (Metro remplace la référence statique) :
 * aucune valeur par défaut n'est inventée. Sans elle, la coquille montre un écran de
 * configuration au lieu de charger une adresse au hasard.
 */
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

export function getWebTarget(): WebTarget | null {
  // Référence statique obligatoire : Metro n'inline pas un accès dynamique à process.env.
  return parseWebTarget(process.env.EXPO_PUBLIC_CLIP_WEB_URL)
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
