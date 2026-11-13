/**
 * L'espace Découvrir de Clip : le catalogue des vidéos, dans l'ordre du parcours (commencer ici, les
 * fonctions une à une, aller plus loin). Les identifiants sont fixes (`NN-slug`) : ils nomment les
 * fichiers publiés (`public/decouvrir/videos/<id>.json`, `.jpg`, `.vtt`), les événements du suivi et les
 * vidéos que Sandboxes compte. Une vidéo publiée garde le sien ; un ancien identifiant passe par
 * `RENAMED`. Les titres, résumés et « Pour qui » vivent dans les dictionnaires (`decouvrir.videos`).
 * Une vidéo sans métadonnées publiées (et son MP4) reste « Bientôt », sans lien mort.
 */

/** Le parcours, dans l'ordre où on le suit. */
export const VIDEO_IDS = [
  '00-film',
  '01-survol',
  '02-capturer',
  '03-generer',
  '04-retoucher',
  '05-traduire',
  '06-moderniser',
  '07-approuver',
  '08-au-poste',
  '09-postes',
  '10-equipe',
  '11-statistiques',
] as const

export type VideoId = (typeof VIDEO_IDS)[number]
export type VideoLevel = 1 | 2 | 3

/** Le niveau de chaque vidéo : 1 commencer ici, 2 les fonctions une à une, 3 aller plus loin. */
export const VIDEO_LEVEL: Record<VideoId, VideoLevel> = {
  '00-film': 1,
  '01-survol': 1,
  '02-capturer': 2,
  '03-generer': 2,
  '04-retoucher': 2,
  '05-traduire': 2,
  '06-moderniser': 2,
  '07-approuver': 2,
  '08-au-poste': 2,
  '09-postes': 3,
  '10-equipe': 3,
  '11-statistiques': 3,
}

export const LEVELS: VideoLevel[] = [1, 2, 3]

/** Les anciens identifiants d'une vidéo renommée ou fusionnée, vers le nouveau (aucun pour l'instant). */
export const RENAMED: Record<string, VideoId> = {}

export const LIBRARY_PATH = '/decouvrir'
export const ADVISOR_PATH = '/decouvrir/conseiller'
/** L'écran d'entrée de l'espace relié à Sandboxes. */
export const LOGIN_PATH = '/decouvrir/entrer'

export function isVideoId(v: unknown): v is VideoId {
  return typeof v === 'string' && (VIDEO_IDS as readonly string[]).includes(v)
}

/** Un identifiant d'adresse (`?v=` ou `/decouvrir/v/<id>`) : l'actuel, un ancien renommé, sinon rien. */
export function resolveVideoId(v: string | null | undefined): VideoId | null {
  if (!v) return null
  const id = RENAMED[v] ?? v
  return isVideoId(id) ? id : null
}

/** Repère dans une vidéo : 0:30, 4:04. */
export function clock(sec: number): string {
  const t = Math.max(0, Math.floor(sec))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}
