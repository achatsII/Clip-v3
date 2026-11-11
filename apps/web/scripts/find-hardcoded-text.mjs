#!/usr/bin/env node
/**
 * Trouve le texte écrit en dur dans les écrans (src/app, src/components) : il doit vivre dans les
 * dictionnaires de src/lib/i18n. Signale les chaînes avec des lettres accentuées, une apostrophe
 * typographique ou des guillemets français, les attributs lus par une personne (aria-label, title,
 * placeholder, alt, label) écrits en toutes lettres, et le texte entre deux balises.
 * Une ligne voulue (une consigne donnée au modèle, par exemple) se marque `// i18n-ignore`.
 *
 * Usage : node scripts/find-hardcoded-text.mjs [fichiers ou dossiers…]   (défaut : src/app src/components)
 * Sort en code 1 s'il trouve quelque chose.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const EXCLUDED = [/src\/lib\/i18n\//, /src\/components\/player\/i18n\.ts$/]
const FRENCH = /[àâçéèêëîïôûùüÿœÀÂÇÉÈÊËÎÏÔÛÙÜŸŒ’«»]/
const ATTR = /\b(aria-label|title|placeholder|alt|label)=("([^"]*[A-Za-z]{2}[^"]*)"|'([^']*[A-Za-z]{2}[^']*)')/
const ALLOWED_WORDS = /^(CLIP|PDF|QR|JSON|SVG|HTML|OK|II|EPI|PPE|SST|iOS|Android|AI|IA)$/

function files(target) {
  const st = statSync(target)
  if (st.isFile()) return /\.(tsx?|mjs)$/.test(target) ? [target] : []
  return readdirSync(target).flatMap((n) => files(join(target, n)))
}

/** Retire les commentaires en gardant les lignes (et les chaînes intactes). */
function stripComments(src) {
  let out = ''
  let i = 0
  let quote = null
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (quote) {
      out += c
      if (c === '\\') {
        out += n ?? ''
        i += 2
        continue
      }
      if (c === quote) quote = null
      i++
      continue
    }
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (c === '/' && n === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') out += '\n'
        i++
      }
      i += 2
      continue
    }
    if (c === "'" || c === '"' || c === '`') quote = c
    out += c
    i++
  }
  return out
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['src/app', 'src/components']
const found = []
for (const file of targets.flatMap(files)) {
  if (EXCLUDED.some((r) => r.test(file))) continue
  const raw = readFileSync(file, 'utf8').split('\n')
  const lines = stripComments(readFileSync(file, 'utf8')).split('\n')
  lines.forEach((line, i) => {
    if (raw[i]?.includes('i18n-ignore')) return
    const t = line.trim()
    const words = (text) => text.split(/\s+/).some((w) => /[A-Za-z]{3,}/.test(w) && !ALLOWED_WORDS.test(w.replace(/[^A-Za-z]/g, '')))
    const jsx = file.endsWith('.tsx')
    const hit =
      FRENCH.test(line) ||
      ATTR.test(line) ||
      // Du texte entre deux balises sur la même ligne : <b>Texte</b>, <p>Texte {x}</p>.
      (jsx &&
        [...line.matchAll(/(?<![=\-])>([^<>{}]*)(?=<|\{)/g)].some((m) => {
          const text = m[1].trim()
          if (!text || /[?:()=&|'"`;]/.test(text) || /^[-+*/%.\d\s·×—–$,]*$/.test(text)) return false
          return words(text)
        })) ||
      // Une ligne de texte seule entre deux balises (enfant JSX sur plusieurs lignes).
      (jsx && /^[A-Za-z’!?;%«»\- ][A-Za-z’.,!?;%«»\- ]*$/.test(t) && !t.endsWith(',') && !/^[A-Za-z0-9_$]+$/.test(t) && !/^(else|try|finally|break|continue|return|default|async|await)\b/.test(t) && words(t))
    if (hit) found.push(`${relative(process.cwd(), file)}:${i + 1}: ${raw[i].trim().slice(0, 160)}`)
  })
}
for (const f of found) console.log(f)
if (found.length) {
  console.error(`\n${found.length} ligne(s) de texte écrit en dur.`)
  process.exit(1)
}
