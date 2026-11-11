/**
 * Les annotations d'une image : couleurs, tailles, géométrie (boîte, déplacement, toucher).
 * Coordonnées relatives (0 à 1) à l'image ; les tailles suivent la largeur de l'image, comme si
 * on avait dessiné dessus : la même marque reste proportionnée en vignette, au poste et au PDF.
 */
import type { Annotation, AnnotationColor, AnnotationSize, AnnotationType } from '../model/types'
import { ANNOTATION_ICONS } from './icons'

export const ANNOTATION_COLORS: Record<AnnotationColor, { fill: string; label: string }> = {
  red: { fill: '#FF2B5E', label: 'Rouge' },
  orange: { fill: '#FF7A00', label: 'Orange' },
  yellow: { fill: '#FFC800', label: 'Jaune' },
  green: { fill: '#18c480', label: 'Vert' },
  blue: { fill: '#0078FF', label: 'Bleu' },
  white: { fill: '#ffffff', label: 'Blanc' },
  black: { fill: '#0f172a', label: 'Noir' },
}
export const COLOR_ORDER: AnnotationColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'white', 'black']

export function colorOf(c: string | undefined): string {
  return ANNOTATION_COLORS[c as AnnotationColor]?.fill ?? ANNOTATION_COLORS.red.fill
}

/** Couleur d'un texte ou d'une icône posé sur la couleur `c`. */
export function inkOn(c: string | undefined): string {
  return c === 'yellow' || c === 'white' ? '#0f172a' : '#ffffff'
}

export const SIZES: AnnotationSize[] = ['s', 'm', 'l', 'xl', 'xxl']
export const SIZE_LABEL: Record<AnnotationSize, string> = { s: 'Petit', m: 'Moyen', l: 'Grand', xl: 'Très grand', xxl: 'Énorme' }

/** Épaisseur d'un trait, en millièmes de la largeur de l'image. */
export const STROKE: Record<AnnotationSize, number> = { s: 5, m: 9, l: 15, xl: 24, xxl: 36 }
export const HIGHLIGHT: Record<AnnotationSize, number> = { s: 22, m: 36, l: 56, xl: 80, xxl: 110 }

/** Pastilles (numéros, icônes) et étiquettes : en % de la largeur de l'image, bornées en pixels. */
export const BADGE: Record<AnnotationSize, { cqw: number; min: number; max: number }> = {
  s: { cqw: 6, min: 20, max: 44 },
  m: { cqw: 8.5, min: 26, max: 60 },
  l: { cqw: 12, min: 34, max: 84 },
  xl: { cqw: 17, min: 44, max: 124 },
  xxl: { cqw: 24, min: 56, max: 176 },
}
export const LABEL: Record<AnnotationSize, { cqw: number; min: number; max: number }> = {
  s: { cqw: 2.6, min: 10, max: 16 },
  m: { cqw: 3.4, min: 11, max: 22 },
  l: { cqw: 4.8, min: 13, max: 32 },
  xl: { cqw: 6.6, min: 16, max: 44 },
  xxl: { cqw: 9, min: 20, max: 62 },
}

/** Agrandissement libre (poignée) d'un numéro, d'une icône ou d'un texte, en plus de la taille. */
export const SCALE_MIN = 0.4
export const SCALE_MAX = 4
export const scaleOf = (a: Annotation): number => a.scale ?? 1
export const clampScale = (v: number): number => Math.round(Math.min(SCALE_MAX, Math.max(SCALE_MIN, v)) * 100) / 100

export const sizeOf = (a: Annotation): AnnotationSize => a.size ?? 'm'

/** Une valeur bornée, comme `clamp(min, cqw, max)` en CSS, pour une image large de `width` px. */
export function clampPx(spec: { cqw: number; min: number; max: number }, width: number): number {
  return Math.min(spec.max, Math.max(spec.min, (spec.cqw / 100) * width))
}

/**
 * Diamètre d'une pastille et taille du texte d'une étiquette, en pixels à l'écran, pour une image
 * affichée large de `width` px avec un zoom `zoom` (les bornes s'appliquent avant le zoom).
 */
export const badgePx = (a: Annotation, width: number, zoom = 1): number => clampPx(BADGE[sizeOf(a)], width / zoom) * zoom * scaleOf(a)
export const labelPx = (a: Annotation, width: number, zoom = 1): number => clampPx(LABEL[sizeOf(a)], width / zoom) * zoom * scaleOf(a)

/** Demi-largeur et demi-hauteur, en pixels à l'écran, d'une marque posée sur un point. */
export function pointHalf(a: Annotation, width: number, zoom = 1): { hw: number; hh: number } {
  if (a.type === 'number' || a.type === 'icon') {
    const r = badgePx(a, width, zoom) / 2
    return { hw: r, hh: r }
  }
  const font = labelPx(a, width, zoom)
  return { hw: Math.min(width * 0.31, ((a.text ?? '').length * font * 0.58) / 2 + font * 0.6), hh: font * 0.8 }
}

