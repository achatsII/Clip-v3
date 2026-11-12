// Écrit motion/clips/_ui.js : les écrans de l'app, repris tels quels des maquettes du deck
// (presentation/build/slides.mjs), pour que la vidéo et le deck montrent exactement la même interface.
// Les animations CSS du deck sont coupées dans la vidéo : chaque changement d'état y est piloté par le
// moteur (fonction pure du temps), image par image.
//   node motion/build-ui.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DECK = path.resolve(HERE, '..', 'presentation', 'build')
globalThis.IMG = (f) => `assets/${f}`
globalThis.TARGETS = JSON.parse(fs.readFileSync(path.join(DECK, 'targets.json'), 'utf8'))
const { slides } = await import(path.join(DECK, 'slides.mjs'))
const { PLAYER_CSS, playerFrame, STEPS } = await import(path.join(DECK, 'ui.mjs'))
const { ic, logoMark } = await import(path.join(DECK, 'lib.mjs'))

/** Le premier <div> dont l'attribut class contient `cls` (mot entier), avec tout son contenu. */
function pick(html, cls, inner = false) {
  const re = new RegExp(`<div class="([^"]*\\b${cls}\\b[^"]*)"`, 'g')
  const m = re.exec(html)
  if (!m) throw new Error(`div .${cls} introuvable`)
  const start = m.index
  let depth = 0
  const tag = /<div\b|<\/div>/g
  tag.lastIndex = start
  let t
  while ((t = tag.exec(html))) {
    depth += t[0] === '</div>' ? -1 : 1
    if (depth === 0) {
      const whole = html.slice(start, t.index + 6)
      if (!inner) return whole
      return whole.slice(whole.indexOf('>') + 1, -6)
    }
  }
  throw new Error(`div .${cls} non refermé`)
}
const noCursor = (h) => h.replace(/<div class="cur [^"]*"[^>]*>[\s\S]*?<\/span><\/span><\/div>/g, '')
const S = (n) => slides[n - 1]

const UI = {
  capture: noCursor(pick(S(4).html, 'mk', true)), // fenêtre « Nouvelle instruction » + paquet de fichiers
  gen: pick(S(5).html, 'gp'), // « L'IA rédige votre instruction »
  result: pick(S(5).html, 'res'), // l'instruction générée
  tablet: noCursor(pick(S(6).html, 'mk', true)), // lecteur pas-à-pas dans la tablette (étapes 2 → 3)
  agent: noCursor(pick(S(7).html, 'mk', true)), // éditeur + assistant
  annot: noCursor(pick(S(8).html, 'mk', true)), // annoter l'image
  phoneLang: pick(S(9).html, 'phone'), // le lecteur traduit (téléphone)
  importWin: noCursor(pick(S(10).html, 'mk', true)), // import en lot
  approve: noCursor(pick(S(11).html, 'mk', true)), // approuver et publier
  qr: pick(S(12).html, 'qc'), // le poste et son code QR
  pdf: noCursor(pick(S(14).html, 'mk', true)), // export PDF
  pdfPage: pick(S(14).html, 'page'), // la page imprimée seule
  pdfFile: pick(S(14).html, 'file'), // « Nettoyage-des-rails-M1234.pdf · Enregistré »
  // Le lecteur à l'étape 1 (danger, cadenas) et à l'étape 3 (huile) : écran de tablette seul, 1116 × 716
  player1: playerFrame({ states: [{ stepOf: 'Étape 1 sur 5', n: 1, ...STEPS[0], media: '<div class="vslot" id="vs1"></div>' }], header: { progStyle: 'width:20%' } }),
  player3: playerFrame({ states: [{ stepOf: 'Étape 3 sur 5', n: 3, ...STEPS[2], media: '<div class="vslot" id="vs3"></div>' }], header: { progStyle: 'width:60%' } }),
  logo: (n) => logoMark(n),
}
// la caméra de Clip dans le téléphone (paysage), à la taille de l'écran incrusté (ratio 2,12)
UI.cam = `<div class="camui">
  <div class="cv" style="background-image:url(assets/live-jacques.jpg)"></div>
  <div class="ctop"><span class="cx">${ic('x', 30)}</span>
    <span class="crec"><i></i><b id="camT">02:10</b></span>
    <span class="cseg"><span>${ic('camera', 22)} Photo</span><span class="on">${ic('video', 22)} Vidéo</span></span></div>
  <span class="cstop" id="camStop"><i></i></span>
  <p class="chint">720p · environ 19 Mo la minute · 10 min au plus</p></div>`

