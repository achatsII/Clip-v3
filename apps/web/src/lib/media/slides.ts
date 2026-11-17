/**
 * Une présentation PowerPoint (.pptx), lue dans l'app (toggle `slidesImport`). La Gateway ne la
 * convertit pas : sa route `convert-to-pdf` n'accepte que Word et ODT et répond 500 pour un .pptx
 * (revérifié en QA le 17 novembre 2026 ; un Word passe). Un .pptx est une archive zip : le texte de
 * chaque diapositive (titre, texte, tableaux, notes du présentateur) et ses images s'y lisent
 * directement, sans serveur. L'IA reçoit le texte en note et chaque image en photo, nommée d'après sa
 * diapositive ; les vraies images de la présentation deviennent les médias des étapes.
 *
 * Seul le format d'Office (pptx, ppsx, potx) se lit ainsi ; un .ppt, un Keynote ou un .odp demande
 * toujours de passer par un PDF. Sans `DecompressionStream` (navigateur trop ancien), même chose.
 */

import { messages } from '../i18n'

const NS = {
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
}

const PPTX = /\.(pptx|ppsx|potx)$/i
const PPTX_TYPES = /presentationml/i

/** Une présentation au format d'Office, que l'app sait lire. */
export function isPptx(file: { name: string; type: string }): boolean {
  return PPTX.test(file.name) || PPTX_TYPES.test(file.type)
}

/** Le navigateur sait-il décompresser une archive (iOS 16.4 et plus, tous les navigateurs récents) ? */
export const canReadSlides = () => typeof DecompressionStream !== 'undefined'

/** Au-delà, les images ne sont plus reprises (la génération lit au plus 80 photos). */
export const MAX_DECK_IMAGES = 60

/** Ce que les navigateurs affichent ; un EMF, un WMF ou un TIFF (dessins d'Office) ne l'est pas. */
const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp' }

export interface Slide {
  /** Son numéro dans la présentation, à partir de 1. */
  n: number
  title: string
  /** Le texte de la diapositive, une ligne par paragraphe (tableaux compris), sans le titre. */
  lines: string[]
  /** Les notes du présentateur. */
  notes: string
  /** Les images de la diapositive (leur nom, celui de `DeckImage.name`). */
  images: string[]
}

export interface DeckImage {
  /** « Diapositive 3 — image 1.png » : l'IA rapproche l'image de sa diapositive par ce nom. */
  name: string
  slide: number
  blob: Blob
}

export interface SlideDeck {
  slides: Slide[]
  images: DeckImage[]
  /** Des images au-delà de `MAX_DECK_IMAGES`, laissées de côté. */
  skippedImages: number
}

// ——— L'archive ———

interface ZipEntry {
  method: number
  compressedSize: number
  offset: number
}

/** Le répertoire de l'archive (fin du fichier) : le nom de chaque fichier et où il commence. */
function zipEntries(buf: ArrayBuffer): Map<string, ZipEntry> {
  const v = new DataView(buf)
  let end = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      end = i
      break
    }
  }
  if (end < 0) throw new Error('not a zip archive')
  const count = v.getUint16(end + 10, true)
  let p = v.getUint32(end + 16, true)
  const names = new TextDecoder()
  const out = new Map<string, ZipEntry>()
  for (let k = 0; k < count && p + 46 <= buf.byteLength; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) break
    const nameLen = v.getUint16(p + 28, true)
    const name = names.decode(new Uint8Array(buf, p + 46, nameLen))
    out.set(name, { method: v.getUint16(p + 10, true), compressedSize: v.getUint32(p + 20, true), offset: v.getUint32(p + 42, true) })
    p += 46 + nameLen + v.getUint16(p + 30, true) + v.getUint16(p + 32, true)
  }
  return out
}

async function unzip(buf: ArrayBuffer, e: ZipEntry): Promise<Uint8Array> {
  const v = new DataView(buf)
  const start = e.offset + 30 + v.getUint16(e.offset + 26, true) + v.getUint16(e.offset + 28, true)
  const data = new Uint8Array(buf, start, e.compressedSize)
  if (e.method === 0) return data.slice()
  if (e.method !== 8) throw new Error(`compression ${e.method}`)
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(data)
      c.close()
    },
  }).pipeThrough(new DecompressionStream('deflate-raw') as unknown as TransformStream<Uint8Array, Uint8Array>)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// ——— Le XML d'Office ———

const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml')
const all = (root: Document | Element, ns: string, tag: string) => Array.from(root.getElementsByTagNameNS(ns, tag))

/** Le chemin d'une cible de relation (« ../media/image1.png »), depuis le dossier de la pièce. */
function resolve(dir: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1)
  const parts = dir.split('/').filter(Boolean)
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg && seg !== '.') parts.push(seg)
  }
  return parts.join('/')
}

/** Les relations d'une pièce : identifiant → { type, chemin }. */
function relations(doc: Document | null, dir: string): Map<string, { type: string; path: string }> {
  const out = new Map<string, { type: string; path: string }>()
  if (!doc) return out
  for (const r of all(doc, NS.rel, 'Relationship')) {
    if (r.getAttribute('TargetMode') === 'External') continue
    out.set(r.getAttribute('Id') ?? '', { type: r.getAttribute('Type') ?? '', path: resolve(dir, r.getAttribute('Target') ?? '') })
  }
  return out
}

/** Le texte d'un paragraphe : ses morceaux, ses champs, ses retours de ligne. */
function paragraphText(p: Element): string {
  let out = ''
  const walk = (el: Element) => {
    for (const c of Array.from(el.children)) {
      if (c.namespaceURI === NS.a && c.localName === 't') out += c.textContent ?? ''
      else if (c.namespaceURI === NS.a && c.localName === 'br') out += ' '
      else walk(c)
    }
  }
  walk(p)
  return out.replace(/\s+/g, ' ').trim()
}

