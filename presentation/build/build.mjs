// Assemble le deck dans le gabarit Master HTML de SlideFabrik (build/gabarit.html, copie du skill).
// node build/build.mjs [--local]   --local : images lues dans presentation/assets (aperçu et captures)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const LOCAL = process.argv.includes('--local')
const OUT = process.argv.find((a) => a.startsWith('--out='))?.slice(6) || path.join(ROOT, LOCAL ? 'apercu-local.html' : 'Presentation-Clip.html')

// Images : chemin local ou URL hébergée (build/hosted.json).
const hosted = fs.existsSync(path.join(HERE, 'hosted.json')) ? JSON.parse(fs.readFileSync(path.join(HERE, 'hosted.json'), 'utf8')) : {}
globalThis.IMG = (file) => {
  if (LOCAL) return `assets/${file}`
  if (!hosted[file]) throw new Error(`Image non hébergée : ${file} (build/hosted.json)`)
  return hosted[file]
}
// Cibles du curseur mesurées dans le rendu (build/targets.json, écrit par measure.mjs).
globalThis.TARGETS = fs.existsSync(path.join(HERE, 'targets.json')) ? JSON.parse(fs.readFileSync(path.join(HERE, 'targets.json'), 'utf8')) : {}

const { slides } = await import('./slides.mjs')
const W = 1920, H = 1080
const TITLE = 'Clip — Le savoir-faire de vos experts, au poste'

let tpl = fs.readFileSync(path.join(HERE, 'gabarit.html'), 'utf8')
const css = fs.readFileSync(path.join(HERE, 'styles.css'), 'utf8') + '\n' + slides.map((s) => s.css || '').join('\n')
const body = slides
  .map((s, i) => {
    const n = i + 1
    if (/-/.test(s.label)) throw new Error(`Étiquette avec trait d'union : ${s.label}`)
    return `<!-- SLIDE ${n}: ${s.label} -->\n<div class="slide" id="slide-${n}" data-sf-label="${s.label}">\n  <div class="sf-canvas">\n${s.html}\n  </div>\n</div>`
  })
  .join('\n\n')

const startMarker = '<!-- SLIDE 1: COUVERTURE -->'
const a = tpl.indexOf(startMarker)
const endMarker = '<!-- Presenter chrome.'
const b0 = tpl.indexOf(endMarker)
const b = tpl.lastIndexOf('</div>', b0) // la fermeture de #sf-stage
if (a < 0 || b0 < 0) throw new Error('Gabarit inattendu')
tpl = tpl.slice(0, a) + body + '\n\n' + tpl.slice(b)

const N = slides.length
tpl = tpl
  .replace('<title>{{DECK_TITLE}}</title>', `<title>${TITLE}</title>\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">`)
  .replace('--sf-design-w: 1200px;', `--sf-design-w: ${W}px;`)
  .replace('--sf-design-h: 1200px;', `--sf-design-h: ${H}px;`)
  .replace('--sf-scale: 0.9; ', '--sf-scale: 1;   ')
  .replace('--sf-ref-ar: 1;  ', '--sf-ref-ar: 1.7778;')
  .replace('--sf-bg: #0B1020;', '--sf-bg: #0a0f18;')
  .replace('var W = 1200, H = 1200;', `var W = ${W}, H = ${H};`)
  .replace('/* {{DESIGN_CSS}} */', css)
  .replace('var totalSlides = 2;   /* {{TOTAL_SLIDES}} — must equal the number of SLIDE comments */', `var totalSlides = ${N};   /* must equal the number of SLIDE comments */`)
  .replace('<span id="current-slide-num">1</span> / 2</div>', `<span id="current-slide-num">1</span> / ${N}</div>`)

for (const left of ['{{', 'SLIDE_1_MARKUP']) if (tpl.includes(left)) throw new Error(`Marqueur restant : ${left}`)
fs.writeFileSync(OUT, tpl)
console.log(`${path.relative(ROOT, OUT)} · ${N} slides · ${(Buffer.byteLength(tpl) / 1024).toFixed(0)} Ko`)
