/**
 * La couleur de CLIP par défaut : l'indigo, décidé le 2026-11-16 (le violet l'a précédé une heure). Le
 * bleu II d'avant reste au choix dans Apparence (thème « Océan », `bleu`). Ces valeurs sont aussi celles
 * de `:root` dans `src/app/globals.css` (le CSS ne lit pas ce fichier) ; un test les compare.
 *
 * Aucun import ici : le script des icônes (`scripts/brand-icons.mjs`) lit ce fichier tel quel.
 */
export const BRAND = {
  primary: '#5B4CF0',
  strong: '#4338CA',
  soft: '#EEEDFE',
  /** Le texte teinté en mode sombre (étiquettes, entrée active du menu). */
  light: '#C7D2FE',
  rgb: '91, 76, 240',
  /** Le dégradé des actions principales et des icônes, à 135°. */
  from: '#8C7CFF',
  to: '#4F46E5',
  /** En mode sombre, l'indigo s'éclaircit pour se lire en texte (3,3:1 sinon). */
  darkPrimary: '#8B80FF',
} as const

/** L'ancien bleu par défaut. Les usines l'ont souvent enregistré sans le choisir. */
export const LEGACY_DEFAULT_COLOR = '#0078FF'

/** Les couleurs par défaut d'avant : l'ancien bleu, puis le violet (le 2026-11-16, une heure). */
export const FORMER_DEFAULT_COLORS = [LEGACY_DEFAULT_COLOR, '#7C3AED'] as const

/**
 * La couleur de l'usine qui compte vraiment. Rien quand il n'y en a pas, ou quand c'est une couleur
 * par défaut, d'aujourd'hui ou d'avant : le sélecteur de Réglages la proposait et « Appliquer »
 * l'enregistrait telle quelle. L'usine suit alors la couleur de CLIP, même si elle change.
 */
export function brandColorOf(color: string | null | undefined): string | null {
  if (!color) return null
  const c = color.trim().toLowerCase()
  return [BRAND.primary, ...FORMER_DEFAULT_COLORS].some((d) => d.toLowerCase() === c) ? null : color
}
