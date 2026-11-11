'use client'

/**
 * Le clavier du téléphone. Sur iPhone, il recouvre la page sans la rétrécir : une barre fixée en bas
 * (navigation, « Modifier avec l'IA », fenêtres) se retrouve au milieu de l'écran ou sous le clavier.
 * On mesure ce qu'il cache (`visualViewport`) et on le dit à la page :
 * - `--kb` sur <html> : la hauteur cachée, en px (0 sur Android, où la page rétrécit d'elle-même),
 *   et `--kb-top` : de combien iOS a fait glisser la vue vers le haut ;
 * - `data-kb="open"` sur <html> pendant une saisie au doigt.
 * Les classes `kb-hide`, `kb-lift`, `kb-bottom`, `kb-frame` et `kb-fit` (globals.css) en tirent la mise en page.
 */
import { useEffect, useSyncExternalStore } from 'react'

/** Hauteur cachée par le clavier, en px ; 0 si la vue est zoomée (pincement au bureau) ou s'il n'y a rien. */
export function keyboardInset(innerHeight: number, vv: { height: number; offsetTop: number; scale: number }): number {
  if (Math.abs(vv.scale - 1) > 0.01) return 0
  const hidden = Math.round(innerHeight - (vv.height + vv.offsetTop))
  return hidden > 120 ? hidden : 0
}

const EDITABLE = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]):not([type=file]):not([readonly]), textarea:not([readonly]), [contenteditable="true"]'

let installed = false
let open = false
const listeners = new Set<() => void>()

function typingWithFinger(): boolean {
  const el = document.activeElement
  return !!el && el.matches(EDITABLE) && window.matchMedia('(pointer: coarse)').matches
}

function measure() {
  const root = document.documentElement
  const vv = window.visualViewport
  const inset = vv ? keyboardInset(window.innerHeight, vv) : 0
  root.style.setProperty('--kb', `${inset}px`)
  // iOS peut aussi faire glisser la vue vers le haut : une fenêtre doit commencer là où l'écran commence.
  root.style.setProperty('--kb-top', `${inset > 0 && vv ? Math.max(0, Math.round(vv.offsetTop)) : 0}px`)
  const next = inset > 0 || typingWithFinger()
  if (next === open) return
  open = next
  if (next) root.dataset.kb = 'open'
  else delete root.dataset.kb
  listeners.forEach((l) => l())
}

export function installKeyboardInset() {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.visualViewport?.addEventListener('resize', measure)
  window.visualViewport?.addEventListener('scroll', measure)
  // Le clavier s'anime : on mesure au focus, puis encore quand il a fini de monter.
  const soon = () => {
    measure()
    setTimeout(measure, 350)
  }
  document.addEventListener('focusin', soon)
  document.addEventListener('focusout', soon)
  measure()
}

/** Vrai pendant une saisie au doigt (clavier ouvert). Installe la mesure au premier appel. */
export function useKeyboardOpen(): boolean {
  useEffect(installKeyboardInset, [])
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => open,
    () => false,
  )
}
