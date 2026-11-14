/**
 * Les métadonnées publiées d'une vidéo de l'espace Découvrir (`public/decouvrir/videos/<id>.json`) :
 * titre, résumé, durée, chapitres, transcription, adresse du MP4 dans le stockage de fichiers de la
 * passerelle (jamais un MP4 dans git), affiche et sous-titres servis par l'app. Le serveur les lit au
 * build (`server/videos.ts`) ; une vidéo dont le MP4 manque reste « Bientôt ». Fonctions pures.
 */

export interface VideoChapter {
  t: number
  title: string
}

export interface TranscriptLine {
  t: number
  text: string
}

export interface VideoMeta {
  id: string
  title: string
  summary: string
  durationSec: number
  chapters: VideoChapter[]
  transcript: TranscriptLine[]
  mp4: string
  poster?: string
  vtt?: string
}

/** Une adresse complète (stockage) se prend telle quelle ; un chemin local (`/decouvrir/…`) doit exister à côté. */
export type FileCheck = (publicPath: string) => boolean

function present(src: unknown, exists: FileCheck): src is string {
  if (typeof src !== 'string' || !src) return false
  if (/^https:\/\/\S+$/.test(src)) return true
  return src.startsWith('/') && !src.startsWith('//') && !src.includes('..') && exists(src)
}

const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0

/**
 * Les métadonnées d'une vidéo, vérifiées ; null si le MP4 manque ou si le fichier est illisible (en cours
 * d'écriture) : la vidéo reste alors « Bientôt », et le navigateur ne demande jamais un fichier absent.
 */
export function parseVideoMeta(id: string, raw: unknown, exists: FileCheck): VideoMeta | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const m = raw as Record<string, unknown>
  if (!present(m.mp4, exists)) return null
  const chapters = (Array.isArray(m.chapters) ? m.chapters : [])
    .filter((c): c is { t: number; title: string } => !!c && finite((c as VideoChapter).t) && typeof (c as VideoChapter).title === 'string' && !!(c as VideoChapter).title.trim())
    .map((c) => ({ t: c.t, title: c.title.trim() }))
    .sort((a, b) => a.t - b.t)
  const transcript = (Array.isArray(m.transcript) ? m.transcript : [])
    .filter((l): l is { t: number; text: string } => !!l && finite((l as TranscriptLine).t) && typeof (l as TranscriptLine).text === 'string' && !!(l as TranscriptLine).text.trim())
    .map((l) => ({ t: l.t, text: l.text.trim() }))
    .sort((a, b) => a.t - b.t)
  return {
    id,
    title: typeof m.title === 'string' && m.title.trim() ? m.title.trim() : id,
    summary: typeof m.summary === 'string' ? m.summary.trim() : '',
    durationSec: finite(m.durationSec) ? (m.durationSec as number) : 0,
    chapters,
    transcript,
    mp4: m.mp4 as string,
    poster: present(m.poster, exists) ? (m.poster as string) : undefined,
    vtt: present(m.vtt, exists) ? (m.vtt as string) : undefined,
  }
}

/** Le chapitre en cours à cet instant (index), -1 avant le premier. */
export function chapterIndexAt(chapters: { t: number }[], time: number): number {
  return chapters.reduce((acc, c, i) => (c.t <= time + 0.2 ? i : acc), -1)
}

/** Le repère d'un chapitre pour le suivi : `c01`, `c02`… */
export function chapterKey(index: number): string | undefined {
  return index >= 0 ? `c${String(index + 1).padStart(2, '0')}` : undefined
}
