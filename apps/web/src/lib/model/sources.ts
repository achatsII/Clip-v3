/**
 * Les médias d'origine d'une instruction (`Instruction.sources`) : ce qui a servi à la rédiger, dans
 * l'ordre où l'IA les a reçus (S1, S2…). Ils se revoient dans l'éditeur et, pour qui rédige, en
 * lecture (toggle `sourceLibrary`, `SourceLibrary`) ; jamais au poste : la version publiée ne les
 * porte pas, et un lien public ne lit que `clip_published`.
 */
import type { InstructionContent, Source, SourceKind } from './types'

/** Le nom que l'assistant donne à une source (« J'ai revu S2 ») : S1 pour la première. */
export const sourceTag = (index: number) => `S${index + 1}`

/** L'ordre des familles à l'écran : ce qu'on revoit le plus souvent d'abord. */
export const SOURCE_ORDER: SourceKind[] = ['video', 'photo', 'audio', 'note', 'document']

export interface SourceItem {
  source: Source
  /** S1, S2… : son rang dans l'instruction. */
  tag: string
}

/** Les sources par famille (vidéos, photos, notes vocales, notes, documents), chacune dans son ordre. */
export function groupSources(sources: Source[]): Array<{ kind: SourceKind; items: SourceItem[] }> {
  const items = sources.map((source, i) => ({ source, tag: sourceTag(i) }))
  return SOURCE_ORDER.map((kind) => ({ kind, items: items.filter((x) => x.source.kind === kind && (x.source.url || x.source.text)) })).filter((g) => g.items.length > 0)
}

/** Ce qu'on peut revoir : un fichier, ou le texte d'une note. */
export const viewableSources = (sources: Source[]) => sources.filter((s) => s.url || s.text)

/**
 * Les étapes qui montrent un média tiré de chaque source (numéros à partir de 1) : une vidéo dit
 * « Étapes 2, 3 », une photo encore inutilisée ne dit rien.
 */
export function sourceUses(content: InstructionContent | null | undefined): Map<string, Array<{ n: number; stepId: string }>> {
  const uses = new Map<string, Array<{ n: number; stepId: string }>>()
  content?.steps.forEach((step, i) => {
    for (const m of step.media) {
      const id = m.sourceId
      if (!id) continue
      const list = uses.get(id) ?? []
      if (!list.some((u) => u.stepId === step.id)) list.push({ n: i + 1, stepId: step.id })
      uses.set(id, list)
    }
  })
  return uses
}

/** Une photo prise en parlant : sa note vocale et l'instant de la photo dans la note (toggle `photoVoice`). */
export function voiceOf(photo: Source, sources: Source[]): { audio: Source; at: number } | null {
  if (!photo.voice) return null
  const audio = sources.find((s) => s.id === photo.voice!.sourceId && s.kind === 'audio' && s.url)
  return audio ? { audio, at: photo.voice.at } : null
}

/** Ce qu'on entend autour d'une photo : un peu avant l'instant où elle a été prise. */
export const VOICE_LEAD_SEC = 3
