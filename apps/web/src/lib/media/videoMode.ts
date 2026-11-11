'use client'

/**
 * Comment les vidéos des étapes se jouent au lecteur, au choix de chacun et retenu sur l'appareil :
 * en boucle dès l'affichage, une seule fois dès l'affichage, ou seulement quand on touche Lecture.
 */
import { useSyncExternalStore } from 'react'

export type VideoMode = 'loop' | 'once' | 'tap'

export const VIDEO_MODES: Array<{ value: VideoMode; label: string; hint: string }> = [
  { value: 'loop', label: 'En boucle', hint: 'Démarre seule et recommence' },
  { value: 'once', label: 'Une fois', hint: 'Démarre seule, joue une fois' },
  { value: 'tap', label: 'Au toucher', hint: 'Attend qu’on touche Lecture' },
]

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
