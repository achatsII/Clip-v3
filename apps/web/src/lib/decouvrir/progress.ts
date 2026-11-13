/**
 * Ce que la personne a regardé dans l'espace Découvrir, gardé dans ce navigateur (aucune connexion
 * requise) : le plus loin atteint, les secondes vraiment regardées, « vue » à 92 % (les génériques de
 * fin). Un confort pour la personne (reprendre le parcours, « Vue » sur les cartes), pas le suivi ; un
 * stockage bloqué (navigation privée) n'empêche pas la vidéo de jouer. Navigateur seulement.
 */
import { useSyncExternalStore } from 'react'

export interface LocalView {
  id: string
  /** Première lecture (ms epoch). */
  startedAt: number
  /** Dernière activité (ms epoch). */
  lastAt: number
  /** Plus loin atteint, en % de la durée (0 à 100). */
  maxPct: number
  /** Secondes réellement regardées (un saut ne compte pas). */
  watchedSec: number
  completed: boolean
}

/** 92 % compte comme une vidéo vue. */
export const SEEN_PCT = 92
const KEY = 'clip_decouvrir_vues'
const EVENT = 'clip-decouvrir-vues'
const EMPTY: LocalView[] = []

let cacheRaw: string | null = null
let cacheViews: LocalView[] = EMPTY

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function parse(raw: string | null): LocalView[] {
  if (raw === cacheRaw) return cacheViews
  cacheRaw = raw
  try {
    const v = raw ? (JSON.parse(raw) as LocalView[]) : EMPTY
    cacheViews = Array.isArray(v) ? v.filter((x) => x && typeof x.id === 'string') : EMPTY
  } catch {
    cacheViews = EMPTY
  }
  return cacheViews
}

/** Les vues de ce navigateur, la plus récente d'abord. */
export function readLocalViews(): LocalView[] {
  return parse(readRaw())
}

function write(views: LocalView[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(views.slice(0, 50)))
  } catch {
    /* navigation privée ou stockage bloqué : la vidéo joue quand même */
  }
  window.dispatchEvent(new Event(EVENT))
}

/** Une lecture avance : on garde le plus loin atteint ; 92 % compte comme vue. */
export function recordProgress(id: string, pct: number, deltaSec = 0) {
  const now = Date.now()
  const views = readLocalViews().slice()
  const i = views.findIndex((v) => v.id === id)
  const cur: LocalView = i >= 0 ? { ...views[i] } : { id, startedAt: now, lastAt: now, maxPct: 0, watchedSec: 0, completed: false }
  cur.lastAt = now
  cur.maxPct = Math.max(cur.maxPct, Math.min(100, Math.round(pct)))
  cur.watchedSec = Math.round((cur.watchedSec + Math.max(0, deltaSec)) * 10) / 10
  cur.completed = cur.completed || cur.maxPct >= SEEN_PCT
  if (i >= 0) views.splice(i, 1)
  views.unshift(cur)
  write(views)
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && cb()
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', onStorage)
  }
}

/** Les vues, à jour quand une vidéo avance (ici ou dans un autre onglet). Rendu serveur : aucune. */
export function useLocalViews(): LocalView[] {
  return useSyncExternalStore(subscribe, readLocalViews, () => EMPTY)
}
