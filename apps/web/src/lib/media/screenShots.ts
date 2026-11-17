/**
 * Les images nettes d'un enregistrement de l'écran (toggle `screenCapture`) : quand les prendre.
 *
 * L'IA regarde une vidéo à une image par seconde : un clic rapide (un menu ouvert puis choisi) peut
 * tomber entre deux images. Plutôt que de payer plus d'images par seconde, l'app regarde elle-même
 * chaque image de l'écran, en tout petit, et garde une image nette (pleine résolution) :
 * - de l'écran de départ, dès qu'il est calme ;
 * - juste AVANT chaque vrai changement d'un écran calme : le pointeur y est encore sur ce qu'on va
 *   toucher, comme les captures d'un guide pas à pas ;
 * - de l'écran d'arrivée, à la fin.
 * Taper du texte ou bouger le pointeur ne change presque rien : l'écran reste « calme », et l'image
 * prise au clic suivant montre le champ rempli et le pointeur sur le bouton.
 *
 * Ce fichier ne touche ni au navigateur ni au réseau : `screenRecorder.ts` lui donne les images.
 */

/** La petite image comparée : assez fine pour voir quelques caractères tapés, assez petite pour 7 fois par seconde. */
export const PROBE_W = 320
export const PROBE_H = 180
/** L'écart d'un pixel (sur 255, en niveaux de gris) qui compte comme un vrai changement. */
const TOLERANCE = 24

/** Niveaux de gris d'une image RGBA (`getImageData`). */
export function toGray(rgba: Uint8ClampedArray | Uint8Array): Uint8Array {
  const out = new Uint8Array(rgba.length >> 2)
  for (let i = 0, j = 0; j < out.length; i += 4, j++) out[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8
  return out
}

/** La part des pixels qui ont vraiment changé entre deux petites images (0 à 1). */
export function changedRatio(a: Uint8Array, b: Uint8Array, tolerance = TOLERANCE): number {
  const n = Math.min(a.length, b.length)
  if (!n) return 0
  let changed = 0
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i]
    if (d > tolerance || d < -tolerance) changed++
  }
  return changed / n
}

export interface ShotPickerOptions {
  /** Un écran calme depuis au moins ce temps (ms) : un changement qui suit est une action. */
  calmMs: number
  /** La part de l'écran qui doit changer d'un coup pour être une action (un menu, une fenêtre, une page). */
  bigChange: number
  /** En dessous, deux images sont la même (le pointeur seul a bougé). */
  sameBelow: number
  /** Au moins ce temps entre deux images (ms). */
  minGapMs: number
  /** Au plus ce nombre d'images. */
  max: number
}

export const SHOT_DEFAULTS: ShotPickerOptions = { calmMs: 300, bigChange: 0.006, sameBelow: 0.00015, minGapMs: 350, max: 60 }

/**
 * `'now'` : garder l'image qu'on vient de donner (l'écran de départ) ; `'before'` : garder la
 * précédente (l'écran calme, juste avant qu'il change) ; `null` : rien à garder.
 */
export type ShotDecision = 'now' | 'before' | null

export class ShotPicker {
  private prev: Uint8Array | null = null
  /** L'écran calme de référence : un changement se mesure contre lui (un fondu lent compte aussi). */
  private ref: Uint8Array | null = null
  private calmSince = 0
  private last: Uint8Array | null = null
  private lastAt = Number.NEGATIVE_INFINITY
  private taken = 0
  private readonly o: ShotPickerOptions

  constructor(options: Partial<ShotPickerOptions> = {}) {
    this.o = { ...SHOT_DEFAULTS, ...options }
  }

  get count() {
    return this.taken
  }

  get full() {
    return this.taken >= this.o.max
  }

  /**
   * Une nouvelle petite image de l'écran, à l'instant `t` (ms). Toutes les images, au rythme où le
   * navigateur les donne : un écran qui ne bouge pas n'en donne parfois aucune, et un menu ouvert
   * un instant n'en donne qu'une.
   */
  feed(gray: Uint8Array, t: number): ShotDecision {
    const prev = this.prev
    this.prev = gray
    if (!prev || !this.ref) {
      this.ref = gray
      this.calmSince = t
      return null
    }
    if (changedRatio(gray, this.ref) >= this.o.bigChange) {
      // L'écran a vraiment changé depuis qu'il était calme : on garde l'image d'avant, le pointeur sur ce qu'on touche.
      const decision: ShotDecision = t - this.calmSince >= this.o.calmMs && this.keep(prev, t) ? 'before' : null
      this.ref = gray
      this.calmSince = t
      return decision
    }
    // L'écran de départ, dès qu'il est calme.
    if (!this.last && t - this.calmSince >= this.o.calmMs && this.keep(gray, t)) return 'now'
    return null
  }

  /** L'écran d'arrivée, à la fin : gardé s'il diffère de la dernière image. */
  finish(t: number): boolean {
    return !!this.prev && this.keep(this.prev, t, true)
  }

  private keep(gray: Uint8Array, t: number, ignoreGap = false): boolean {
    if (this.taken >= this.o.max) return false
    if (!ignoreGap && t - this.lastAt < this.o.minGapMs) return false
    if (this.last && changedRatio(gray, this.last) < this.o.sameBelow) return false
    this.last = gray
    this.lastAt = t
    this.taken++
    return true
  }
}
