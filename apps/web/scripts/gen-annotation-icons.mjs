// Génère src/lib/annotations/icons.ts : les tracés des icônes d'annotation, tirés de Lucide
// (licence ISC). Une même source sert à l'écran (React) et au PDF (texte HTML).
// Usage : node scripts/gen-annotation-icons.mjs  (depuis apps/web)
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const dir = join(dirname(require.resolve('lucide-react/package.json')), 'dist/esm/icons')

// [clé, icône Lucide]. Le nom de chaque icône, dans chaque langue de l'outil, est dans les
// dictionnaires (src/lib/i18n/<langue>/editorTools.ts, annotator.icons), sous la même clé.
const ICONS = [
  ['danger', 'triangle-alert'],
  ['interdit', 'ban'],
  ['arret', 'octagon-x'],
  ['bon', 'circle-check'],
  ['mauvais', 'circle-x'],
  ['gants', 'hand'],
  ['lunettes', 'glasses'],
  ['casque', 'hard-hat'],
  ['bouchons', 'ear'],
  ['bottes', 'footprints'],
  ['protection', 'shield'],
  ['cadenas', 'lock'],
  ['electrique', 'zap'],
  ['chaud', 'flame'],
  ['froid', 'snowflake'],
  ['toxique', 'skull'],
  ['coupure', 'scissors'],
  ['horaire', 'rotate-cw'],
  ['antihoraire', 'rotate-ccw'],
  ['verifier', 'eye'],
  ['appuyer', 'pointer'],
  ['outil', 'wrench'],
  ['marteau', 'hammer'],
  ['mecanisme', 'cog'],
  ['lubrifier', 'droplet'],
  ['nettoyer', 'spray-can'],
  ['mesurer', 'ruler'],
  ['pression', 'gauge'],
  ['temperature', 'thermometer'],
  ['attendre', 'timer'],
  ['aimant', 'magnet'],
  ['jeter', 'trash-2'],
  ['recycler', 'recycle'],
  ['astuce', 'lightbulb'],
  ['point-cle', 'star'],
  ['info', 'info'],
  ['question', 'circle-question-mark'],
]

async function iconData(name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`boucle d'alias : ${name}`)
  seen.add(name)
  const file = join(dir, `${name}.mjs`)
  const text = readFileSync(file, 'utf8')
  if (text.includes('__iconData')) return (await import(pathToFileURL(file).href)).__iconData
  const alias = /from '\.\/([a-z0-9-]+)\.mjs'/.exec(text)
  if (!alias) throw new Error(`icône introuvable : ${name}`)
  return iconData(alias[1], seen)
}

const entries = []
for (const [key, name] of ICONS) {
  const data = await iconData(name)
  const node = data.node.map(([tag, attrs]) => {
    const { key: _k, ...rest } = attrs
    return [tag, Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, String(v)]))]
  })
  entries.push(`  ${JSON.stringify(key)}: { node: ${JSON.stringify(node)} },`)
}

const out = `// Généré par scripts/gen-annotation-icons.mjs depuis Lucide (https://lucide.dev, licence ISC).
// Ne pas modifier à la main : changer la liste dans le script, puis le relancer.
// Le nom de chaque icône est dans les dictionnaires (i18n/<langue>/editorTools.ts, annotator.icons).

export type IconElement = [tag: string, attrs: Record<string, string>]

export const ANNOTATION_ICONS = {
${entries.join('\n')}
} satisfies Record<string, { node: IconElement[] }>

export type AnnotationIconKey = keyof typeof ANNOTATION_ICONS

export const ANNOTATION_ICON_KEYS = Object.keys(ANNOTATION_ICONS) as AnnotationIconKey[]
`
writeFileSync(new URL('../src/lib/annotations/icons.ts', import.meta.url), out)
console.log(`${entries.length} icônes écrites dans src/lib/annotations/icons.ts`)
