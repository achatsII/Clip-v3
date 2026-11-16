/**
 * La couleur de CLIP par défaut : le violet, décidé le 2026-11-16. Le bleu II d'avant reste au choix
 * dans Apparence (thème « Océan », `bleu`). Ces valeurs sont aussi celles de `:root` dans
 * `src/app/globals.css` (le CSS ne lit pas ce fichier) ; un test les compare.
 *
 * Aucun import ici : le script des icônes (`scripts/brand-icons.mjs`) lit ce fichier tel quel.
 */
export const BRAND = {
  primary: '#7C3AED',
  strong: '#6D28D9',
  soft: '#F1EAFE',
  /** Le texte teinté en mode sombre (étiquettes, entrée active du menu). */
  light: '#C4B5FD',
  rgb: '124, 58, 237',
  /** Le dégradé des actions principales et des icônes, à 135°. */
  from: '#A36CFF',
  to: '#7C3AED',
  /** En mode sombre, le violet s'éclaircit pour se lire en texte (3,4:1 sinon). */
  darkPrimary: '#9B6BFF',
} as const

/** L'ancien bleu par défaut. Les usines l'ont souvent enregistré sans le choisir. */
export const LEGACY_DEFAULT_COLOR = '#0078FF'

/**
 * La couleur de l'usine qui compte vraiment. Rien quand il n'y en a pas, ou quand c'est une couleur
 * par défaut : l'ancien bleu (le sélecteur de Réglages le proposait et « Appliquer » l'enregistrait
 * tel quel) ou le violet d'aujourd'hui. L'usine suit alors la couleur de CLIP, même si elle change.
 */
export function brandColorOf(color: string | null | undefined): string | null {
  if (!color) return null
  const c = color.trim().toLowerCase()
  return c === LEGACY_DEFAULT_COLOR.toLowerCase() || c === BRAND.primary.toLowerCase() ? null : color
}
