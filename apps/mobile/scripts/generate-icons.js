#!/usr/bin/env node
/**
 * Génère l'icône, l'icône adaptative Android, l'écran de démarrage et le favicon de la coquille :
 * un dégradé bleu II (#00C6FF → #0078FF, 135°) et un « C » blanc. Node pur (zlib), sans dépendance.
 *
 *   node scripts/generate-icons.js
 */
const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')

const OUT = path.resolve(__dirname, '..', 'assets')
const FROM = [0x00, 0xc6, 0xff]
const TO = [0x00, 0x78, 0xff]
const SAMPLES = 4 // suréchantillonnage 4×4 pour des bords lisses

// --- PNG -------------------------------------------------------------------------------------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** `opaque` : PNG sans canal alpha (l'icône de l'App Store ne doit pas en avoir). */
function encodePng(width, height, rgba, opaque = false) {
  const channels = opaque ? 3 : 4
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // profondeur
  ihdr[9] = opaque ? 2 : 6 // RGB ou RGBA
  const stride = width * channels + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0 // filtre « aucun »
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < channels; c++) raw[y * stride + 1 + x * channels + c] = rgba[(y * width + x) * 4 + c]
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Formes ----------------------------------------------------------------------------------
/** Le « C » : un anneau ouvert à droite, aux extrémités arrondies. Coordonnées de 0 à 1. */
function inC(x, y, { cx = 0.5, cy = 0.5, outer, inner, gapDeg = 42 }) {
  const dx = x - cx
  const dy = y - cy
  const d = Math.hypot(dx, dy)
  const mid = (outer + inner) / 2
  const halfStroke = (outer - inner) / 2
  const gap = (gapDeg * Math.PI) / 180
  const angle = Math.atan2(dy, dx)
  if (d >= inner && d <= outer && Math.abs(angle) >= gap) return true
  // extrémités arrondies
  for (const a of [gap, -gap]) {
    const ex = cx + Math.cos(a) * mid
    const ey = cy + Math.sin(a) * mid
    if (Math.hypot(x - ex, y - ey) <= halfStroke) return true
  }
  return false
}

/** Carré à coins arrondis (squircle simple), coordonnées de 0 à 1. */
function inRoundedSquare(x, y, inset, radius) {
  const min = inset
  const max = 1 - inset
  if (x < min || x > max || y < min || y > max) return false
  const rx = Math.min(Math.max(x, min + radius), max - radius)
  const ry = Math.min(Math.max(y, min + radius), max - radius)
  return Math.hypot(x - rx, y - ry) <= radius
}

function gradientAt(x, y) {
  const t = Math.min(1, Math.max(0, (x + y) / 2))
  return FROM.map((c, i) => Math.round(c + (TO[i] - c) * t))
}

/**
 * Rend une image : `background` (gradient | transparent | tile) et un « C » blanc optionnel.
 */
function render(size, { background, c, tile, opaque = false }) {
  const rgba = Buffer.alloc(size * size * 4)
  const step = 1 / SAMPLES
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bgCover = 0
      let cCover = 0
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px + (sx + 0.5) * step) / size
          const y = (py + (sy + 0.5) * step) / size
          const inBg =
            background === 'gradient' || (background === 'tile' && inRoundedSquare(x, y, tile.inset, tile.radius))
          if (inBg) bgCover++
          if (c && inC(x, y, c)) cCover++
        }
      }
      const n = SAMPLES * SAMPLES
      const bgA = bgCover / n
      const cA = cCover / n
      const [gr, gg, gb] = gradientAt(px / size, py / size)
      // Composition : le C blanc par-dessus le fond.
      const outA = cA + bgA * (1 - cA)
      const mix = (bgChannel) => (outA === 0 ? 0 : (255 * cA + bgChannel * bgA * (1 - cA)) / outA)
      const i = (py * size + px) * 4
      rgba[i] = Math.round(mix(gr))
      rgba[i + 1] = Math.round(mix(gg))
      rgba[i + 2] = Math.round(mix(gb))
      rgba[i + 3] = Math.round(outA * 255)
    }
  }
  return encodePng(size, size, rgba, opaque)
}

const BIG_C = { outer: 0.31, inner: 0.19 }
const SAFE_C = { outer: 0.21, inner: 0.13 } // dans la zone sûre (66 %) de l'icône adaptative

const outputs = [
  ['icon.png', 1024, { background: 'gradient', c: BIG_C, opaque: true }],
  ['android-icon-background.png', 1024, { background: 'gradient', opaque: true }],
  ['android-icon-foreground.png', 1024, { background: 'transparent', c: SAFE_C }],
  ['android-icon-monochrome.png', 1024, { background: 'transparent', c: SAFE_C }],
  ['splash-icon.png', 512, { background: 'tile', tile: { inset: 0.06, radius: 0.22 }, c: { outer: 0.27, inner: 0.165 } }],
  ['favicon.png', 48, { background: 'gradient', c: BIG_C, opaque: true }],
]

fs.mkdirSync(OUT, { recursive: true })
for (const [name, size, spec] of outputs) {
  fs.writeFileSync(path.join(OUT, name), render(size, spec))
  console.log(`assets/${name} (${size}×${size})`)
}
