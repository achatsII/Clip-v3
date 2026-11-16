/**
 * Les gabarits du PDF (toggle `printTemplates`). Trois dispositions pour toutes les usines : les
 * étapes en grand (des cartes), le tableau (une ligne par étape, la forme classique d'une
 * instruction de travail) et « Une page » (tout tient sur une feuille à afficher au poste). Le
 * portrait ou le paysage aussi. Avec le logo et les couleurs de l'usine (feature `brand_kit`) :
 * ce que montre le cartouche, le pied de page (texte de l'usine, numéro, version et page sur chaque
 * page), la couleur, et un gabarit tiré d'un exemple de l'usine par l'IA.
 *
 * L'usine garde son gabarit dans `OrgSettings.print` ; l'aperçu d'impression part de lui, et chacun
 * peut changer la disposition et l'orientation pour son impression.
 */
import type { OrgSettings } from '../model/types'

export type PrintLayout = 'cards' | 'table' | 'onePage'
export type PrintOrientation = 'portrait' | 'landscape'
export type HeaderField = 'number' | 'version' | 'approvedBy' | 'stations' | 'duration' | 'qr'

export const LAYOUTS: PrintLayout[] = ['cards', 'table', 'onePage']
export const HEADER_FIELDS: HeaderField[] = ['number', 'version', 'approvedBy', 'stations', 'duration', 'qr']

export interface PrintTemplate {
  layout: PrintLayout
  orientation: PrintOrientation
  /** Ce que le cartouche montre ; absent : tout. */
  fields?: Partial<Record<HeaderField, boolean>>
  /** Le texte de l'usine en bas de chaque page (« Document contrôlé… ») ; vide : aucun. */
  footer?: string | null
  /** Le numéro, la version et la page en bas de chaque page. Oui par défaut. */
  pageNumbers?: boolean
  /** La couleur du PDF ; absente : celle de l'usine. */
  accent?: string | null
}

export const DEFAULT_TEMPLATE: PrintTemplate = { layout: 'cards', orientation: 'portrait', pageNumbers: true }

/** Ce que l'usine garde, rendu sûr ; une valeur inconnue reprend celle par défaut. */
export function normalizeTemplate(raw: unknown): PrintTemplate {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<PrintTemplate>
  const fields: Partial<Record<HeaderField, boolean>> = {}
  for (const f of HEADER_FIELDS) if (typeof r.fields?.[f] === 'boolean') fields[f] = r.fields[f]
  const footer = typeof r.footer === 'string' ? r.footer.replace(/\s+/g, ' ').trim().slice(0, 160) : ''
  const accent = typeof r.accent === 'string' && /^#[0-9a-f]{6}$/i.test(r.accent) ? r.accent.toUpperCase() : null
  return {
    layout: LAYOUTS.includes(r.layout as PrintLayout) ? (r.layout as PrintLayout) : DEFAULT_TEMPLATE.layout,
    orientation: r.orientation === 'landscape' ? 'landscape' : 'portrait',
    ...(Object.keys(fields).length ? { fields } : {}),
    ...(footer ? { footer } : {}),
    pageNumbers: r.pageNumbers !== false,
    ...(accent ? { accent } : {}),
  }
}

export function templateOf(org: Pick<OrgSettings, 'print'>): PrintTemplate {
  return normalizeTemplate(org.print)
}

/** Le cartouche montre ce champ ? Tout, sauf ce que l'usine a retiré. */
export const shows = (t: PrintTemplate, f: HeaderField): boolean => t.fields?.[f] !== false

/**
 * Sans le logo et les couleurs de l'usine (`brand_kit`), le gabarit garde sa disposition et son
 * orientation ; le reste reprend la forme de CLIP.
 */
export function withoutBrandKit(t: PrintTemplate): PrintTemplate {
  return { layout: t.layout, orientation: t.orientation, pageNumbers: true }
}

/** Deux gabarits qui donnent le même PDF. */
export const sameTemplate = (a: PrintTemplate, b: PrintTemplate): boolean => JSON.stringify(normalizeTemplate(a)) === JSON.stringify(normalizeTemplate(b))

/**
 * La feuille, en pixels CSS (96 par pouce) : du papier lettre, des marges de 12 mm et 16 mm en bas
 * (le pied de page). C'est la largeur où l'aperçu se compose, et la hauteur qu'« Une page » remplit.
 */
export const MARGIN_MM = 12
export const BOTTOM_MM = 16
const PX_PER_MM = 96 / 25.4
export function pageBox(orientation: PrintOrientation): { width: number; height: number } {
  const [w, h] = orientation === 'landscape' ? [279.4, 215.9] : [215.9, 279.4]
  return { width: Math.floor((w - 2 * MARGIN_MM) * PX_PER_MM), height: Math.floor((h - MARGIN_MM - BOTTOM_MM) * PX_PER_MM) }
}

/** « Une page » ne réduit pas sous la moitié : au-delà, le texte ne se lit plus. */
export const MIN_SCALE = 0.5

/**
 * Le pas suivant du réglage « Une page » : la feuille mesure `height` px à l'échelle `scale` ; on
 * vise la hauteur de la page. Rend null quand c'est réglé (ou qu'on ne peut pas faire mieux).
 */
export function nextScale(scale: number, height: number, pageHeight: number): number | null {
  if (!(height > 0)) return null
  const ratio = pageHeight / height
  if (ratio >= 0.985 && (ratio <= 1.12 || scale >= 1)) return null
  const next = Math.round(Math.max(MIN_SCALE, Math.min(1, scale * ratio * 0.99)) * 1000) / 1000
  return Math.abs(next - scale) < 0.005 ? null : next
}

/** La feuille déborde encore à l'échelle la plus petite : le gabarit le dira (« 2 pages »). */
export const overflowPages = (scale: number, height: number, pageHeight: number): number => (scale <= MIN_SCALE && height > pageHeight * 1.01 ? Math.ceil(height / pageHeight) : 1)
