/**
 * Le dessin des annotations, en texte HTML : une seule source pour l'éditeur, le lecteur au poste
 * et le PDF. Traits en SVG (épaisseurs relatives à l'image), pastilles, icônes et étiquettes en
 * HTML (tailles en `cqw` : le conteneur doit avoir `container-type: inline-size`).
 */
import type { Annotation } from '../model/types'
import { ANNOTATION_ICONS, type IconElement } from './icons'
import { BADGE, HIGHLIGHT, LABEL, STROKE, colorOf, inkOn, isLegacyText, scaleOf, sizeOf } from './model'

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const n = (v: number) => (Math.round(v * 10) / 10).toString()
const pct = (v: number) => `${Math.round(v * 10000) / 100}%`
const clampCss = (s: { cqw: number; min: number; max: number }) => `clamp(${s.min}px, ${s.cqw}cqw, ${s.max}px)`
/** Une taille bornée, agrandie librement par la poignée (`scale`). */
const scaled = (css: string, k: number) => (k === 1 ? css : `calc(${css} * ${Math.round(k * 100) / 100})`)

const SHADOW = 'drop-shadow(0 1px 2px rgba(0,0,0,.55))'

/** Le dessin d'une icône (tracés Lucide) en SVG, dans la couleur `ink`. */
export function iconSvg(key: string, ink: string, style = ''): string {
  const icon = (ANNOTATION_ICONS as Record<string, { node: IconElement[] }>)[key]
  if (!icon) return ''
  const body = icon.node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}/>`).join('')
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${ink}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" style="${style}" aria-hidden="true">${body}</svg>`
}

export interface MarkupOptions {
  /** Largeur / hauteur de l'image : les flèches gardent leur forme sur une image non carrée. */
  ratio?: number
  /** Préfixe unique des identifiants SVG (plusieurs images sur une même page). */
  idPrefix?: string
  /** PDF : une zone floutée devient un aplat opaque (le flou ne s'imprime pas de façon fiable). */
  print?: boolean
}

export function annotationsMarkup(list: Annotation[], { ratio = 1, idPrefix = 'a', print = false }: MarkupOptions = {}): string {
  if (!list.length) return ''
  const H = 1000 / (ratio > 0 ? ratio : 1)
  const X = (v: number) => n(v * 1000)
  const Y = (v: number) => n(v * H)
  const svg: string[] = []
  const html: string[] = []
  const markers = new Set<string>()
  const marker = (color: string) => {
    markers.add(color)
    return `url(#${idPrefix}-ah-${color})`
  }

  const label = (a: Annotation, lx: number, ly: number, anchor: 'center' | 'above' | 'below') => {
    const c = colorOf(a.color)
    const t = anchor === 'above' ? 'translate(-50%,-115%)' : anchor === 'below' ? 'translate(-50%,15%)' : 'translate(-50%,-50%)'
    html.push(
      `<span style="position:absolute;left:${pct(Math.min(0.97, Math.max(0.03, lx)))};top:${pct(Math.min(0.97, Math.max(0.03, ly)))};transform:${t};max-width:62%;padding:.22em .6em;border-radius:.6em;background:${c};color:${inkOn(a.color)};font-weight:900;font-size:${scaled(clampCss(LABEL[sizeOf(a)]), scaleOf(a))};line-height:1.25;text-align:center;white-space:pre-wrap;overflow-wrap:anywhere;box-shadow:0 2px 6px rgba(0,0,0,.35);pointer-events:none">${esc(a.text)}</span>`,
    )
  }

  for (const a of list) {
    const c = colorOf(a.color)
    const size = sizeOf(a)
    const stroke = STROKE[size]
    switch (a.type) {
      case 'pen':
      case 'highlight': {
        if (!a.points?.length) break
        const pts = a.points.length === 1 ? [a.points[0], a.points[0]] : a.points
        const w = a.type === 'highlight' ? HIGHLIGHT[size] : stroke
        const op = a.type === 'highlight' ? ' stroke-opacity=".38"' : ''
        const shadow = a.type === 'pen' ? ` style="filter:${SHADOW}"` : ''
        svg.push(`<polyline points="${pts.map(([px, py]) => `${X(px)},${Y(py)}`).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}"${op} stroke-linecap="round" stroke-linejoin="round"${shadow}/>`)
        break
      }
      case 'arrow':
      case 'line': {
        if (isLegacyText(a)) {
          label(a, a.x, a.y, 'center')
          break
        }
        const end = a.type === 'arrow' ? ` marker-end="${marker(a.color)}"` : ''
        svg.push(`<line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(a.x2 ?? a.x)}" y2="${Y(a.y2 ?? a.y)}" stroke="${c}" stroke-width="${stroke}" stroke-linecap="round"${end} style="filter:${SHADOW}"/>`)
        if (a.text) label(a, a.x, a.y, (a.y2 ?? a.y) >= a.y ? 'above' : 'below')
        break
      }
      case 'circle':
      case 'rect': {
        const w = a.w ?? 0.1
        const h = a.h ?? 0.1
        if (a.type === 'circle') svg.push(`<ellipse cx="${X(a.x + w / 2)}" cy="${Y(a.y + h / 2)}" rx="${n((w / 2) * 1000)}" ry="${n((h / 2) * H)}" fill="none" stroke="${c}" stroke-width="${stroke}" style="filter:${SHADOW}"/>`)
        else svg.push(`<rect x="${X(a.x)}" y="${Y(a.y)}" width="${n(w * 1000)}" height="${n(h * H)}" rx="${n(stroke * 1.6)}" fill="none" stroke="${c}" stroke-width="${stroke}" style="filter:${SHADOW}"/>`)
        if (a.text) label(a, a.x + w / 2, a.y + h, 'below')
        break
      }
      case 'blur': {
        const box = `position:absolute;left:${pct(a.x)};top:${pct(a.y)};width:${pct(a.w ?? 0.1)};height:${pct(a.h ?? 0.1)};border-radius:6px;pointer-events:none;`
        html.push(print ? `<div style="${box}background:#94a3b8"></div>` : `<div style="${box}backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);background:rgba(148,163,184,.25)"></div>`)
        break
      }
      case 'number':
      case 'icon': {
        const d = scaled(clampCss(BADGE[size]), scaleOf(a))
        const inner = a.type === 'icon' ? iconSvg(a.icon ?? '', inkOn(a.color), 'width:64%;height:64%') : `<span style="font-size:calc(${d} * .5);line-height:1">${esc(a.text ?? '')}</span>`
        html.push(
          `<span style="position:absolute;left:${pct(a.x)};top:${pct(a.y)};transform:translate(-50%,-50%);width:${d};height:${d};border-radius:9999px;background:${c};color:${inkOn(a.color)};display:flex;align-items:center;justify-content:center;font-weight:900;border:2px solid ${a.color === 'white' ? '#0f172a' : '#ffffff'};box-shadow:0 2px 6px rgba(0,0,0,.35);pointer-events:none">${inner}</span>`,
        )
        if (a.type === 'icon' && a.text) label(a, a.x, a.y + 0.06 * scaleOf(a), 'below')
        break
      }
      case 'text':
        if (a.text) label(a, a.x, a.y, 'center')
        break
    }
  }

  const defs = [...markers]
    .map((color) => `<marker id="${idPrefix}-ah-${color}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${colorOf(color)}"/></marker>`)
    .join('')
  const svgBlock = svg.length ? `<svg viewBox="0 0 1000 ${n(H)}" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none" aria-hidden="true">${defs ? `<defs>${defs}</defs>` : ''}${svg.join('')}</svg>` : ''
  return svgBlock + html.join('')
}