/** Ancienne étiquette : une flèche de longueur nulle qui porte un texte. */
export function isLegacyText(a: Annotation): boolean {
  return a.type === 'arrow' && !!a.text && (a.x2 ?? a.x) === a.x && (a.y2 ?? a.y) === a.y
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Les outils qui se tracent en glissant le doigt (les autres se posent d'un toucher). */
export const DRAG_TOOLS: AnnotationType[] = ['pen', 'highlight', 'arrow', 'line', 'circle', 'rect', 'blur']

export interface Box {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** La boîte englobante relative ; un point pour une pastille ou une étiquette. */
export function bbox(a: Annotation): Box {
  if (a.points?.length) {
    const xs = a.points.map((p) => p[0])
    const ys = a.points.map((p) => p[1])
    return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) }
  }
  if ((a.type === 'arrow' || a.type === 'line') && a.x2 !== undefined && a.y2 !== undefined) {
    return { x1: Math.min(a.x, a.x2), y1: Math.min(a.y, a.y2), x2: Math.max(a.x, a.x2), y2: Math.max(a.y, a.y2) }
  }
  if (a.w !== undefined && a.h !== undefined && (a.type === 'circle' || a.type === 'rect' || a.type === 'blur')) {
    return { x1: a.x, y1: a.y, x2: a.x + a.w, y2: a.y + a.h }
  }
  return { x1: a.x, y1: a.y, x2: a.x, y2: a.y }
}

/** Déplace une annotation sans la sortir de l'image. */
export function translate(a: Annotation, dx: number, dy: number): Annotation {
  const b = bbox(a)
  const cdx = Math.min(1 - b.x2, Math.max(-b.x1, dx))
  const cdy = Math.min(1 - b.y2, Math.max(-b.y1, dy))
  const next: Annotation = { ...a, x: a.x + cdx, y: a.y + cdy }
  if (a.x2 !== undefined) next.x2 = a.x2 + cdx
  if (a.y2 !== undefined) next.y2 = a.y2 + cdy
  if (a.points) next.points = a.points.map(([px, py]) => [px + cdx, py + cdy])
  return next
}

export type Corner = 'nw' | 'ne' | 'sw' | 'se'
export type HandleKind = Corner | 'start' | 'end' | 'scale'

/** Une marque posée sur un point (numéro, icône, texte) : elle s'agrandit, elle ne s'étire pas. */
export const isPointLike = (a: Annotation): boolean => a.type === 'number' || a.type === 'icon' || a.type === 'text' || isLegacyText(a)

/** Étendue minimale d'une forme étirée, pour qu'elle ne disparaisse pas sous le doigt. */
const MIN_EXTENT = 0.012

/**
 * Étire une forme ou un tracé par un coin : le coin opposé reste en place, et la forme peut se
 * retourner (on tire au-delà du coin fixe), comme dans les logiciels de dessin.
 */
export function resizeBy(a: Annotation, corner: Corner, p: { x: number; y: number }): Annotation {
  const b = bbox(a)
  const west = corner === 'nw' || corner === 'sw'
  const north = corner === 'nw' || corner === 'ne'
  const fx = west ? b.x2 : b.x1
  const fy = north ? b.y2 : b.y1
  const away = (v: number, fixed: number, before: number) => {
    const d = clamp01(v) - fixed
    if (Math.abs(d) >= MIN_EXTENT) return clamp01(v)
    const dir = d !== 0 ? Math.sign(d) : Math.sign(before - fixed) || 1
    return clamp01(fixed + dir * MIN_EXTENT)
  }
  const mx = away(p.x, fx, west ? b.x1 : b.x2)
  const my = away(p.y, fy, north ? b.y1 : b.y2)
  if (a.points?.length) {
    const ox = (west ? b.x1 : b.x2) - fx
    const oy = (north ? b.y1 : b.y2) - fy
    const sx = ox !== 0 ? (mx - fx) / ox : 1
    const sy = oy !== 0 ? (my - fy) / oy : 1
    const points = a.points.map(([px, py]) => [clamp01(fx + (px - fx) * sx), clamp01(fy + (py - fy) * sy)] as [number, number])
    return { ...a, points, x: points[0][0], y: points[0][1] }
  }
  return { ...a, x: Math.min(fx, mx), y: Math.min(fy, my), w: Math.abs(mx - fx), h: Math.abs(my - fy) }
}

/** Déplace un bout d'une flèche ou d'une ligne. */
export function moveEnd(a: Annotation, end: 'start' | 'end', p: { x: number; y: number }): Annotation {
  return end === 'start' ? { ...a, x: clamp01(p.x), y: clamp01(p.y) } : { ...a, x2: clamp01(p.x), y2: clamp01(p.y) }
}

/** Angle ramené au multiple de 45° le plus proche (touche Maj), mesuré en pixels. */
export function snap45(from: { x: number; y: number }, to: { x: number; y: number }, width: number, height: number): { x: number; y: number } {
  const dx = (to.x - from.x) * width
  const dy = (to.y - from.y) * height
  const len = Math.hypot(dx, dy)
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
  return { x: clamp01(from.x + (Math.cos(angle) * len) / width), y: clamp01(from.y + (Math.sin(angle) * len) / height) }
}

/**
 * Les poignées d'une marque sélectionnée, en coordonnées relatives : les deux bouts d'une flèche,
 * les quatre coins d'une forme ou d'un tracé, un coin d'agrandissement pour une marque posée.
 * `width` et `height` : l'image affichée, en pixels avant zoom.
 */
export function handlesOf(a: Annotation, width: number, height: number): Array<{ kind: HandleKind; x: number; y: number }> {
  if ((a.type === 'arrow' || a.type === 'line') && !isLegacyText(a)) {
    return [
      { kind: 'start', x: a.x, y: a.y },
      { kind: 'end', x: a.x2 ?? a.x, y: a.y2 ?? a.y },
    ]
  }
  if (isPointLike(a)) {
    const { hw, hh } = pointHalf(a, width)
    return [{ kind: 'scale', x: a.x + (hw + 6) / Math.max(1, width), y: a.y + (hh + 6) / Math.max(1, height) }]
  }
  const b = bbox(a)
  return [
    { kind: 'nw', x: b.x1, y: b.y1 },
    { kind: 'ne', x: b.x2, y: b.y1 },
    { kind: 'sw', x: b.x1, y: b.y2 },
    { kind: 'se', x: b.x2, y: b.y2 },
  ]
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * L'annotation sous le doigt, la plus récente d'abord. Tout se mesure en pixels sur une image
 * affichée en `width` × `height`, avec une marge de doigt.
 */
export function hitTest(list: Annotation[], px: number, py: number, width: number, height: number, tolerance = 22, zoom = 1): string | null {
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i]
    const X = (v: number) => v * width
    const Y = (v: number) => v * height
    const size = sizeOf(a)
    let hit = false
    if (a.points?.length) {
      const pts = a.points
      const reach = tolerance + ((a.type === 'highlight' ? HIGHLIGHT : STROKE)[size] / 1000) * width
      if (pts.length === 1) hit = Math.hypot(px - X(pts[0][0]), py - Y(pts[0][1])) <= reach
      for (let k = 1; k < pts.length && !hit; k++) {
        hit = distToSegment(px, py, X(pts[k - 1][0]), Y(pts[k - 1][1]), X(pts[k][0]), Y(pts[k][1])) <= reach
      }
    } else if ((a.type === 'arrow' || a.type === 'line') && !isLegacyText(a)) {
      hit = distToSegment(px, py, X(a.x), Y(a.y), X(a.x2 ?? a.x), Y(a.y2 ?? a.y)) <= tolerance + 6
    } else if (a.type === 'circle' || a.type === 'rect' || a.type === 'blur') {
      const b = bbox(a)
      hit = px >= X(b.x1) - tolerance && px <= X(b.x2) + tolerance && py >= Y(b.y1) - tolerance && py <= Y(b.y2) + tolerance
    } else if (a.type === 'number' || a.type === 'icon') {
      hit = Math.hypot(px - X(a.x), py - Y(a.y)) <= badgePx(a, width, zoom) / 2 + tolerance / 2
    } else {
      // étiquette de texte, centrée sur son point
      const { hw, hh } = pointHalf(a, width, zoom)
      hit = Math.abs(px - X(a.x)) <= hw + tolerance / 2 && Math.abs(py - Y(a.y)) <= hh + tolerance / 2
    }
    if (hit) return a.id
  }
  return null
}

