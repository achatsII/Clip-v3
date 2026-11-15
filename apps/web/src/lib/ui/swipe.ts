'use client'

/**
 * Changer d'étape d'un glissement du doigt, comme au poste : à gauche, l'étape suivante ; à droite,
 * la précédente. Le même geste au poste et dans l'éditeur au téléphone (toggle `editorSwipe`).
 *
 * Dans l'éditeur, le texte de l'étape est fait de champs : un glissement sur un champ qu'on n'est pas
 * en train d'écrire change d'étape (un doigt qui glisse ne l'ouvre pas). Il ne change jamais d'étape
 * pendant qu'on écrit (clavier ouvert), ni quand le geste appartient à autre chose : une vidéo, un
 * curseur, un dessin, une rangée qui défile de côté, un texte qu'on sélectionne (un appui long), ou
 * une fenêtre ouverte par-dessus (ses événements remontent l'arbre de React sans être dans la page).
 */
import { useRef, type TouchEvent } from 'react'

/** Assez long, et nettement plus de côté que vers le bas : un défilement un peu oblique reste un défilement. */
export const SWIPE_MIN = 70
export const SWIPE_RATIO = 1.5
/** Un glissement est bref ; au-delà, c'est un appui long (sélectionner du texte, déplacer le curseur). */
export const SWIPE_MAX_MS = 800

/** -1 : l'étape précédente ; 1 : la suivante ; 0 : ce n'était pas un glissement de côté. */
export function swipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) <= SWIPE_MIN || Math.abs(dx) <= Math.abs(dy) * SWIPE_RATIO) return 0
  return dx < 0 ? 1 : -1
}

/** Les champs où l'on écrit (une liste déroulante restée active après un choix n'en est pas un). */
const TYPING =
  'textarea, [contenteditable=""], [contenteditable="true"], input:not([type]), input[type="text"], input[type="search"], input[type="number"], input[type="email"], input[type="tel"], input[type="url"], input[type="password"]'
const OWN_GESTURES = 'input[type="range"], video, iframe, canvas, [data-no-swipe]'

/** Écrit-on en ce moment (un champ a le clavier) ? */
export function typing(): boolean {
  return typeof document !== 'undefined' && !!document.activeElement?.closest?.(TYPING)
}

/** Ce toucher appartient-il à un élément qui a ses propres gestes ? */
export function ownsGesture(target: EventTarget | null, root: Element | null): boolean {
  const el = target instanceof Element ? target : null
  if (!el || (root && !root.contains(el))) return true
  if (el.closest(OWN_GESTURES)) return true
  // Une rangée qui défile de côté (vignettes, actions) garde son geste.
  for (let n: Element | null = el; n && n !== root; n = n.parentElement) {
    const x = getComputedStyle(n).overflowX
    if ((x === 'auto' || x === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true
  }
  return false
}

/** Les gestionnaires à poser sur la zone de l'étape. `go(1)` : la suivante ; `go(-1)` : la précédente. */
export function useStepSwipe(enabled: boolean, go: (dir: -1 | 1) => void) {
  const start = useRef<{ x: number; y: number; at: number } | null>(null)
  if (!enabled) return {}
  return {
    onTouchStart: (e: TouchEvent<HTMLElement>) => {
      start.current = e.touches.length === 1 && !typing() && !ownsGesture(e.target, e.currentTarget) ? { x: e.touches[0].clientX, y: e.touches[0].clientY, at: Date.now() } : null
    },
    onTouchEnd: (e: TouchEvent<HTMLElement>) => {
      const s = start.current
      start.current = null
      // Le geste a ouvert un champ ou sélectionné du texte, ou c'était un appui long : ce n'était pas pour changer d'étape.
      if (!s || e.changedTouches.length !== 1 || Date.now() - s.at > SWIPE_MAX_MS || typing() || window.getSelection?.()?.toString()) return
      const dir = swipeDirection(e.changedTouches[0].clientX - s.x, e.changedTouches[0].clientY - s.y)
      if (dir) go(dir)
    },
    onTouchCancel: () => {
      start.current = null
    },
  }
}
