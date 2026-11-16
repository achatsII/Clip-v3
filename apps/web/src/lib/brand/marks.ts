/**
 * La banque des logos de CLIP : les 10 symboles proposés le 2026-11-16 (planche « Logo CLIP — 10
 * propositions »), sur une grille de 100, dessinés en `currentColor`.
 *
 * `BRAND_MARK` choisit celui de l'app. Pour en changer : modifier `BRAND_MARK`, puis refaire les icônes
 * fixes (favicon, icône d'accueil, icônes de l'app mobile) avec `npm run brand-icons` dans `apps/web`.
 * Les icônes de l'app mobile ne changent qu'à la prochaine build native.
 *
 * Avant d'adopter un symbole pour de bon : une recherche de marque de commerce (Canada, États-Unis).
 * Aucun import ici : le script des icônes lit ce fichier tel quel.
 */
export type MarkId = 'etapes' | 'extrait' | 'filmer' | 'boulon' | 'tete' | 'pile' | 'pochoir' | 'code' | 'coche' | 'actuel'

export interface BrandMark {
  id: MarkId
  /** Son numéro sur la planche des propositions. */
  n: number
  name: string
  /** Le dessin. `uid` rend uniques les masques quand le logo paraît plusieurs fois dans une page. */
  svg: (uid: string) => string
  /** Le point du « i » du mot « clip » : la tête de lecture pour le 5, un rond sinon. */
  dot?: 'playhead'
  /** À savoir avant de le reprendre. */
  note?: string
}

/** Le logo de l'app : le 6, « La pile d'extraits », choisi le 2026-11-16 en attendant le définitif. */
export const BRAND_MARK: MarkId = 'pile'

const fill = 'fill="currentColor"'
const line = (w: number) => `fill="none" stroke="currentColor" stroke-width="${w}"`

