/**
 * Les figures d'un document (toggle `documentFigures`). À l'import d'une ancienne instruction (PDF,
 * Word converti), la génération dit quelle figure de quelle page illustre une étape (`figure` sur le
 * média de la page). Après la génération, la page se rend en image, l'IA y trouve la boîte de la
 * figure (`locateFigures`), et l'étape reçoit la figure recadrée, comme une photo (`enrichMedia`).
 * Une figure introuvable, trop petite pour servir ou qui est presque toute la page : la page reste.
 * Dans l'éditeur, « Figure » et « Page entière » passent de l'une à l'autre sans rien perdre.
 */
import type { DocumentPage, StepMedia } from '../model/types'

/** La boîte d'une figure : [ymin, xmin, ymax, xmax], de 0 à 1000 (la convention de l'IA). */
export type FigureBox = [number, number, number, number]

export interface PixelRect {
  x: number
  y: number
  w: number
  h: number
}

/** Marge autour de la figure (la boîte de l'IA est souvent serrée), en part du plus grand côté. */
const MARGIN = 0.02
/** Plus petite qu'un centième de la page : une icône, pas une figure. */
const MIN_AREA = 0.01
/** Plus des quatre cinquièmes de la page : la page entière dit la même chose. */
const MAX_AREA = 0.8

/** Une boîte rendue par l'IA, rendue sûre ; null si elle ne tient pas. */
export function parseBox(raw: unknown): FigureBox | null {
  if (!Array.isArray(raw) || raw.length < 4) return null
  const v = raw.slice(0, 4).map((n) => Number(n))
  if (v.some((n) => !Number.isFinite(n))) return null
  const [ymin, xmin, ymax, xmax] = v.map((n) => Math.min(1000, Math.max(0, n)))
  if (xmax <= xmin || ymax <= ymin) return null
  return [ymin, xmin, ymax, xmax]
}

/**
 * Le rectangle à garder, en pixels d'une image de `width` × `height`, avec sa marge ; null quand la
 * figure est trop petite pour servir ou couvre presque toute la page.
 */
export function figureRect(box: FigureBox, width: number, height: number): PixelRect | null {
  if (!(width > 0 && height > 0)) return null
  const [ymin, xmin, ymax, xmax] = box
  const area = ((xmax - xmin) / 1000) * ((ymax - ymin) / 1000)
  if (area < MIN_AREA) return null
  const pad = Math.round(Math.max(width, height) * MARGIN)
  const x = Math.max(0, Math.floor((xmin / 1000) * width) - pad)
  const y = Math.max(0, Math.floor((ymin / 1000) * height) - pad)
  const right = Math.min(width, Math.ceil((xmax / 1000) * width) + pad)
  const bottom = Math.min(height, Math.ceil((ymax / 1000) * height) + pad)
  const rect = { x, y, w: right - x, h: bottom - y }
  if ((rect.w * rect.h) / (width * height) > MAX_AREA) return null
  return rect
}

/** Deux demandes de la même figure (« Photo du capteur », « photo du  capteur ») n'en font qu'une. */
export function figureKey(figure: string): string {
  return figure.trim().toLowerCase().replace(/\s+/g, ' ')
}

type ImageMedia = Extract<StepMedia, { kind: 'image' }>
type DocumentMedia = Extract<StepMedia, { kind: 'document' }>

/** La figure recadrée d'une page, prête pour l'étape : elle sait de quelle page elle vient. */
export function figureMedia(page: DocumentMedia, url: string, pageImageUrl: string | undefined, alt: string): ImageMedia {
  const from: DocumentPage = { url: page.url, page: page.page ?? 1, ...(pageImageUrl ? { pageImageUrl } : {}), ...(page.name ? { name: page.name } : {}) }
  return { kind: 'image', url, ...(page.sourceId ? { sourceId: page.sourceId } : {}), ...(alt ? { alt } : {}), fromPage: from, ...common(page) }
}

/** La figure → la page entière d'où elle vient ; la figure se garde pour y revenir. */
export function toWholePage(m: StepMedia): DocumentMedia | null {
  if (m.kind !== 'image' || !m.fromPage) return null
  const p = m.fromPage
  return {
    kind: 'document',
    url: p.url,
    ...(m.sourceId ? { sourceId: m.sourceId } : {}),
    page: p.page,
    ...(p.pageImageUrl ? { pageImageUrl: p.pageImageUrl } : {}),
    ...(p.name ? { name: p.name } : {}),
    cropped: { url: m.url, ...(m.alt ? { alt: m.alt } : {}), ...(m.annotations?.length ? { annotations: m.annotations } : {}) },
    ...common(m),
  }
}

/** La page entière → la figure qu'on en avait tirée. */
export function toFigure(m: StepMedia): ImageMedia | null {
  if (m.kind !== 'document' || !m.cropped) return null
  const f = m.cropped
  return {
    ...figureMedia({ ...m, cropped: undefined }, f.url, m.pageImageUrl, f.alt ?? ''),
    ...(f.annotations?.length ? { annotations: f.annotations } : {}),
  }
}

/** La légende et le verdict suivent le média d'une forme à l'autre. */
function common(m: StepMedia): Pick<StepMedia, 'caption' | 'verdict'> {
  return { ...(m.caption ? { caption: m.caption } : {}), ...(m.verdict ? { verdict: m.verdict } : {}) }
}
