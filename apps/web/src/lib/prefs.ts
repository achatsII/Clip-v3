'use client'

/**
 * Les petites préférences de l'appareil (localStorage) : une carte repliée, une instruction déjà
 * vue. Les écrans les suivent sans recharger. Le stockage peut manquer (navigation privée) : rien
 * ne casse, la préférence est simplement oubliée.
 */
import { useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => e.key?.startsWith('clip_') && fn()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}

export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writePref(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* préférence facultative */
  }
  listeners.forEach((fn) => fn())
}

export function usePref(key: string): string | null {
  return useSyncExternalStore(subscribe, () => readPref(key), () => null)
}

/** Une liste d'identifiants retenue sur l'appareil (les plus récents gardés). */
function readIds(key: string): string[] {
  try {
    const v = JSON.parse(readPref(key) ?? '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function setInIdList(key: string, id: string, on: boolean, cap = 100) {
  const ids = readIds(key)
  const has = ids.includes(id)
  if (on === has) return
  writePref(key, JSON.stringify(on ? [...ids, id].slice(-cap) : ids.filter((x) => x !== id)))
}

export function useIdList(key: string): string[] {
  const raw = usePref(key)
  try {
    const v = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(v) ? (v as string[]) : []
  } catch {
    return []
  }
}

/** Les instructions créées par l'IA déjà ouvertes sur cet appareil : l'accueil ne les propose plus. */
const SEEN = 'clip_seen_created'
export const markCreatedSeen = (id: string) => setInIdList(SEEN, id, true, 80)
export const useSeenCreated = () => useIdList(SEEN)

