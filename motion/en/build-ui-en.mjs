// Écrit motion/en/clips/_ui.js et _ui-*.js : les écrans de l'app du film anglais. Ce sont les écrans du film français
// (motion/clips/_ui*.js, tirés du deck par motion/build-ui.mjs), où chaque texte français devient le vrai libellé
// anglais de l'app (ui-en.mjs : la table, avec la source de chaque libellé). Mise en page, styles, icônes et images
// restent ceux du film français : les deux versions montrent exactement les mêmes écrans.
//   node motion/en/build-ui-en.mjs
// Échoue (code 1) si un texte français des écrans n'est pas dans la table : rien de français ne passe dans le film.
// À relancer après `node motion/build-ui.mjs` si les écrans du film français changent.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TEXTS, MEMES, CSS_TEXTS } from './ui-en.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FR = path.resolve(HERE, '..', 'clips')
const OUT = path.join(HERE, 'clips')

const MAP = new Map(TEXTS.map(([fr, en]) => [fr, en]))
const SAME = new Set(MEMES)
const textNodes = (html) => {
  const h = html.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  const out = []; const re = />([^<]+)</g; let m
  while ((m = re.exec(h))) { const t = m[1].trim(); if (t) out.push(t) }
  const at = /\btitle="([^"]+)"/g
  while ((m = at.exec(h))) out.push(m[1])
  return out
}
// un nœud de texte entier (espaces autour gardés) ou un attribut title : jamais un morceau de mot ou de balise
const translate = (html, used) =>
  html
    .replace(/>([^<]+)</g, (m, t) => {
      const k = t.trim()
      if (!k || !MAP.has(k)) return m
      used.add(k)
      return '>' + t.replace(k, MAP.get(k)) + '<'
    })
    .replace(/\btitle="([^"]+)"/g, (m, t) => (MAP.has(t) ? (used.add(t), `title="${MAP.get(t)}"`) : m))

const used = new Set(); const missing = new Map(); let n = 0
fs.mkdirSync(OUT, { recursive: true })
for (const f of fs.readdirSync(FR).filter((f) => /^_ui(-[\w]+)?\.js$/.test(f)).sort()) {
  const src = fs.readFileSync(path.join(FR, f), 'utf8')
  if (f === '_ui.js') {   // les styles du deck et le logo : seuls les textes des compteurs CSS changent
    let out = src.replace('// GÉNÉRÉ par motion/build-ui.mjs depuis presentation/build', '// GÉNÉRÉ par motion/en/build-ui-en.mjs depuis motion/clips/_ui.js (version anglaise)')
    for (const [fr, en] of CSS_TEXTS) {
      if (!out.includes(fr)) { console.error(`CSS « ${fr} » introuvable dans _ui.js`); process.exit(1) }
      out = out.split(fr).join(en)
    }
    fs.writeFileSync(path.join(OUT, f), out); n++
    continue
  }
  const m = src.match(/^UI\[("[\w-]+")\]=(".*");\s*$/s)
  if (!m) { console.error(`${f} : format inattendu`); process.exit(1) }
  const key = JSON.parse(m[1]); const html = JSON.parse(m[2])
  const en = translate(html, used)
  for (const t of textNodes(en)) {   // ce qui reste : un texte inchangé qui n'est ni dans la table ni « pareil en anglais »
    if (MAP.has(t)) continue
    if (!SAME.has(t) && textNodes(html).includes(t) && !TEXTS.some(([, e]) => e === t)) missing.set(t, (missing.get(t) || new Set()).add(key))
  }
  fs.writeFileSync(path.join(OUT, f), `UI[${JSON.stringify(key)}]=${JSON.stringify(en)};\n`); n++
}
const unused = TEXTS.filter(([fr]) => !used.has(fr)).map(([fr]) => fr)
if (unused.length) console.log(`NOTE ${unused.length} entrée(s) de la table sans texte correspondant : ${unused.join(' | ')}`)
if (missing.size) {
  for (const [t, ks] of missing) console.error(`NON_TRADUIT « ${t} » (${[...ks].join(', ')}) : ajoute-le à ui-en.mjs avec sa source`)
  process.exit(1)
}
console.log(`UI_EN ${n} fichiers écrits dans ${path.relative(process.cwd(), OUT) || OUT} · ${used.size} textes traduits · aucun texte français restant`)
