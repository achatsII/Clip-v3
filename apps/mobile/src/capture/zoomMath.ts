/**
 * Le zoom de la caméra au pincement, réglé comme l'appareil photo de l'iPhone : le grossissement
 * est multiplié par l'écart des doigts (doigts deux fois plus écartés = image deux fois plus
 * grande). `zoom` est la valeur 0 à 1 de `CameraView`, que expo-camera traduit ainsi :
 * - iOS : facteur = minimum × (maximum / minimum)^zoom ; l'écart typique de l'objectif grand-angle
 *   est d'environ 60 ;
 * - Android : rapport = zoom × rapport maximal (au moins 1) ; rapport maximal typique : 10.
 * Ces écarts varient un peu d'un téléphone à l'autre : la sensation reste celle d'un pincement
 * direct, à quelques pour cent près.
 */
export type ZoomPlatform = 'ios' | 'android'

const IOS_LOG_RANGE = Math.log(60)
/** Au-delà de 10×, le zoom numérique ne montre rien de plus. */
const MAX_MAGNIFICATION = 10
const IOS_MAX_ZOOM = Math.log(MAX_MAGNIFICATION) / IOS_LOG_RANGE
const ANDROID_MAX_RATIO = 10

/** Le grossissement montré pour une valeur de zoom (1 = cadrage normal). */
export function magnification(platform: ZoomPlatform, zoom: number): number {
  return platform === 'ios' ? Math.exp(zoom * IOS_LOG_RANGE) : Math.max(1, zoom * ANDROID_MAX_RATIO)
}

/** Le zoom après un pincement d'échelle `scale` (1 = doigts immobiles) commencé à `startZoom`. */
export function pinchZoom(platform: ZoomPlatform, startZoom: number, scale: number): number {
  if (!(scale > 0) || !Number.isFinite(scale)) return startZoom
  if (platform === 'android') {
    const ratio = magnification('android', startZoom) * scale
    return ratio <= 1 ? 0 : Math.min(1, ratio / ANDROID_MAX_RATIO)
  }
  const z = startZoom + Math.log(scale) / IOS_LOG_RANGE
  return Math.min(IOS_MAX_ZOOM, Math.max(0, z))
}
