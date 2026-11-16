// Refait les icônes fixes de CLIP à partir du logo choisi (`BRAND_MARK`, src/lib/brand/marks.ts) et de la
// couleur par défaut (src/lib/brand/colors.ts) : le favicon et l'icône d'accueil du web, les icônes de
// l'app mobile. Depuis apps/web : `npm run brand-icons`. Il faut Node 22.18+ (il lit les modules .ts tels
// quels) et Playwright (préinstallé dans les sessions Claude). Les icônes de l'app mobile ne changent
// qu'à la prochaine build native (EAS) ; l'iPhone et Android arrondissent eux-mêmes l'icône carrée.
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { BRAND } from '../src/lib/brand/colors.ts'
import { iconSvg, markOf } from '../src/lib/brand/marks.ts'

const web = join(dirname(fileURLToPath(import.meta.url)), '..')
const mobile = join(web, '..', 'mobile', 'assets')
const colors = { from: BRAND.from, to: BRAND.to }

const square = iconSvg({ ...colors, shape: 'square' })
const rounded = iconSvg({ ...colors, shape: 'rounded' })
// Android : le symbole seul, dans la zone sûre de l'icône adaptative (le système découpe le tour).
const markOnly = iconSvg({ ...colors, shape: 'none', markScale: 0.7 })
const gradientOnly = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colors.from}"/><stop offset="1" stop-color="${colors.to}"/></linearGradient></defs><rect width="100" height="100" fill="url(#bg)"/></svg>`
// L'écran de démarrage : l'icône arrondie, avec de l'air autour.
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${rounded.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">', '<svg x="6" y="6" width="88" height="88" viewBox="0 0 100 100">')}</svg>`

const targets = [
  { file: join(web, 'public', 'apple-touch-icon.png'), size: 180, svg: square, alpha: false },
  { file: join(mobile, 'icon.png'), size: 1024, svg: square, alpha: false },
  { file: join(mobile, 'favicon.png'), size: 48, svg: square, alpha: false },
  { file: join(mobile, 'android-icon-background.png'), size: 1024, svg: gradientOnly, alpha: false },
  { file: join(mobile, 'android-icon-foreground.png'), size: 1024, svg: markOnly, alpha: true },
  { file: join(mobile, 'android-icon-monochrome.png'), size: 1024, svg: markOnly, alpha: true },
  { file: join(mobile, 'splash-icon.png'), size: 512, svg: splash, alpha: true },
]

// Un PNG sans dépendance : l'App Store refuse une icône qui a une couche alpha, même opaque.
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function png(rgba, size, alpha) {
  const bpp = alpha ? 4 : 3
  const row = size * bpp + 1
  const raw = Buffer.alloc(row * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4
      const o = y * row + 1 + x * bpp
      raw[o] = rgba[s]
      raw[o + 1] = rgba[s + 1]
      raw[o + 2] = rgba[s + 2]
      if (alpha) raw[o + 3] = rgba[s + 3]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = alpha ? 6 : 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

const { chromium } = createRequire(import.meta.url)('playwright')
const browser = await chromium.launch()
const page = await browser.newPage()
writeFileSync(join(web, 'public', 'icon.svg'), rounded + '\n')
console.log(`logo ${markOf().n} « ${markOf().name} » → public/icon.svg`)
for (const t of targets) {
  const b64 = await page.evaluate(async ({ svg, size }) => {
    const img = new Image()
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, size, size)
    const data = ctx.getImageData(0, 0, size, size).data
    let bin = ''
    for (let i = 0; i < data.length; i += 0x8000) bin += String.fromCharCode.apply(null, data.subarray(i, i + 0x8000))
    return btoa(bin)
  }, t)
  writeFileSync(t.file, png(Buffer.from(b64, 'base64'), t.size, t.alpha))
  console.log(`${t.size}×${t.size}${t.alpha ? '' : ' (opaque)'} → ${t.file.replace(join(web, '..'), 'apps')}`)
}
await browser.close()
