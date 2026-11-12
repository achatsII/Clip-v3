/**
 * Le texte d'un schéma de l'IA (une page HTML autonome) : ce qu'il faut traduire, et la page avec
 * sa traduction. On lit le texte des balises (SVG compris), quelques attributs lisibles (title, alt,
 * aria-label, placeholder) et, dans les scripts, les chaînes qui peuvent être des libellés (une vue
 * 3D écrit ses étiquettes dans son code). Le modèle ne traduit que les chaînes du code qui
 * s'affichent ; il rend les autres telles quelles, et elles ne changent pas. Le code, la mise en page
 * et le dessin ne changent jamais.
 */

export interface VisualText {
  text: string
  /** Une chaîne tirée du code : à traduire seulement si elle s'affiche comme libellé. */
  code: boolean
}

export interface VisualTexts {
  items: VisualText[]
  /** La page avec ces textes traduits, dans le même ordre ; un texte vide ou identique ne change rien. */
  apply(translated: string[]): string
}

const MAX_ITEMS = 120
const SKIP = 'script, style, noscript, template'
const READABLE = ['title', 'alt', 'aria-label', 'placeholder'] as const
/** Une chaîne de code : '…', "…" ou `…`, sur une ligne, échappements compris. */
const LITERAL = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g

const hasLetter = (s: string) => /\p{L}/u.test(s)

/**
 * Une chaîne du code qui peut être un libellé : des lettres, et une espace, une lettre accentuée ou
 * un mot qui commence par une majuscule. Pas une adresse, un sélecteur, un nom d'événement ou du code.
 */
export function looksLikeLabel(v: string): boolean {
  if (v.length < 2 || v.length > 120 || !hasLetter(v)) return false
  if (/:\/\/|^[#./]|^[a-z][a-z0-9-]*$|[{};=<>]|^\w+\(/.test(v)) return false
  return /\s/.test(v) || /[^\x00-\x7F]/.test(v) || /^\p{Lu}\p{Ll}{2,}$/u.test(v)
}

/** La valeur d'une chaîne de code ; null pour un échappement qu'on ne sait pas relire sans risque. */
function decode(raw: string): string | null {
  if (/\\(?![\\'"`nu])/.test(raw)) return null
  return raw.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|\\([\\'"`n])/g, (_, cp: string | undefined, u4: string | undefined, ch: string | undefined) =>
    cp ? String.fromCodePoint(parseInt(cp, 16)) : u4 ? String.fromCharCode(parseInt(u4, 16)) : ch === 'n' ? '\n' : (ch ?? ''),
  )
}

/** Une valeur réécrite en chaîne de code, entre les mêmes guillemets. */
function encode(v: string, q: string): string {
  let out = v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').split(q).join(`\\${q}`)
  if (q === '`') out = out.replace(/\$\{/g, '\\${')
  return out
}

interface Collected {
  items: VisualText[]
  setters: Array<((v: string) => void) | null>
  scripts: Array<{ el: Element; code: string; swaps: Array<{ q: string; raw: string; idx: number }> }>
}

/** Le texte à traduire, toujours dans le même ordre pour une même page. */
function collect(doc: Document): Collected {
  const out: Collected = { items: [], setters: [], scripts: [] }
  const add = (text: string, code: boolean, set: ((v: string) => void) | null) => {
    out.items.push({ text, code })
    out.setters.push(set)
  }
  const walker = doc.createTreeWalker(doc, 4 /* NodeFilter.SHOW_TEXT */)
  for (let n = walker.nextNode(); n && out.items.length < MAX_ITEMS; n = walker.nextNode()) {
    const parent = n.parentElement
    if (!parent || parent.closest(SKIP)) continue
    const raw = n.nodeValue ?? ''
    const text = raw.trim()
    if (!hasLetter(text)) continue
    const node = n
    const lead = raw.slice(0, raw.length - raw.trimStart().length)
    const trail = raw.slice(raw.trimEnd().length)
    add(text, false, (v) => (node.nodeValue = lead + v + trail))
  }
  for (const el of Array.from(doc.querySelectorAll(READABLE.map((a) => `[${a}]`).join(',')))) {
    if (el.closest(SKIP)) continue
    for (const a of READABLE) {
      const v = el.getAttribute(a)?.trim()
      if (v && hasLetter(v) && out.items.length < MAX_ITEMS) add(v, false, (x) => el.setAttribute(a, x))
    }
  }
  for (const el of Array.from(doc.querySelectorAll('script'))) {
    const code = el.textContent ?? ''
    const seen = new Set<string>()
    const swaps: Array<{ q: string; raw: string; idx: number }> = []
    for (const m of code.matchAll(LITERAL)) {
      const [, q, raw] = m
      if ((q === '`' && raw.includes('${')) || seen.has(q + raw)) continue
      seen.add(q + raw)
      const value = decode(raw)
      if (value === null || !looksLikeLabel(value) || out.items.length >= MAX_ITEMS) continue
      swaps.push({ q, raw, idx: out.items.length })
      add(value, true, null)
    }
    if (swaps.length) out.scripts.push({ el, code, swaps })
  }
  return out
}

function parse(html: string): Document | null {
  if (typeof DOMParser === 'undefined') return null
  return new DOMParser().parseFromString(html, 'text/html')
}

/** Le texte d'un schéma à traduire ; null hors d'un navigateur ou sans texte. */
export function visualTexts(html: string): VisualTexts | null {
  const first = parse(html)
  if (!first) return null
  const { items } = collect(first)
  if (!items.length) return null
  return {
    items,
    apply(translated) {
      const doc = parse(html)!
      const c = collect(doc)
      let changed = false
      c.items.forEach((it, i) => {
        const v = translated[i]?.trim()
        if (!v || v === it.text || it.code) return
        c.setters[i]?.(v)
        changed = true
      })
      for (const s of c.scripts) {
        let code = s.code
        for (const w of s.swaps) {
          const v = translated[w.idx]
          if (!v || v === c.items[w.idx].text) continue
          code = code.split(w.q + w.raw + w.q).join(w.q + encode(v, w.q) + w.q)
        }
        if (code !== s.code) {
          s.el.textContent = code
          changed = true
        }
      }
      if (!changed) return html
      const doctype = /^\s*<!doctype/i.test(html) ? '<!doctype html>\n' : ''
      return doctype + doc.documentElement.outerHTML
    },
  }
}
