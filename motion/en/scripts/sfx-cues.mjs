// Relève les effets sonores que chaque scène déclare (SFX(...) dans clips/NN-*.html, aux mêmes instants que son image)
// et les place sur la ligne de temps du film → work/sfx-cues.json, que scripts/sfx-mix.py mélange à la voix.
//   node scripts/sfx-cues.mjs            (depuis motion/ ; construit d'abord des pages légères dans work/sonde)
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SK = process.env.SKILL || ''
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan.json'), 'utf8'))
const sonde = path.join(ROOT, 'work', 'sonde')
fs.mkdirSync(sonde, { recursive: true })
const htmls = plan.scenes.map((s) => path.join(ROOT, 'clips', path.basename(s.html)))  // s.html = la page construite (dist/…)
execFileSync('python3', [path.join(SK, 'engine', 'build.py'), sonde, ...htmls, '--timeline', path.join(ROOT, plan.timeline), '--plan', path.join(ROOT, 'plan.json'), '--stand-in'], { stdio: ['ignore', 'ignore', 'inherit'] })
const sounds = new Set(fs.readdirSync(path.join(ROOT, 'work', 'sfx')).map((f) => f.replace(/\.wav$/, '')))

const b = await chromium.launch()
const page = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const cues = [], notes = [], per = {}
for (const s of plan.scenes) {
  const f = path.join(sonde, path.basename(s.html))
  const errs = []
  page.removeAllListeners('pageerror'); page.on('pageerror', (e) => errs.push(e.message))
  await page.goto('file://' + f + '?render')
  const list = await page.evaluate(() => window.__SFX || [])
  if (errs.length) notes.push(`scène ${s.id} : erreur ${errs[0]}`)
  per[s.id] = list.length
  for (const [t, son, db = -12, o = {}] of list) {
    if (!sounds.has(son)) { notes.push(`scène ${s.id} : son « ${son} » inconnu`); continue }
    const T = +(s.in + t).toFixed(3)
    if (t < -1.0 || s.in + t > s.out + 0.05) notes.push(`scène ${s.id} : « ${son} » à ${t.toFixed(2)} s hors de la scène`)
    cues.push([T, son, db, o, s.id])
  }
}
await b.close()
cues.sort((a, b) => a[0] - b[0])
// deux sons identiques à moins de 40 ms : le second est retiré (deux scènes qui posent le même geste)
const out = cues.filter((c, i) => !cues.slice(0, i).some((d) => d[1] === c[1] && Math.abs(d[0] - c[0]) < 0.04))
fs.writeFileSync(path.join(ROOT, 'work', 'sfx-cues.json'), JSON.stringify(out, null, 0).replace(/\],\[/g, '],\n['))
const kinds = {}; for (const c of out) kinds[c[1]] = (kinds[c[1]] || 0) + 1
console.log(`SFX ${out.length} sons sur ${plan.scenes.at(-1).out.toFixed(1)} s · ` + Object.entries(per).map(([k, v]) => `${k}:${v}`).join(' '))
console.log('SFX ' + Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(', '))
for (const n of notes) console.log('NOTE ' + n)
