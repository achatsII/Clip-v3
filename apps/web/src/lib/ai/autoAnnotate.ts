'use client'

/**
 * Les annotations automatiques d'une génération, en deux temps.
 *
 * 1. La génération regarde toute la vidéo, en basse définition et environ une image par seconde :
 *    elle sait QUELLES images méritent un repère (`focusLabel` : ce qu'il faut montrer), mais elle
 *    ne peut pas placer ce repère au pixel près sur une image qu'elle n'a pas vue exactement.
 * 2. Une fois les images tirées de la vidéo, chacune est annotée sur l'image elle-même, en haute
 *    définition, par le même appel que « Annoter avec l'IA » (`annotateImage`) — celui qui tombe juste.
 *
 * Au choix de la personne (`clip_pref_auto_annotate`, gardé sur l'appareil ; oui par défaut). Un
 * extrait vidéo n'est jamais annoté ; l'IA ne marque que les images où un repère aide vraiment.
 */
import { useSyncExternalStore } from 'react'
import type { AiApi } from '../gateway/ai'
import { ApiError } from '../gateway/client'
import type { InstructionContent, StepMedia } from '../model/types'
import { annotateImage } from './assist'
import type { MarkHint } from './normalize'


const KEY = 'clip_pref_auto_annotate'
const listeners = new Set<() => void>()

export function readAutoAnnotate(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setAutoAnnotate(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* appareil sans stockage : le choix vaut pour cette page */
  }
  listeners.forEach((fn) => fn())
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useAutoAnnotate(): boolean {
  return useSyncExternalStore(subscribe, readAutoAnnotate, () => true)
}

export interface AnnotateOutcome {
  content: InstructionContent
  /** Les images annotées. */
  marked: number
  /** Arrêté par un refus de facturation (plus de crédits, fonction non incluse) : la suite est sautée. */
  stopped: boolean
}

/**
 * Annote les images demandées, trois à la fois. Une image qui échoue reste sans marque ; un refus
 * de facturation arrête la suite (la fenêtre des refus l'a déjà dit). Ne lève jamais : la génération
 * est faite, les annotations ne sont qu'un plus.
 */
export async function annotateMarks(
  ai: AiApi,
  content: InstructionContent,
  marks: MarkHint[],
  opts: { onProgress?: (done: number, total: number) => void; concurrency?: number } = {},
): Promise<AnnotateOutcome> {
  const next: InstructionContent = { ...content, steps: content.steps.map((s) => ({ ...s, media: s.media.map((m) => ({ ...m })) as StepMedia[] })) }
  const todo = marks.filter((m) => {
    const media = next.steps.find((s) => s.id === m.stepId)?.media[m.mediaIndex]
    return media?.kind === 'image' && !!media.url && !media.annotations?.length
  })
  let done = 0
  let marked = 0
  let stopped = false
  opts.onProgress?.(0, todo.length)
  const queue = [...todo]
  async function worker() {
    for (let job = queue.shift(); job && !stopped; job = queue.shift()) {
      const step = next.steps.find((s) => s.id === job!.stepId)
      const media = step?.media[job.mediaIndex]
      if (step && media?.kind === 'image' && media.url) {
        try {
          const annotations = await annotateImage(ai, media.url, step, undefined, job.hint)
          step.media[job.mediaIndex] = { ...media, annotations }
          marked += 1
        } catch (e) {
          if (e instanceof ApiError && (e.status === 402 || e.status === 403)) stopped = true
        }
      }
      done += 1
      opts.onProgress?.(done, todo.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 3, todo.length) }, worker))
  return { content: next, marked, stopped }
}
