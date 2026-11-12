/**
 * Le zoom de la caméra, en grossissement comme sur l'appareil photo : 0,5× (ultra grand-angle),
 * 1× (cadrage normal), 2×… Pincer multiplie le grossissement par l'écart des doigts (doigts deux
 * fois plus écartés = image deux fois plus grande).
 *
 * `zoom` de `CameraView` (0 à 1), tel que expo-camera le traduit :
 * - iOS, caméra multi-objectifs choisie (`ultraWide`, voir `pickMultiLens`) : facteur = 120^zoom.
 *   Le facteur 1 est l'ultra grand-angle (0,5×), le facteur 2 le grand-angle (1×) : l'iPhone change
 *   d'objectif seul en zoomant, comme dans l'appareil photo ;
 * - iOS, objectif par défaut : facteur = 60^zoom, à partir du cadrage normal (1×) ;
 * - Android : rapport = zoom × 10 (au moins 1).
 * Les plafonds varient un peu d'un téléphone à l'autre : les grossissements montrés restent justes
 * à quelques pour cent près.
 */
export type ZoomPlatform = 'ios' | 'android'

export interface ZoomRange {
  platform: ZoomPlatform
  /** La caméra multi-objectifs (ultra grand-angle compris) est choisie. */
  ultraWide: boolean
}

const IOS_LOG_RANGE = Math.log(60)
const IOS_MULTI_LOG_RANGE = Math.log(120)
const ANDROID_MAX_RATIO = 10
/** Au-delà de 10×, le zoom numérique ne montre rien de plus. */
export const MAX_MAGNIFICATION = 10

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Le plus petit grossissement : 0,5× avec l'ultra grand-angle, sinon 1×. */
export function minMagnification(r: ZoomRange): number {
  return r.platform === 'ios' && r.ultraWide ? 0.5 : 1
}

/** La valeur `zoom` de CameraView pour un grossissement. */
export function cameraZoom(r: ZoomRange, magnification: number): number {
  const m = clamp(magnification, minMagnification(r), MAX_MAGNIFICATION)
  if (r.platform === 'android') return m <= 1 ? 0 : Math.min(1, m / ANDROID_MAX_RATIO)
  return r.ultraWide ? Math.log(m * 2) / IOS_MULTI_LOG_RANGE : Math.log(m) / IOS_LOG_RANGE
}

/** Le grossissement après un pincement d'échelle `scale` (1 = doigts immobiles) commencé à `start`. */
export function pinchMagnification(r: ZoomRange, start: number, scale: number): number {
  if (!(scale > 0) || !Number.isFinite(scale)) return start
  return clamp(start * scale, minMagnification(r), MAX_MAGNIFICATION)
}

/** Les boutons d'objectif, comme dans l'appareil photo : 0,5× (s'il y a l'ultra grand-angle), 1×, 2×. */
export function zoomPresets(r: ZoomRange): number[] {
  return minMagnification(r) < 1 ? [0.5, 1, 2] : [1, 2]
}

/** Le bouton allumé : le plus grand qui ne dépasse pas le grossissement actuel. */
export function activePreset(presets: number[], magnification: number): number {
  return [...presets].reverse().find((p) => magnification >= p - 0.01) ?? presets[0]
}

/**
 * Les objectifs virtuels de l'iPhone qui réunissent l'ultra grand-angle et le grand-angle : la
 * triple caméra d'abord, sinon la double grand-angle. Rien d'autre : un objectif seul ne change
 * pas d'objectif en zoomant.
 */
const MULTI_LENSES = ['AVCaptureDeviceTypeBuiltInTripleCamera', 'AVCaptureDeviceTypeBuiltInDualWideCamera']

export function pickMultiLens(lenses: Array<{ deviceType: string }> | undefined): string | undefined {
  return MULTI_LENSES.find((t) => lenses?.some((l) => l.deviceType === t))
}