const vars = `:root{--primary:#0078ff;--primary-strong:#0056d6;--primary-soft:#e5f1ff;--grad:linear-gradient(135deg,#00c6ff 0%,#0078ff 100%);--grad-ai:linear-gradient(135deg,#9b2cfa 0%,#2c62fa 100%);--sh-p:0 10px 20px rgba(0,120,255,.3);--sh-a:0 10px 20px rgba(155,44,250,.3);--ease:cubic-bezier(.16,1,.3,1);--pop:cubic-bezier(.34,1.56,.64,1)}`
const extra = `
#stage *,#stage *::before,#stage *::after{box-sizing:border-box;animation:none!important;transition:none!important}
#stage p,#stage h1,#stage h2,#stage h3,#stage ul,#stage ol{margin:0;padding:0}
#stage li{list-style:none}
.ui{position:absolute;font-family:'Inter',system-ui,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased}
.ui .win{box-shadow:none}
.ui .row{position:static}
.vslot{position:absolute;inset:0;overflow:hidden}
.camui{position:absolute;inset:0;background:#000;overflow:hidden;color:#fff;font-family:'Inter',system-ui,sans-serif}
.camui .cv{position:absolute;inset:0;background-size:cover;background-position:center}
.camui .ctop{position:absolute;left:0;right:0;top:0;height:112px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:linear-gradient(180deg,rgba(0,0,0,.5),rgba(0,0,0,0))}
.camui .cx{width:66px;height:66px;border-radius:24px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.14)}
.camui .crec{display:flex;align-items:center;gap:12px;border-radius:99px;background:#f43f5e;padding:12px 24px;font-size:23px;font-weight:900;font-variant-numeric:tabular-nums}
.camui .crec i{width:15px;height:15px;border-radius:99px;background:#fff}
.camui .cseg{display:flex;padding:6px;border-radius:24px;background:rgba(255,255,255,.14)}
.camui .cseg span{display:flex;align-items:center;gap:8px;height:54px;padding:0 20px;border-radius:18px;font-size:20px;font-weight:900;color:rgba(255,255,255,.8)}
.camui .cseg span.on{background:#fff;color:#0f172a}
.camui .cstop{position:absolute;right:40px;top:50%;margin-top:-56px;width:112px;height:112px;border-radius:99px;border:6px solid #fff;background:#f43f5e;display:flex;align-items:center;justify-content:center}
.camui .cstop i{width:40px;height:40px;border-radius:10px;background:#fff}
.camui .chint{position:absolute;left:0;right:0;bottom:18px;text-align:center;font-size:18px;font-weight:700;color:rgba(255,255,255,.85)}
`
const deckCss = fs.readFileSync(path.join(DECK, 'styles.css'), 'utf8').replace(/@media print \{[\s\S]*$/, '')
const slideCss = [4, 5, 6, 7, 8, 9, 10, 11, 12, 14].map((n) => S(n).css.replace(/@keyframes c\d+-[mpro]\{[\s\S]*?\}\}/g, '')).join('\n')
const css = vars + deckCss.replace(/\.sf-canvas/g, '.ui') + PLAYER_CSS + slideCss + extra

// Images : un repère %nom% à la place de chaque url(assets/…) ; ui() (dans _shared.js) les remplace par la
// vignette déclarée une fois par scène, ou par la grande image que la scène demande.
for (const k of Object.keys(UI)) if (typeof UI[k] === 'string') UI[k] = UI[k].replace(/url\((?:&quot;|")?assets\/([a-z-]+)\.jpg(?:&quot;|")?\)/g, 'url(%$1%)')
const strings = Object.fromEntries(Object.entries(UI).filter(([, v]) => typeof v === 'string'))
const head = `// GÉNÉRÉ par motion/build-ui.mjs depuis presentation/build (ne pas modifier à la main).
const UI_CSS=${JSON.stringify(css)};
const UI={};
const UI_LOGO=(n)=>${JSON.stringify(logoMark(64))}.replace('width="64" height="64"','width="'+n+'" height="'+n+'"');
`
fs.writeFileSync(path.join(HERE, 'clips', '_ui.js'), head)
// un fichier par écran : chaque scène n'inclut que les siens (la page de chaque scène reste légère)
for (const [k, v] of Object.entries(strings)) fs.writeFileSync(path.join(HERE, 'clips', `_ui-${k}.js`), `UI[${JSON.stringify(k)}]=${JSON.stringify(v)};\n`)
console.log(`clips/_ui.js · ${(head.length / 1024).toFixed(0)} Ko + ${Object.keys(strings).length} écrans (_ui-*.js)`)
