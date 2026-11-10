import { useEffect, useRef } from 'react'

/**
 * Le bouton retour d'Android, quand un écran de capture est ouvert dans une Modal, arrive à
 * `onRequestClose` de la Modal et non au BackHandler. L'écran visible y inscrit son geste de
 * fermeture (le même que son bouton « Fermer »).
 */
let current: (() => void) | null = null

export function runBackAction(): void {
  current?.()
}

export function useBackAction(action: () => void): void {
  const ref = useRef(action)
  ref.current = action
  useEffect(() => {
    const fn = () => ref.current()
    current = fn
    return () => {
      if (current === fn) current = null
    }
  }, [])
}
