'use client'

import { useLayoutEffect } from 'react'

/**
 * L'écran prend toute la place : la barre du haut et la navigation du bas de l'app s'effacent
 * (`html[data-immersive]`, globals.css) le temps qu'il est ouvert. Posé avant le premier dessin :
 * rien ne clignote.
 */
export function useImmersive(on = true) {
  useLayoutEffect(() => {
    if (!on) return
    const el = document.documentElement
    el.dataset.immersive = ''
    return () => {
      delete el.dataset.immersive
    }
  }, [on])
}