export const MARKS: BrandMark[] = [
  {
    id: 'etapes',
    n: 1,
    name: 'Lecture en étapes',
    svg: () => `<path d="M28 21 L42.5 29.09 L42.5 70.91 L28 79 Z M48.5 32.43 L62.5 40.24 L62.5 59.76 L48.5 67.57 Z M68.5 43.59 L80 50 L68.5 56.41 Z" ${fill} stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>`,
  },
  {
    id: 'extrait',
    n: 2,
    name: 'L’extrait',
    svg: () =>
      `<path d="M34 23 H24 V77 H34 M66 23 H76 V77 H66" ${line(9)} stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M43 37 L43 63 L62.5 50 Z" ${fill} stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>`,
  },
  {
    id: 'filmer',
    n: 3,
    name: 'Filmer, puis lire',
    svg: () => `<circle cx="33" cy="50" r="16" ${fill}/><path d="M57 31 L57 69 L83 50 Z" ${fill} stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>`,
  },
  {
    id: 'boulon',
    n: 4,
    name: 'Le boulon',
    note: 'L’hexagone avec une lecture se vend tout fait sur les sites de modèles de logos.',
    svg: (uid) =>
      `<defs><mask id="${uid}-k" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="black"/>` +
      `<path d="M81.18 68 L50 86 L18.82 68 L18.82 32 L50 14 L81.18 32 Z" fill="white" stroke="white" stroke-width="7" stroke-linejoin="round"/>` +
      `<path d="M42 37 L42 63 L64 50 Z" fill="black" stroke="black" stroke-width="5" stroke-linejoin="round"/></mask></defs>` +
      `<rect width="100" height="100" ${fill} mask="url(#${uid}-k)"/>`,
  },
  {
    id: 'tete',
    n: 5,
    name: 'La tête de lecture',
    dot: 'playhead',
    svg: () => `<path d="M50 48 V77" stroke="currentColor" stroke-width="13" stroke-linecap="round"/><path d="M41.5 23 L58.5 23 L50 33 Z" ${fill} stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>`,
  },
  {
    id: 'pile',
    n: 6,
    name: 'La pile d’extraits',
    note: 'Le même carré que celui de devant, derrière, incliné et caché sous lui. Motif courant des icônes de bibliothèque vidéo.',
    // Dessiné sur la grille de l'exemple (96), puis agrandi et centré sur la grille de 100.
    svg: (uid) =>
      `<defs><mask id="${uid}-k" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96"><rect width="96" height="96" fill="white"/><rect x="31" y="18.7" width="46" height="46" rx="10.25" fill="black"/></mask></defs>` +
      `<g transform="translate(50 50) scale(1.368) translate(-48.25 -47.6)">` +
      `<g mask="url(#${uid}-k)"><rect x="28.75" y="37" width="30.5" height="30.5" rx="2.5" ${line(4.5)} transform="rotate(-6 44 52.25)"/></g>` +
      `<rect x="38.75" y="26.45" width="30.5" height="30.5" rx="2.5" ${line(4.5)}/>` +
      `<path d="M48 32.5 L48 50.5 L61.5 41.5 Z" ${fill} stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></g>`,
  },
  {
    id: 'pochoir',
    n: 7,
    name: 'Le pochoir',
    svg: () => `<path d="M67.26 33.33 A24 24 0 0 0 52.51 26.13 M47.49 26.13 A24 24 0 0 0 47.49 73.87 M52.51 73.87 A24 24 0 0 0 67.26 66.67" ${line(17)}/>`,
  },
  {
    id: 'code',
    n: 8,
    name: 'Le C du code',
    svg: () =>
      [[18, 18], [35, 18], [52, 18], [69, 18], [18, 35], [18, 52], [18, 69], [35, 69], [52, 69], [69, 69]]
        .map(([x, y]) => `<rect x="${x}" y="${y}" width="13" height="13" rx="3.5" ${fill}/>`)
        .join('') + `<path d="M39 36 L39 64 L63.08 50 Z" ${fill} stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>`,
  },
  {
    id: 'coche',
    n: 9,
    name: 'Le C coché',
    note: 'À éviter : un C avec un crochet est enregistré aux États-Unis (2026) pour un logiciel de conformité, santé et sécurité au travail.',
    svg: () => `<path d="M63.4 30.68 A26 26 0 1 0 63.4 69.32" ${line(13)} stroke-linecap="round"/><path d="M37 50 L48 61 L80 29" ${line(13)} stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    id: 'actuel',
    n: 10,
    name: 'L’actuel, affiné',
    note: 'Un C blanc sur bleu rappelle un peu l’icône de Coinbase.',
    svg: () => `<path d="M59.14 33.15 A22 22 0 1 0 59.14 66.85" ${line(14)} stroke-linecap="round"/><circle cx="76" cy="50" r="7.5" ${fill}/>`,
  },
]

export const markOf = (id: MarkId = BRAND_MARK): BrandMark => MARKS.find((m) => m.id === id) ?? MARKS[0]

/** Le dessin du logo de l'app (ou d'un autre de la banque). */
export const brandMark = (uid: string, id: MarkId = BRAND_MARK): string => markOf(id).svg(uid)

/** Le mot « clip » dessiné, sur une grille de 150 × 92. */
export const WORDMARK_VIEWBOX = '0 0 150 92'
export function wordmarkSvg(id: MarkId = BRAND_MARK): string {
  const s = 'stroke="currentColor" stroke-width="14" stroke-linecap="round"'
  const dot =
    markOf(id).dot === 'playhead'
      ? `<path d="M75.5 2.5 L94.5 2.5 L85 14 Z" fill="currentColor" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>`
      : `<circle cx="85" cy="10" r="7" fill="currentColor"/>`
  return (
    `<path d="M34.51 35.89 A16 16 0 1 0 34.51 58.11" fill="none" ${s}/>` +
    `<path d="M59 7 V63" ${s}/><path d="M85 31 V63" ${s}/><path d="M111 31 V85" ${s}/>` +
    `<circle cx="127" cy="47" r="16" fill="none" stroke="currentColor" stroke-width="14"/>` +
    dot
  )
}

/**
 * L'icône complète, en SVG autonome : le symbole en blanc sur un dégradé. `shape` : `rounded` (favicon),
 * `square` (icône d'app, que le téléphone arrondit lui-même), `none` (symbole seul, fond transparent).
 */
export function iconSvg(opts: { from: string; to: string; shape: 'rounded' | 'square' | 'none'; markScale?: number; id?: MarkId }): string {
  const { from, to, shape, markScale = 1 } = opts
  const bg =
    shape === 'none'
      ? ''
      : `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
        `<rect width="100" height="100"${shape === 'rounded' ? ' rx="22.5"' : ''} fill="url(#bg)"/>`
  const t = markScale === 1 ? '' : ` transform="translate(50 50) scale(${markScale}) translate(-50 -50)"`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${bg}<g color="#FFFFFF"${t}>${brandMark('m', opts.id)}</g></svg>`
}
