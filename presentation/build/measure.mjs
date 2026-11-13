// Mesure les cibles du curseur ([data-t] dans chaque .mk[data-mk]) et prend des captures à des instants donnés.
// node build/measure.mjs measure                → build/targets.json
// node build/measure.mjs shots 4:1.5,4:9 ...    → captures dans $SHOTS (slide:temps)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const require = createRequire(import.meta.url)
let pw
try { pw = require('playwright') } catch { pw = require(path.join(process.env.PW_PATH || '/usr/lib/node_modules', 'playwright')) }

const mode = process.argv[2]
const page0 = path.join(ROOT, 'apercu-local.html')
const browser = await pw.chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
await page.goto('file://' + page0)
await page.waitForTimeout(800)

if (mode === 'measure') {
  await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' })
  const out = await page.evaluate(() => {
    const res = {}
    const slides = document.querySelectorAll('.slide')
    slides.forEach((sl, i) => {
      sl.classList.add('active')
      sl.style.display = 'grid'
      sl.querySelectorAll('.mk[data-mk]').forEach((mk) => {
        const k = parseFloat(mk.dataset.k || '1')
        const r0 = mk.getBoundingClientRect()
        const o = (res[mk.dataset.mk] = {})
        mk.querySelectorAll('[data-t]').forEach((el) => {
          const r = el.getBoundingClientRect()
          o[el.dataset.t] = [Math.round((r.left + r.width / 2 - r0.left) / k), Math.round((r.top + r.height / 2 - r0.top) / k)]
        })
      })
      sl.classList.remove('active')
      sl.style.display = ''
    })
    return res
  })
  fs.writeFileSync(path.join(HERE, 'targets.json'), JSON.stringify(out, null, 1))
  console.log('targets', Object.keys(out).map((k) => `${k}:${Object.keys(out[k]).length}`).join(' '))
} else if (mode === 'shots') {
  const dir = process.env.SHOTS || path.join(ROOT, 'shots')
  fs.mkdirSync(dir, { recursive: true })
  const list = process.argv.slice(3).join(',').split(',').filter(Boolean)
  for (const item of list) {
    const [n, t] = item.split(':').map(Number)
    await page.evaluate((i) => { goToSlide(i) }, n - 1)
    await page.waitForTimeout(250)
    await page.evaluate((ms) => {
      const sl = document.querySelectorAll('.slide')[currentSlide - 1]
      document.getAnimations().forEach((a) => {
        const el = a.effect && a.effect.target
        if (!el || !sl.contains(el)) return
        a.pause()
        a.currentTime = ms
      })
    }, t * 1000)
    await page.waitForTimeout(120)
    const f = path.join(dir, `s${String(n).padStart(2, '0')}-${String(t).replace('.', '_')}.jpg`)
    await page.screenshot({ path: f, type: 'jpeg', quality: 80 })
    console.log(f)
  }
}
await browser.close()
