'use client'

/**
 * Le son des vidéos des étapes, retenu sur l'appareil (`clip_pref_video_sound`) : activé une fois, il
 * le reste pour les autres étapes et à la prochaine ouverture ; coupé, il le reste aussi. Muet par
 * défaut. Un navigateur qui refuse le son sans un toucher fait partir la vidéo muette ; le bouton du
 * son le redonne (`VideoSegment`).
 */
import { useSyncExternalStore } from 'react'

const KEY = 'clip_pref_video_sound'
const listeners = new Set<() => void>()
/** Un appareil sans stockage : le choix vaut pour cette page. */
let memory = false

export function readVideoSound(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on'
  } catch {
    return memory
  }
}

export function setVideoSound(on: boolean) {
  memory = on
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* appareil sans stockage : `memory` le garde */
  }
  listeners.forEach((l) => l())
}

export function useVideoSound(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    readVideoSound,
    () => false,
  )
}
