// Rend les écrans à incruster dans les photos (screen_composite.py plongee, 2e passage) :
//   ecran-tablette.png : le lecteur pas-à-pas, étape 2 (tablette du poste, 1280 × 772)
//   ecran-telephone.png : la caméra de Clip qui filme (téléphone en paysage, 844 × 398)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const OUT = process.argv[2] || path.join(ROOT, '..', 'motion', 'work')
globalThis.IMG = (f) => 'file://' + path.join(ROOT, 'assets', f)
const { ic } = await import('./lib.mjs')
const { playerFrame, PLAYER_CSS, STEPS } = await import('./ui.mjs')
const css = fs.readFileSync(path.join(HERE, 'styles.css'), 'utf8')
const font = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">'
const doc = (w, h, body, extra = '') => `<!doctype html><html><head><meta charset="utf-8">${font}<style>${css}${PLAYER_CSS}${extra} html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden} .sf-canvas{position:relative;width:${w}px;height:${h}px;overflow:hidden}</style></head><body><div class="sf-canvas">${body}</div></body></html>`

const s = STEPS[1]
const tablette = doc(1280, 772, playerFrame({ states: [{ stepOf: 'Étape 2 sur 5', n: 2, t: s.t, img: s.img, w: s.w, text: s.text, kp: s.kp }], header: { progStyle: 'width:40%' } }))

const cam = doc(
  844,
  398,
  `<div style="position:absolute;inset:0;background:#000">
    <div style="position:absolute;inset:0;background:url(${IMG('live-jacques.jpg')}) center/cover"></div>
    <div style="position:absolute;left:0;right:0;top:0;height:74px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;background:linear-gradient(180deg,rgba(0,0,0,.45),rgba(0,0,0,0))">
      <span style="width:44px;height:44px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.12);color:#fff;backdrop-filter:blur(12px)">${ic('x', 22)}</span>
      <span style="display:flex;align-items:center;gap:8px;border-radius:99px;background:#f43f5e;color:#fff;padding:8px 16px;font-size:15px;font-weight:900;font-variant-numeric:tabular-nums"><span style="width:10px;height:10px;border-radius:99px;background:#fff"></span>02:14</span>
      <span style="display:flex;padding:4px;border-radius:16px;background:rgba(255,255,255,.12);backdrop-filter:blur(12px)"><span style="display:flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:12px;color:rgba(255,255,255,.8);font-size:13px;font-weight:900">${ic('camera', 15)} Photo</span><span style="display:flex;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:12px;background:#fff;color:#0f172a;font-size:13px;font-weight:900">${ic('video', 15)} Vidéo</span></span>
    </div>
    <span style="position:absolute;right:26px;top:50%;margin-top:-36px;width:72px;height:72px;border-radius:99px;border:4px solid #fff;background:#f43f5e;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 10px rgba(255,43,94,.25)"><span style="width:26px;height:26px;border-radius:7px;background:#fff"></span></span>
    <p style="position:absolute;left:0;right:0;bottom:12px;text-align:center;color:rgba(255,255,255,.85);font-size:12px;font-weight:700">720p · environ 19 Mo la minute · 10 min au plus</p>
  </div>`,
)

const require = createRequire(import.meta.url)
const pw = require('playwright')
const b = await pw.chromium.launch()
for (const [name, html, w, h] of [['ecran-tablette', tablette, 1280, 772], ['ecran-telephone', cam, 844, 398]]) {
  const file = path.join(OUT, `${name}.html`)
  fs.writeFileSync(file, html)
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
  await p.goto('file://' + file)
  await p.waitForTimeout(900)
  await p.screenshot({ path: path.join(OUT, `${name}.png`) })
  await p.close()
  console.log(path.join(OUT, `${name}.png`))
}
await b.close()
