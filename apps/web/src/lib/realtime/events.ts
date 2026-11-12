/**
 * Le temps réel (Ably) : un canal par organisation, où les appareils d'une même usine se disent ce
 * qui change. Les messages ne portent que des identifiants, des titres et des noms : chaque écran
 * relit ensuite la Gateway, qui reste la seule source.
 */
export type CreationEvent = {
  type: 'creation'
  id: string
  phase: 'start' | 'stage' | 'done' | 'failed'
  title?: string
  stage?: string
}

/**
 * Un brouillon vient d'être enregistré sur un appareil : l'éditeur ouvert sur la même instruction
 * ailleurs le relit et va à l'étape changée (`steps`, dans l'ordre).
 */
export type DraftEvent = {
  type: 'draft'
  id: string
  title?: string
  userId?: string
  byName?: string
  device: 'app' | 'web'
  steps?: string[]
  /** L'appareil qui l'envoie (une même personne peut en avoir deux). */
  from: string
}

export type RealtimeEvent = CreationEvent | DraftEvent

/** Le canal de l'organisation : seuls ses membres reçoivent un jeton pour lui. */
export const orgChannel = (orgId: string) => `clip:org:${orgId.toLowerCase()}`

/**
 * Ce que l'écran relit à chaque événement : la liste des créations, et à la fin l'instruction et les
 * listes. Un brouillon enregistré ne relit que son instruction (le lecteur ouvert dessus suit) : les
 * listes n'ont pas à se relire à chaque enregistrement.
 */
export function refreshFor(e: RealtimeEvent): Array<'creations' | 'instructions' | `instruction:${string}`> {
  if (e.type === 'draft') return [`instruction:${e.id}`]
  if (e.phase === 'stage') return ['creations']
  if (e.phase === 'start') return ['creations', 'instructions']
  return ['creations', 'instructions', `instruction:${e.id}`]
}

export function isRealtimeEvent(v: unknown): v is RealtimeEvent {
  const e = v as Record<string, unknown> | null
  if (!e || typeof e !== 'object' || typeof e.id !== 'string') return false
  if (e.type === 'creation') return typeof e.phase === 'string' && ['start', 'stage', 'done', 'failed'].includes(e.phase)
  if (e.type === 'draft') return (e.device === 'app' || e.device === 'web') && typeof e.from === 'string' && (e.steps === undefined || (Array.isArray(e.steps) && e.steps.every((x) => typeof x === 'string')))
  return false
}
