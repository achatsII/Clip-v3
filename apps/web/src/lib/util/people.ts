/**
 * Chercher des personnes (ou n'importe quelle liste) comme on les nomme : chaque mot tapé doit se
 * trouver quelque part (« ana roy » trouve « Ana-Maria Roy, Presse P-12 »), sans tenir compte des
 * accents ni des majuscules.
 */
import { normalizeText } from './cn'

/** Les mots d'une recherche, sans accents ; vide : tout correspond. */
export const searchTokens = (query: string): string[] => normalizeText(query).split(/[\s,;·]+/).filter(Boolean)

/** Chaque mot se trouve dans l'un des champs. */
export function matchesTokens(tokens: string[], ...fields: Array<string | null | undefined>): boolean {
  if (!tokens.length) return true
  const hay = normalizeText(fields.filter(Boolean).join(' '))
  return tokens.every((t) => hay.includes(t))
}

/** À partir de combien d'éléments une liste montre sa recherche. */
export const SEARCH_FROM = 8