/** Une annotation venue d'ailleurs (IA, ancienne version) ramenée à une forme sûre, ou rien. */
export function sanitizeAnnotation(raw: unknown): Annotation | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Partial<Annotation>
  const types: AnnotationType[] = ['pen', 'highlight', 'arrow', 'line', 'circle', 'rect', 'text', 'number', 'icon', 'blur']
  if (!a.id || !a.type || !types.includes(a.type)) return null
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? clamp01(v) : undefined)
  const x = n(a.x)
  const y = n(a.y)
  if (x === undefined || y === undefined) return null
  const out: Annotation = { id: String(a.id), type: a.type, x, y, color: (a.color && a.color in ANNOTATION_COLORS ? a.color : 'red') as AnnotationColor }
  for (const k of ['x2', 'y2', 'w', 'h'] as const) {
    const v = n(a[k])
    if (v !== undefined) out[k] = v
  }
  if (Array.isArray(a.points)) out.points = a.points.filter((p) => Array.isArray(p) && p.length === 2).map(([px, py]) => [clamp01(Number(px) || 0), clamp01(Number(py) || 0)] as [number, number]).slice(0, 2000)
  if (typeof a.text === 'string') out.text = a.text.slice(0, 200)
  if (typeof a.icon === 'string' && a.icon in ANNOTATION_ICONS) out.icon = a.icon
  if (a.size && (SIZES as string[]).includes(a.size)) out.size = a.size
  if (typeof a.scale === 'number' && Number.isFinite(a.scale) && a.scale !== 1) out.scale = clampScale(a.scale)
  if (out.type === 'icon' && !out.icon) return null
  if ((out.type === 'pen' || out.type === 'highlight') && !out.points?.length) return null
  return out
}
