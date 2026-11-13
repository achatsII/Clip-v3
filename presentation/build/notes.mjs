// Ajoute les notes du présentateur (slides.mjs) au .json dérivé par html-to-json.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const hosted = JSON.parse(fs.readFileSync(path.join(HERE, 'hosted.json'), 'utf8'))
globalThis.IMG = (f) => hosted[f] || f
globalThis.TARGETS = JSON.parse(fs.readFileSync(path.join(HERE, 'targets.json'), 'utf8'))
const { slides } = await import('./slides.mjs')
const file = process.argv[2]
const j = JSON.parse(fs.readFileSync(file, 'utf8'))
if (j.slides.length !== slides.length) throw new Error(`${j.slides.length} slides dans le JSON, ${slides.length} dans le deck`)
j.slides.forEach((s, i) => { s.notes = slides[i].notes })
fs.writeFileSync(file, JSON.stringify(j, null, 2))
console.log(`notes ajoutées à ${j.slides.length} slides`)
