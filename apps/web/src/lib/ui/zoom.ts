/**
 * Zoom et déplacement d'une image dans un cadre (pincer, molette, double-toucher) : fonctions pures,
 * partagées par l'annotateur et la visionneuse des médias du lecteur. Le contenu remplit le cadre
 * (largeur `w`, hauteur `h`) à l'échelle 1 ; `tx`, `ty` déplacent son coin haut-gauche.
 */
export interface View {
  k: number
  tx: number
  ty: number
}

export const IDENTITY: View = { k: 1, tx: 0, ty: 0 }
export const MAX_ZOOM = 6

/** Jamais plus petit que le cadre, jamais décollé d'un bord : on ne perd pas l'image. */
export function clampView(v: View, w: number, h: number, max = MAX_ZOOM): View {
  const k = Math.min(max, Math.max(1, v.k))
  return { k, tx: Math.min(0, Math.max(w - k * w, v.tx)), ty: Math.min(0, Math.max(h - k * h, v.ty)) }
}

/** Zoomer d'un facteur `f` autour du point (mx, my) du cadre : ce point reste sous le doigt. */
export function zoomAround(v: View, f: number, mx: number, my: number, w: number, h: number, max = MAX_ZOOM): View {
  const k = Math.min(max, Math.max(1, v.k * f))
  const r = k / v.k
  return clampView({ k, tx: mx - (mx - v.tx) * r, ty: my - (my - v.ty) * r }, w, h, max)
}

/**
 * Pincement : au départ, deux doigts écartés de `d0` autour de `m0` sur la vue `v0` ; maintenant
 * écartés de `d` autour de `m`. Le point de l'image pincé suit les doigts (zoom et déplacement).
 */
export function pinchView(v0: View, d0: number, m0: { x: number; y: number }, d: number, m: { x: number; y: number }, w: number, h: number, max = MAX_ZOOM): View {
  const k = Math.min(max, Math.max(1, (v0.k * d) / Math.max(1, d0)))
  const cx = (m0.x - v0.tx) / v0.k
  const cy = (m0.y - v0.ty) / v0.k
  return clampView({ k, tx: m.x - cx * k, ty: m.y - cy * k }, w, h, max)
}

export const isZoomed = (v: View) => v.k > 1.01
