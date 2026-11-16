'use client'

/**
 * Les lecteurs vidéo gardés d'une étape à l'autre : un par adresse, au lecteur d'instruction et,
 * avec la lecture fluide (toggle `smoothVideos`), dans l'éditeur. En passant à l'étape suivante, le
 * même lecteur saute au bon moment, avec ce qu'il a déjà téléchargé : rien ne se recharge. Avec la
 * vidéo des étapes, toutes les étapes partagent un seul lecteur. Au poste, l'étape suivante peut se
 * préparer en avance (`warm`), sauf sur une connexion lente. Au plus quelques lecteurs gardés ; les
 * plus anciens se libèrent.
 */
import { createContext, useContext } from 'react'

export class VideoPool {
  private free = new Map<string, HTMLVideoElement>()
  private used = new Set<HTMLVideoElement>()

  constructor(private readonly max = 3) {}

  /** Un lecteur neuf qui commence à télécharger au bon moment (`#t=`), pas au début de la vidéo. */
  private create(url: string, at = 0): HTMLVideoElement {
    const v = document.createElement('video')
    v.dataset.poolUrl = url
    v.muted = true
    v.playsInline = true
    v.setAttribute('playsinline', '')
    v.src = at > 0 && !url.includes('#') ? `${url}#t=${at}` : url
    return v
  }

  /** Le lecteur de cette adresse (déjà chargé s'il existe) ; un neuf s'il sert déjà ailleurs. */
  acquire(url: string, at = 0): HTMLVideoElement {
    const v = this.free.get(url)
    if (v) {
      this.free.delete(url)
      this.used.add(v)
      return v
    }
    const n = this.create(url, at)
    this.used.add(n)
    return n
  }

  /** Le lecteur n'est plus affiché : il reste prêt pour la prochaine étape qui lit la même vidéo. */
  release(v: HTMLVideoElement) {
    this.used.delete(v)
    v.pause()
    const url = v.dataset.poolUrl ?? ''
    const old = this.free.get(url)
    if (old && old !== v) this.drop(old)
    this.free.delete(url)
    this.free.set(url, v)
    this.trim()
  }

  /** Prépare la vidéo de l'étape suivante, au bon moment (rien si elle est déjà là). */
  warm(url: string, at: number) {
    if (this.has(url)) return
    const v = this.create(url, at)
    v.preload = 'auto'
    // Un navigateur qui ignore `#t=` : on se place au bon moment dès que la durée est connue.
    v.addEventListener(
      'loadedmetadata',
      () => {
        try {
          if (Math.abs(v.currentTime - at) > 0.3) v.currentTime = at
        } catch {
          /* le lecteur se positionnera à l'affichage */
        }
      },
      { once: true },
    )
    this.free.set(url, v)
    this.trim()
  }

  has(url: string) {
    return this.free.has(url) || [...this.used].some((v) => v.dataset.poolUrl === url)
  }

  private trim() {
    while (this.free.size > this.max) {
      const [url, v] = this.free.entries().next().value as [string, HTMLVideoElement]
      this.free.delete(url)
      this.drop(v)
    }
  }

  /** Libère un lecteur : plus de téléchargement ni de mémoire. */
  private drop(v: HTMLVideoElement) {
    stopVideo(v)
  }

  dispose() {
    for (const v of this.free.values()) this.drop(v)
    for (const v of this.used) this.drop(v)
    this.free.clear()
    this.used.clear()
  }
}

/**
 * Arrête pour de bon une vidéo qui a quitté l'écran. Détachée de la page, elle continuerait de
 * télécharger une dizaine de secondes d'avance (plusieurs Mo) jusqu'à ce que le navigateur la jette :
 * d'une étape à l'autre, ces téléchargements s'additionnaient et privaient la vidéo affichée de
 * réseau, jusqu'à la bloquer (mesuré à 3 Mbit/s : plus rien ne démarrait à la 6e étape).
 */
export function stopVideo(v: HTMLVideoElement) {
  v.pause()
  v.removeAttribute('src')
  try {
    v.load()
  } catch {
    /* rien à libérer */
  }
}

/** Arrête la vidéo après son démontage, sauf si elle est encore à l'écran (React, en mode strict, démonte puis remonte pour voir). */
export function stopWhenGone(v: HTMLVideoElement) {
  setTimeout(() => {
    if (!v.isConnected) stopVideo(v)
  }, 0)
}

/**
 * Ce que l'écran donne à ses vidéos : les lecteurs gardés (`pool`), la vidéo des étapes (`reel`,
 * toggle `stepReel`, au poste seulement) et la lecture fluide (`smooth`, toggle `smoothVideos`) :
 * une vidéo qui quitte l'écran arrête de télécharger, un lecteur repris d'une autre étape repart au
 * début de son extrait, et une liste de vidéos (« Tout voir ») ne charge et ne joue que celles qu'on voit.
 */
export interface MediaPlayback {
  pool: VideoPool | null
  reel: boolean
  smooth?: boolean
}
const PlaybackContext = createContext<MediaPlayback>({ pool: null, reel: false, smooth: false })
export const MediaPlaybackProvider = PlaybackContext.Provider
export const useMediaPlayback = () => useContext(PlaybackContext)

/** Une connexion lente ou en économie de données : rien ne se précharge, les vidéos attendent un toucher. */
export function slowConnection(): boolean {
  if (typeof navigator === 'undefined') return false
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  return !!c && (c.saveData === true || c.effectiveType === 'slow-2g' || c.effectiveType === '2g')
}
