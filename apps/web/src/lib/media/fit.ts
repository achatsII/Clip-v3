/**
 * Au téléphone tenu droit, la place du média d'une étape (toggle `phoneReader`).
 *
 * Avant, le média prenait toujours près de la moitié de l'écran : une vidéo couchée y laissait des
 * bandes noires, et le texte se lisait en défilant. Maintenant :
 * - le média prend ses vraies proportions sur toute la largeur — c'est sa plus grande taille
 *   possible ; plus haut, on n'ajoute que du noir ;
 * - sans dépasser un peu plus de la moitié de la place (une photo en hauteur) ;
 * - une photo, un document cèdent au texte ce qu'il faut pour que l'étape se lise sans défiler,
 *   sans descendre sous un peu plus du tiers de la place : le média reste grand (la vision le
 *   protège), et « Agrandir » le montre en plein écran ;
 * - une vidéo garde toute sa largeur et, dessous, la bande de ses commandes : plus petite, ses
 *   commandes en cacheraient le geste.
 */
export const MEDIA_MAX_SHARE = 0.52
export const MEDIA_MIN_SHARE = 0.38
/** Sous une vidéo, la bande de ses grandes commandes (lecture, reprise, son) : rien ne cache l'image. */
export const VIDEO_BAR = 80

export interface FitInput {
  /** La largeur du média (toute la largeur de l'écran). */
  width: number
  /** La hauteur à partager entre le média et le texte (entre l'en-tête et les boutons du bas). */
  avail: number
  /** Largeur ÷ hauteur, si on la connaît ; sinon le média prend sa part la plus grande. */
  ratio: number | null
  /** La hauteur que le texte de l'étape demande, marges comprises. */
  text: number
  video?: boolean
}

export function fitMediaHeight({ width, avail, ratio, text, video = false }: FitInput): number {
  const max = avail * MEDIA_MAX_SHARE
  const natural = ratio ? width / ratio + (video ? VIDEO_BAR : 0) : max
  const cap = Math.min(natural, max)
  const floor = video ? cap : Math.min(cap, avail * MEDIA_MIN_SHARE)
  return Math.round(Math.max(floor, Math.min(cap, avail - text)))
}
