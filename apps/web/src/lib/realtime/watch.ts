/**
 * Le filet de secours du direct : quand le temps réel ne passe pas (réseau qui bloque, jeton
 * refusé, temps réel éteint), l'écran ouvert sur une instruction se relit seul. Une lecture
 * minuscule toutes les 8 s, onglet visible seulement : les instructions modifiées depuis peu, leur
 * date et l'appareil qui les a écrites. L'instruction entière ne se relit que si un AUTRE appareil
 * l'a changée depuis ce que cet écran connaît.
 */

export const WATCH_MS = 8_000
/**
 * Direct branché, une vérification lente quand même : l'autre appareil peut avoir perdu le sien
 * (ses annonces n'arrivent plus) ; on voit alors ses changements en moins de 20 s.
 */
export const WATCH_LIVE_MS = 20_000
/** Ce que la lecture regarde en arrière : assez pour tolérer une horloge d'appareil décalée. */
export const WATCH_WINDOW_MS = 6 * 3600_000

/** Ce que chaque enregistrement d'un brouillon écrit pour les autres écrans. */
export interface WrittenBy {
  updatedAt?: string
  /** L'appareil (onglet) qui a écrit : un écran ne se relit jamais pour ses propres changements. */
  updatedFrom?: string
  updatedVia?: 'app' | 'web'
  updatedByName?: string
}

/**
 * Un autre appareil a-t-il changé l'instruction depuis ce que cet écran connaît ? La date se compare
 * à l'identique (jamais « plus récente » : les horloges des appareils diffèrent). Un enregistrement
 * sans appareil connu (une version plus ancienne de l'app, un autre chemin) ne déclenche rien.
 */
export function remoteChange(row: WrittenBy | undefined, known: { at: string | null; device: string }): boolean {
  if (!row?.updatedAt || !row.updatedFrom) return false
  return row.updatedAt !== known.at && row.updatedFrom !== known.device
}
