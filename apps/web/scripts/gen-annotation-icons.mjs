// Génère src/lib/annotations/icons.ts : les tracés des icônes d'annotation, tirés de Lucide
// (licence ISC). Une même source sert à l'écran (React) et au PDF (texte HTML).
// Usage : node scripts/gen-annotation-icons.mjs  (depuis apps/web)
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const dir = join(dirname(require.resolve('lucide-react/package.json')), 'dist/esm/icons')

// [clé, icône Lucide, libellé]
const ICONS = [
  ['danger', 'triangle-alert', 'Danger'],
  ['interdit', 'ban', 'Interdit'],
  ['arret', 'octagon-x', 'Arrêt'],
  ['bon', 'circle-check', 'Bon'],
  ['mauvais', 'circle-x', 'Mauvais'],
  ['gants', 'hand', 'Gants'],
  ['lunettes', 'glasses', 'Lunettes'],
  ['casque', 'hard-hat', 'Casque'],
  ['bouchons', 'ear', 'Protection auditive'],
  ['bottes', 'footprints', 'Chaussures de sécurité'],
  ['protection', 'shield', 'Protection'],
  ['cadenas', 'lock', 'Cadenas'],
  ['electrique', 'zap', 'Électricité'],
  ['chaud', 'flame', 'Chaud'],
  ['froid', 'snowflake', 'Froid'],
  ['toxique', 'skull', 'Toxique'],
  ['coupure', 'scissors', 'Coupure'],
  ['horaire', 'rotate-cw', 'Sens horaire'],
  ['antihoraire', 'rotate-ccw', 'Sens antihoraire'],
  ['verifier', 'eye', 'Vérifier'],
  ['appuyer', 'pointer', 'Appuyer'],
  ['outil', 'wrench', 'Outil'],
  ['marteau', 'hammer', 'Frapper'],
  ['mecanisme', 'cog', 'Mécanisme'],
  ['lubrifier', 'droplet', 'Lubrifier'],
  ['nettoyer', 'spray-can', 'Nettoyer'],
  ['mesurer', 'ruler', 'Mesurer'],
  ['pression', 'gauge', 'Pression'],
  ['temperature', 'thermometer', 'Température'],
  ['attendre', 'timer', 'Attendre'],
  ['aimant', 'magnet', 'Aimant'],
  ['jeter', 'trash-2', 'Jeter'],
  ['recycler', 'recycle', 'Recycler'],
  ['astuce', 'lightbulb', 'Astuce'],
  ['point-cle', 'star', 'Point clé'],
  ['info', 'info', 'Info'],
  ['question', 'circle-question-mark', 'Question'],
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
for (const [key, name, label] of ICONS) {
  const data = await iconData(name)
  const node = data.node.map(([tag, attrs]) => {
    const { key: _k, ...rest } = attrs
    return [tag, Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, String(v)]))]
  })
  entries.push(`  ${JSON.stringify(key)}: { label: ${JSON.stringify(label)}, node: ${JSON.stringify(node)} },`)
}

const out = `// Généré par scripts/gen-annotation-icons.mjs depuis Lucide (https://lucide.dev, licence ISC).
// Ne pas modifier à la main : changer la liste dans le script, puis le relancer.

export type IconElement = [tag: string, attrs: Record<string, string>]

export const ANNOTATION_ICONS = {
${entries.join('\n')}
} satisfies Record<string, { label: string; node: IconElement[] }>

export type AnnotationIconKey = keyof typeof ANNOTATION_ICONS

export const ANNOTATION_ICON_KEYS = Object.keys(ANNOTATION_ICONS) as AnnotationIconKey[]
`
writeFileSync(new URL('../src/lib/annotations/icons.ts', import.meta.url), out)
console.log(`${entries.length} icônes écrites dans src/lib/annotations/icons.ts`)
