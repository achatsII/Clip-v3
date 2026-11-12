/**
 * Les médias déjà pris : ceux des instructions précédentes, à reprendre pour une nouvelle (même
 * vidéo, autre poste ; une variante ; une relance). Un média repris garde le même fichier, sans
 * rien téléverser de nouveau.
 */
import type { Doc } from '../gateway/data'
import { normalizeText } from '../util/cn'
import { uid } from './repo'
import type { Instruction, Source, SourceKind } from './types'

/**
 * Un média repris ailleurs : un nouvel identifiant, le même fichier. Sans `path` : retirer le média
 * de la nouvelle capture ne supprime jamais le fichier, dont l'instruction d'origine se sert encore.
 */
export function reuseSource(s: Source): Source {
  const copy: Source = { ...s, id: uid('src_') }
  delete copy.path
  return copy
}

export type LibraryKind = 'all' | SourceKind

export interface LibraryGroup {
  id: string
  title: string
  updatedAt: string
  sources: Source[]
}

/** Un média qu'on peut reprendre : un fichier, ou un texte (note, transcription). */
const usable = (s: Source) => !!s.url || (s.kind === 'note' && !!s.text?.trim())

/**
 * Les médias des instructions, groupés par instruction (la plus récente d'abord) : sans l'instruction
 * en cours, filtrés par type et par recherche (titre, nom du fichier, texte).
 */
export function libraryGroups(docs: Array<Doc<Pick<Instruction, 'title' | 'sources' | 'updatedAt'>>>, opts: { exclude?: string | null; kind?: LibraryKind; query?: string } = {}): LibraryGroup[] {
  const q = normalizeText(opts.query?.trim() ?? '')
  const kind = opts.kind ?? 'all'
  const out: LibraryGroup[] = []
  for (const d of docs) {
    if (d._id === opts.exclude) continue
    const title = d.json_data.title ?? ''
    const inTitle = !!q && normalizeText(title).includes(q)
    const sources = (d.json_data.sources ?? []).filter((s) => {
      if (!usable(s)) return false
      if (kind !== 'all' && s.kind !== kind) return false
      if (!q || inTitle) return true
      return [s.name, s.originalName, s.text].some((x) => !!x && normalizeText(x).includes(q))
    })
    if (sources.length) out.push({ id: d._id, title, updatedAt: d.json_data.updatedAt, sources })
  }
  return out
}
