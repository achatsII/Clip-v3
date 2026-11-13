/**
 * La vidéo des étapes : une seule vidéo courte, montée par la passerelle avec l'extrait de chaque
 * étape, dans l'ordre de l'instruction. Au poste, on ne télécharge que ces secondes (pas la vidéo
 * d'origine en entier), un seul lecteur passe d'une étape à l'autre sans rien recharger, et le
 * navigateur, en lisant une étape, charge déjà la suivante, qui la suit dans la vidéo.
 *
 * Elle ne retient jamais la publication. On publie : les extraits inchangés gardent leur place dans
 * la vidéo des étapes déjà publiée (`carryClips`). Si un extrait a changé (`reelStale`), elle se
 * monte ensuite, en arrière-plan, et le document public la reçoit (`attachReel`) ; d'ici là, et si le
 * montage échoue, le poste lit la vidéo d'origine (`validClip`).
 */
import type { DataApi } from '../gateway/data'
import type { FilesApi } from '../gateway/files'
import { T } from '../model/repo'
import type { InstructionContent, Published, ReelClip, StepMedia } from '../model/types'

type Video = Extract<StepMedia, { kind: 'video' }>

/** Au-delà, la vidéo des étapes ne se monte pas (trop longue à monter, peu de gain). */
export const REEL_MAX_SEC = 15 * 60
/** Après un montage raté, on ne réessaie pas avant une demi-heure : la passerelle peut être en panne. */
export const REEL_RETRY_MS = 30 * 60_000
/** Le repère d'un extrait est encore bon : même vidéo d'origine, mêmes bornes (à 50 ms près). */
const same = (a: number, b: number) => Math.abs(a - b) < 0.05

/** Le repère de l'extrait dans la vidéo des étapes, s'il vaut encore pour ce média. */
export function validClip(m: StepMedia): ReelClip | null {
  if (m.kind !== 'video' || !m.clip) return null
  const c = m.clip
  return c.src === m.url && same(c.start, m.start) && same(c.end, m.end) && c.url ? c : null
}

/** Ce que le lecteur lit pour un extrait : la vidéo des étapes (si à jour), sinon la vidéo d'origine. */
export function playable(m: Video, useReel = true): { url: string; start: number; end: number } {
  const c = useReel ? validClip(m) : null
  return c ? { url: c.url, start: c.at, end: c.at + (m.end - m.start) } : { url: m.url, start: m.start, end: m.end }
}

const key = (m: Video) => `${m.url}#${m.start.toFixed(2)}-${m.end.toFixed(2)}`
const isClip = (m: StepMedia): m is Video => m.kind === 'video' && !!m.url && m.end > m.start

/** Les extraits à monter, dans l'ordre de l'instruction ; un même extrait repris ailleurs n'y est qu'une fois. */
export function reelSegments(content: InstructionContent): Array<{ videoUrl: string; start: number; end: number; key: string }> {
  const seen = new Set<string>()
  const out: Array<{ videoUrl: string; start: number; end: number; key: string }> = []
  for (const s of content.steps)
    for (const m of s.media) {
      if (!isClip(m)) continue
      const k = key(m)
      if (seen.has(k)) continue
      seen.add(k)
      out.push({ videoUrl: m.url, start: m.start, end: m.end, key: k })
    }
  return out
}

/**
 * La vidéo des étapes est à (re)monter : un extrait n'y a pas sa place, ou elle ne suit plus les
 * étapes (un extrait retiré ou déplacé laisserait le poste télécharger des secondes inutiles). Rien à
 * monter sans extrait, ni au-delà de `REEL_MAX_SEC`.
 */
export function reelStale(content: InstructionContent): boolean {
  const segs = reelSegments(content)
  if (!segs.length) return false
  if (segs.reduce((n, s) => n + (s.end - s.start), 0) > REEL_MAX_SEC) return false
  const clips = new Map<string, ReelClip>()
  for (const s of content.steps)
    for (const m of s.media) {
      if (!isClip(m)) continue
      const c = validClip(m)
      if (!c) return true
      clips.set(key(m), c)
    }
  // À jour : tous dans la même vidéo, à la suite les uns des autres, dans l'ordre des étapes.
  let t = 0
  const url = clips.get(segs[0].key)?.url
  for (const s of segs) {
    const c = clips.get(s.key)
    if (!c || c.url !== url || !same(c.at, t)) return true
    t += s.end - s.start
  }
  return false
}

/** Le contenu avec le repère de chaque extrait dans la vidéo montée (`url`), dans l'ordre des segments. */
export function withReel(content: InstructionContent, url: string, segments: ReturnType<typeof reelSegments>): InstructionContent {
  const at = new Map<string, number>()
  let t = 0
  for (const s of segments) {
    at.set(s.key, t)
    t += s.end - s.start
  }
  return {
    ...content,
    steps: content.steps.map((s) => ({
      ...s,
      media: s.media.map((m) => {
        if (m.kind !== 'video') return m
        const offset = at.get(key(m))
        return offset === undefined ? m : { ...m, clip: { url, at: offset, src: m.url, start: m.start, end: m.end } }
      }),
    })),
  }
}

/** Les extraits inchangés depuis la dernière publication y gardent leur place dans la vidéo des étapes. */
export function carryClips(content: InstructionContent, previous: InstructionContent | null | undefined): InstructionContent {
  const known = new Map<string, ReelClip>()
  for (const s of previous?.steps ?? [])
    for (const m of s.media) {
      const c = isClip(m) ? validClip(m) : null
      if (c) known.set(key(m as Video), c)
    }
  if (!known.size) return content
  return {
    ...content,
    steps: content.steps.map((s) => ({
      ...s,
      media: s.media.map((m) => {
        if (!isClip(m) || validClip(m)) return m
        const c = known.get(key(m))
        return c ? { ...m, clip: c } : m
      }),
    })),
  }
}

/**
 * Monte la vidéo des étapes et rend le contenu avec les repères ; null s'il n'y a rien à monter.
 * Une source sans piste son peut faire échouer le montage : on réessaie alors sans le son.
 */
export async function buildReel(files: FilesApi, content: InstructionContent): Promise<InstructionContent | null> {
  const segments = reelSegments(content)
  if (!segments.length) return null
  return withReel(content, await compose(files, segments), segments)
}

async function compose(files: FilesApi, segments: ReturnType<typeof reelSegments>): Promise<string> {
  const parts = segments.map(({ videoUrl, start, end }) => ({ videoUrl, start, end }))
  try {
    return await files.composeVideo(parts)
  } catch {
    return await files.composeVideo(parts, { mute: true })
  }
}

let downUntil = 0

/**
 * Après la publication, en arrière-plan : monte la vidéo des étapes et la donne au document public,
 * s'il en est encore à cette version. Rend vrai quand les postes la liront. Ne lève jamais : un
 * échec laisse les postes sur la vidéo d'origine, et une publication suivante réessaiera.
 */
export async function attachReel(files: FilesApi, data: DataApi, target: { publishedId: string; version: number }, content: InstructionContent): Promise<boolean> {
  if (!reelStale(content) || Date.now() < downUntil) return false
  const segments = reelSegments(content)
  let url: string
  try {
    url = await compose(files, segments)
  } catch {
    downUntil = Date.now() + REEL_RETRY_MS
    return false
  }
  try {
    const doc = await data.get<Published>(T.published, target.publishedId)
    if (!doc || doc.json_data.version !== target.version) return false
    await data.patch(T.published, target.publishedId, { content: withReel(doc.json_data.content, url, segments) })
    return true
  } catch {
    return false
  }
}
