/**
 * Thème de l'utilisateur (ux-design-ii 5.16) : clé `ui_theme` = { mode, preset }, préservée à la
 * déconnexion. La couleur de l'usine (réglages) surcharge la primaire du preset « Océan ».
 */
export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemePreset = 'ocean' | 'nature' | 'crepuscule' | 'royal' | 'monochrome'
export interface UiTheme {
  mode: ThemeMode
  preset: ThemePreset
}

/**
 * Les thèmes. Leur nom vit dans le dictionnaire (`catalog.themes`) : ce module est aussi lu par la
 * mise en page racine, rendue par le serveur, qui ne charge pas les langues.
 */
export const THEME_PRESETS: Array<{ value: ThemePreset; swatch: string }> = [
  { value: 'ocean', swatch: 'linear-gradient(135deg,#00C6FF,#0078FF)' },
  { value: 'nature', swatch: 'linear-gradient(135deg,#3ee0a1,#10a96d)' },
  { value: 'crepuscule', swatch: 'linear-gradient(135deg,#ffb000,#ff6b00)' },
  { value: 'royal', swatch: 'linear-gradient(135deg,#9b2cfa,#2c62fa)' },
  { value: 'monochrome', swatch: 'linear-gradient(135deg,#64748b,#334155)' },
]

export function readTheme(): UiTheme {
  const fallback: UiTheme = { mode: 'system', preset: 'ocean' }
  try {
    return { ...fallback, ...(JSON.parse(localStorage.getItem('ui_theme') || '{}') as Partial<UiTheme>) }
  } catch {
    return fallback
  }
}

export function applyTheme(theme: UiTheme) {
  const root = document.documentElement
  const dark = theme.mode === 'dark' || (theme.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', dark)
  root.dataset.preset = theme.preset
}

export function saveTheme(theme: UiTheme) {
  try {
    localStorage.setItem('ui_theme', JSON.stringify(theme))
  } catch {
    /* stockage indisponible : le thème vaut pour la session */
  }
  applyTheme(theme)
}

/** Script inline exécuté avant le premier rendu (évite le flash de thème). */
export const THEME_SCRIPT = `(function(){var s={mode:'system',preset:'ocean'};try{var v=JSON.parse(localStorage.getItem('ui_theme')||'{}');if(v&&typeof v==='object'){s.mode=v.mode||s.mode;s.preset=v.preset||s.preset}}catch(e){}var d=s.mode==='dark'||(s.mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');document.documentElement.dataset.preset=s.preset;})();`

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function shade(rgb: [number, number, number], f: number): string {
  const c = rgb.map((v) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Applique la couleur de marque de l'usine aux tokens primaires (seulement avec le preset Océan). */
export function applyBrandColor(color: string | null | undefined) {
  const root = document.documentElement
  const props = ['--primary', '--primary-strong', '--primary-soft', '--primary-rgb', '--gradient-primary', '--shadow-primary']
  const rgb = color ? hexToRgb(color) : null
  if (!rgb || root.dataset.preset !== 'ocean') {
    props.forEach((p) => root.style.removeProperty(p))
    return
  }
  const [r, g, b] = rgb
  root.style.setProperty('--primary', color as string)
  root.style.setProperty('--primary-strong', shade(rgb, -0.18))
  root.style.setProperty('--primary-soft', shade(rgb, 0.9))
  root.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`)
  root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${shade(rgb, 0.3)} 0%, ${color} 100%)`)
  root.style.setProperty('--shadow-primary', `0 10px 20px rgba(${r}, ${g}, ${b}, 0.3)`)
}
