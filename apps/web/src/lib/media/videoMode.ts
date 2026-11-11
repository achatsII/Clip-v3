'use client'

/**
 * Comment les vidéos des étapes se jouent au lecteur, au choix de chacun et retenu sur l'appareil :
 * en boucle dès l'affichage, une seule fois dès l'affichage, ou seulement quand on touche Lecture.
 */
import { useSyncExternalStore } from 'react'

export type VideoMode = 'loop' | 'once' | 'tap'

/** Les choix, dans l'ordre. Leurs mots suivent la langue de celui qui regarde (`MediaLabels.videoModes`). */
export const VIDEO_MODES: Array<{ value: VideoMode }> = (['loop', 'once', 'tap'] as const).map((value) => ({ value }))

const KEY = 'clip_pref_video_mode'
const listeners = new Set<() => void>()

export function readVideoMode(): VideoMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'once' || v === 'tap' ? v : 'loop'
  } catch {
    return 'loop'
  }
}

export function setVideoMode(mode: VideoMode) {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* appareil sans stockage : le choix vaut pour cette page */
  }
  listeners.forEach((l) => l())
}

export function useVideoMode(): VideoMode {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    readVideoMode,
    () => 'loop',
  )
}
