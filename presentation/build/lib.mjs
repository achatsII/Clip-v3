// Outils du générateur : icônes Lucide (celles de l'app), curseur animé, petites aides de mise en page.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const VENDOR = path.join(HERE, 'lucide')
const SOURCE = process.env.LUCIDE_DIR || ''

/** Une icône Lucide (ISC), en SVG en ligne. Les noms sont ceux de lucide-static (chart-column = BarChart3 de l'app). */
export function ic(name, size = 24, extra = '') {
  let file = path.join(VENDOR, `${name}.svg`)
  if (!fs.existsSync(file) && SOURCE) {
    const src = path.join(SOURCE, `${name}.svg`)
    if (!fs.existsSync(src)) throw new Error(`Icône introuvable : ${name}`)
    fs.copyFileSync(src, file)
  }
  if (!fs.existsSync(file)) throw new Error(`Icône introuvable : ${name}`)
  const inner = fs
    .readFileSync(file, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/\s*\n\s*/g, '')
  return `<svg class="ic ${extra}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
}

/** Le logo de l'app (LogoMark de src/components/Logo.tsx). Un id de dégradé unique par instance. */
let logoN = 0
export function logoMark(size = 40) {
  const id = `clipg${++logoN}`
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00C6FF"/><stop offset="1" stop-color="#0078FF"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="url(#${id})"/><path d="M41.5 22.5a13 13 0 1 0 0 19" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><circle cx="44" cy="32" r="4" fill="#fff"/></svg>`
}

const pct = (t, T) => `${Math.min(100, Math.max(0, (t / T) * 100)).toFixed(3)}%`

/**
 * Le curseur d'une scène : il se déplace d'un point à l'autre et clique (il s'enfonce, un anneau s'ouvre).
 * pts : [{t, x, y, click?}] en secondes et en pixels du repère de la maquette. T : durée totale de la séquence.
 * La pointe du curseur est au point (x, y). Rend { html, css }.
 */
export function cursor(name, T, pts, { kind = 'mouse', start = 0 } = {}) {
  const ease = 'cubic-bezier(.55,0,.2,1)'
  let move = `@keyframes ${name}-m{`
  pts.forEach((p) => {
    move += `${pct(p.t, T)}{transform:translate(${p.x}px,${p.y}px);animation-timing-function:${ease}}`
  })
  move += '}'
  const clicks = pts.filter((p) => p.click).map((p) => p.t)
  let press = `@keyframes ${name}-p{0%{transform:scale(1)}`
  let ring = `@keyframes ${name}-r{0%{opacity:0;transform:scale(.2)}`
  clicks.forEach((c) => {
    press += `${pct(c - 0.12, T)}{transform:scale(1)}${pct(c, T)}{transform:scale(.82)}${pct(c + 0.16, T)}{transform:scale(1)}`
    ring += `${pct(c - 0.01, T)}{opacity:0;transform:scale(.2)}${pct(c, T)}{opacity:.9;transform:scale(.3)}${pct(c + 0.45, T)}{opacity:0;transform:scale(1.5)}`
  })
  press += '100%{transform:scale(1)}}'
  ring += '100%{opacity:0;transform:scale(.2)}}'
  // Souris : apparaît au début et reste posée. Doigt : visible seulement autour de chaque toucher.
  let vis = `cur-in .35s ease-out ${start}s both`
  let op = ''
  if (kind === 'touch') {
    op = `@keyframes ${name}-o{0%{opacity:0}`
    clicks.forEach((c) => {
      op += `${pct(c - 0.38, T)}{opacity:0}${pct(c - 0.22, T)}{opacity:1}${pct(c + 0.3, T)}{opacity:1}${pct(c + 0.48, T)}{opacity:0}`
    })
    op += '100%{opacity:0}}'
    vis = `${name}-o ${T}s linear ${start}s both`
  }
  const first = pts[0]
  const css = `${move}${press}${ring}${op}
.${name}{animation:${name}-m ${T}s linear ${start}s both,${vis}}
.${name} .cur-body{animation:${name}-p ${T}s linear ${start}s both}
.${name} .cur-ring{animation:${name}-r ${T}s linear ${start}s both}`
  const body =
    kind === 'touch'
      ? `<span class="touch-dot"></span>`
      : `<svg class="cur-arrow" width="34" height="34" viewBox="0 0 24 24"><path d="M4.5 2.8 19 12.6l-6.4 1.3 3.9 7.2-2.9 1.5-3.8-7.3-4.4 4.6z" fill="#0f172a" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`
  const html = `<div class="cur ${name} ${kind === 'touch' ? 'is-touch' : ''}" style="transform:translate(${first.x}px,${first.y}px)"><span class="cur-ring"></span><span class="cur-body">${body}</span></div>`
  return { html, css }
}

/** Délai d'animation en ligne : d(1.2) → style="--d:1.2s". */
export const d = (s, more = '') => `style="--d:${s}s;${more}"`

/** Texte sûr pour le HTML. */
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