/** Le type d'emplacement d'une forme (`title`, `body`, `sldNum`…), ou rien. */
function placeholder(shape: Element): string | null {
  const ph = all(shape, NS.p, 'ph')[0]
  return ph ? (ph.getAttribute('type') ?? 'body') : null
}

/** Ce qui ne se lit pas : le numéro de la diapositive, la date, le pied de page, la vignette des notes. */
const NOISE = new Set(['sldNum', 'dt', 'ftr', 'hdr', 'sldImg'])

// ——— La présentation ———

/** Le texte et les images de chaque diapositive, dans l'ordre de la présentation. */
export async function readSlides(file: Blob | ArrayBuffer): Promise<SlideDeck> {
  const w = messages().capture.upload.deck
  // Un fichier, ou ses octets (venus d'un autre contexte, `instanceof` ne suffit pas).
  const buf = typeof (file as Blob).arrayBuffer === 'function' ? await (file as Blob).arrayBuffer() : (file as ArrayBuffer)
  const entries = zipEntries(buf)
  const text = async (path: string) => {
    const e = entries.get(path)
    return e ? new TextDecoder().decode(await unzip(buf, e)) : null
  }
  const doc = async (path: string) => {
    const s = await text(path)
    return s ? xml(s) : null
  }
  const presentation = await doc('ppt/presentation.xml')
  if (!presentation) throw new Error('not a presentation')
  const presRels = relations(await doc('ppt/_rels/presentation.xml.rels'), 'ppt')
  const order = all(presentation, NS.p, 'sldId')
    .map((s) => presRels.get(s.getAttributeNS(NS.r, 'id') ?? '')?.path)
    .filter((p): p is string => !!p)

  const slides: Slide[] = []
  const images: DeckImage[] = []
  const seen = new Set<string>()
  let skippedImages = 0
  for (const [i, path] of order.entries()) {
    const n = i + 1
    const slide = await doc(path)
    if (!slide) continue
    const dir = path.slice(0, path.lastIndexOf('/'))
    const rels = relations(await doc(`${dir}/_rels/${path.slice(dir.length + 1)}.rels`), dir)
    let title = ''
    const lines: string[] = []
    // Les formes dans leur ordre : le titre d'abord trouvé, le reste comme texte (tableaux compris).
    for (const shape of [...all(slide, NS.p, 'sp'), ...all(slide, NS.p, 'graphicFrame')].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))) {
      const kind = placeholder(shape)
      if (kind && NOISE.has(kind)) continue
      const paragraphs = all(shape, NS.a, 'p').map(paragraphText).filter(Boolean)
      if (!paragraphs.length) continue
      if (!title && (kind === 'title' || kind === 'ctrTitle')) title = paragraphs.join(' ')
      else lines.push(...paragraphs)
    }
    // Les notes du présentateur : leur emplacement de texte seulement.
    let notes = ''
    const notesPath = [...rels.values()].find((r) => r.type.endsWith('/notesSlide'))?.path
    const notesDoc = notesPath ? await doc(notesPath) : null
    if (notesDoc) {
      notes = all(notesDoc, NS.p, 'sp')
        .filter((s) => placeholder(s) === 'body')
        .flatMap((s) => all(s, NS.a, 'p').map(paragraphText))
        .filter(Boolean)
        .join(' ')
    }
    // Les images posées sur la diapositive (pas son fond), une fois chacune.
    const names: string[] = []
    for (const pic of all(slide, NS.p, 'pic')) {
      const embed = all(pic, NS.a, 'blip')[0]?.getAttributeNS(NS.r, 'embed')
      const target = embed ? rels.get(embed)?.path : undefined
      const ext = target?.split('.').pop()?.toLowerCase() ?? ''
      if (!target || !IMAGE_TYPES[ext] || seen.has(target) || !entries.has(target)) continue
      seen.add(target)
      if (images.length >= MAX_DECK_IMAGES) {
        skippedImages++
        continue
      }
      const bytes = await unzip(buf, entries.get(target)!)
      const name = `${w.slide} ${n} — ${w.image} ${names.length + 1}.${ext === 'jpeg' ? 'jpg' : ext}`
      images.push({ name, slide: n, blob: new Blob([bytes as BlobPart], { type: IMAGE_TYPES[ext] }) })
      names.push(name)
    }
    slides.push({ n, title, lines, notes, images: names })
  }
  return { slides, images, skippedImages }
}

/**
 * Le texte de la présentation, diapositive par diapositive : titre, texte, notes du présentateur et
 * le nom de ses images (celui des photos jointes, que l'IA rapproche ainsi de leur diapositive). Dans
 * la langue de l'outil : la personne le relit dans les médias d'origine.
 */
export function deckText(fileName: string, deck: SlideDeck): string {
  const w = messages().capture.upload.deck
  const out = [w.title(fileName, deck.slides.length)]
  for (const s of deck.slides) {
    out.push('')
    out.push(`${w.slide} ${s.n}${s.title ? ` — ${s.title}` : ''}`)
    out.push(...s.lines.map((l) => `- ${l}`))
    if (s.notes) out.push(`${w.notes} : ${s.notes}`)
    if (s.images.length) out.push(`${w.images} : ${s.images.map((x) => `« ${x} »`).join(', ')}`)
  }
  if (deck.skippedImages) out.push('', w.skipped(deck.skippedImages))
  return out.join('\n')
}
