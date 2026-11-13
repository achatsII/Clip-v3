'use client'

import { useSyncExternalStore } from 'react'

/**
 * Suit une requête média (`(min-width: 1024px)`, l'orientation…) sans recharger l'écran. Côté
 * serveur et au premier rendu, `false` : l'écran se dessine pour le téléphone, puis s'ajuste.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Un écran d'ordinateur (ou une tablette à l'horizontale) : la vue en grand, les colonnes côte à côte. */
export const WIDE = '(min-width: 1024px)'

export function useWide(): boolean {
  return useMediaQuery(WIDE)
}
