'use client'

/**
 * Lire ou modifier, depuis la bibliothèque : ce que fait le toucher d'une carte, au choix de qui
 * rédige et retenu sur l'appareil. « Lire » ouvre la version publiée, comme au poste ; « Modifier »,
 * le brouillon dans l'éditeur. Qui ne rédige pas lit toujours.
 */
import { useSyncExternalStore } from 'react'

export type LibraryMode = 'edit' | 'read'

const KEY = 'clip_pref_library_mode'
const listeners = new Set<() => void>()

function read(): LibraryMode {
  try {
    return localStorage.getItem(KEY) === 'read' ? 'read' : 'edit'
  } catch {
    return 'edit'
  }
}

export function setLibraryMode(mode: LibraryMode) {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* appareil sans stockage : le choix vaut pour cette page */
  }
  listeners.forEach((l) => l())
}

export function useLibraryMode(canWrite: boolean): LibraryMode {
  const mode = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    read,
    () => 'edit' as LibraryMode,
  )
  return canWrite ? mode : 'read'
}

/** Où mène une instruction : sa lecture (si elle est publiée) ou son éditeur. */
export const instructionHref = (id: string, mode: LibraryMode, published: boolean) => (mode === 'read' && published ? `/instructions/${id}/lire` : `/instructions/${id}`)
