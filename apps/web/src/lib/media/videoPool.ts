'use client'

/**
 * Les lecteurs vidéo du lecteur d'instruction, gardés d'une étape à l'autre : un par adresse. En
 * passant à l'étape suivante, le même lecteur saute au bon moment, avec ce qu'il a déjà
 * téléchargé : rien ne se recharge. Avec la vidéo des étapes, toutes les étapes partagent un seul
 * lecteur. L'étape suivante peut se préparer en avance (`warm`), sauf sur une connexion lente.
 * Au plus quelques lecteurs gardés ; les plus anciens se libèrent.
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
    v.pause()
    v.removeAttribute('src')
    try {
      v.load()
    } catch {
      /* rien à libérer */
    }
  }

  dispose() {
    for (const v of this.free.values()) this.drop(v)
    for (const v of this.used) this.drop(v)
    this.free.clear()
    this.used.clear()
  }
}

/** Ce que le lecteur d'instruction donne à ses vidéos : les lecteurs gardés, et la vidéo des étapes (toggle `stepReel`). */
export interface MediaPlayback {
  pool: VideoPool | null
  reel: boolean
}
const PlaybackContext = createContext<MediaPlayback>({ pool: null, reel: false })
export const MediaPlaybackProvider = PlaybackContext.Provider
export const useMediaPlayback = () => useContext(PlaybackContext)

/** Une connexion lente ou en économie de données : rien ne se précharge, les vidéos attendent un toucher. */
export function slowConnection(): boolean {
  if (typeof navigator === 'undefined') return false
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  return !!c && (c.saveData === true || c.effectiveType === 'slow-2g' || c.effectiveType === '2g')
}
