'use client'

/**
 * Les proportions réelles des médias (largeur ÷ hauteur), apprises en les affichant : une photo à
 * son chargement, une vidéo à ses métadonnées, la page d'un document à son image. Le lecteur s'en
 * sert au téléphone pour donner au média la hauteur qu'il lui faut, sans bandes noires (toggle
 * `phoneReader`). Elles restent connues le temps de la séance : revenir à une étape ne fait plus
 * bouger l'écran.
 */
import { useSyncExternalStore } from 'react'
import type { StepMedia } from '@/lib/model/types'
import { playable } from './reel'

const ratios = new Map<string, number>()
const listeners = new Set<() => void>()

/** Ce que l'affichage a appris d'un média. Une valeur absurde est ignorée. */
export function reportRatio(key: string | null | undefined, ratio: number) {
  if (!key || !Number.isFinite(ratio) || ratio <= 0.1 || ratio > 10) return
  const r = Math.round(ratio * 1000) / 1000
  if (ratios.get(key) === r) return
  ratios.set(key, r)
  listeners.forEach((fn) => fn())
}

export function knownRatio(key: string | null | undefined): number | null {
  return key ? (ratios.get(key) ?? null) : null
}

/**
 * Où chercher les proportions d'un média, dans l'ordre : ce qui s'affiche vraiment (la vidéo des
 * étapes quand elle sert, la page d'un document), puis l'image d'attente d'une vidéo (connue avant
 * ses métadonnées). Un schéma n'en a pas : il prend la place qu'on lui donne.
 */
export function ratioKeys(media: StepMedia | undefined, reel: boolean): string[] {
  if (!media) return []
  if (media.kind === 'image') return [media.url]
  if (media.kind === 'video') return [playable(media, reel).url, ...(media.posterUrl ? [media.posterUrl] : [])]
  if (media.kind === 'document') return media.pageImageUrl ? [media.pageImageUrl] : []
  return []
}

/** L'image d'attente d'une vidéo : lue à part (le navigateur la garde), elle donne les proportions tout de suite. */
export function probeImage(url: string) {
  if (ratios.has(url) || typeof Image === 'undefined') return
  const img = new Image()
  img.onload = () => reportRatio(url, img.naturalWidth / Math.max(1, img.naturalHeight))
  img.src = url
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** Les premières proportions connues parmi `keys`, ou null ; l'écran suit dès qu'elles arrivent. */
export function useMediaRatio(keys: string[]): number | null {
  const joined = keys.join('\n')
  return useSyncExternalStore(
    subscribe,
    () => {
      for (const k of joined ? joined.split('\n') : []) {
        const r = ratios.get(k)
        if (r) return r
      }
      return null
    },
    () => null,
  )
}
