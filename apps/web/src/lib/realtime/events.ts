/**
 * Le temps réel (Ably) : un canal par organisation, où les appareils d'une même usine se disent ce
 * qui change. Les messages ne portent que des identifiants et des titres : chaque écran relit
 * ensuite la Gateway, qui reste la seule source.
 */
export type RealtimeEvent = {
  type: 'creation'
  id: string
  phase: 'start' | 'stage' | 'done' | 'failed'
  title?: string
  stage?: string
}

/** Le canal de l'organisation : seuls ses membres reçoivent un jeton pour lui. */
export const orgChannel = (orgId: string) => `clip:org:${orgId.toLowerCase()}`

/** Ce que l'écran relit à chaque événement : la liste des créations, et à la fin l'instruction et les listes. */
export function refreshFor(e: RealtimeEvent): Array<'creations' | 'instructions' | `instruction:${string}`> {
  if (e.type !== 'creation') return []
  if (e.phase === 'stage') return ['creations']
  if (e.phase === 'start') return ['creations', 'instructions']
  return ['creations', 'instructions', `instruction:${e.id}`]
}

export function isRealtimeEvent(v: unknown): v is RealtimeEvent {
  const e = v as Partial<RealtimeEvent> | null
  return !!e && e.type === 'creation' && typeof e.id === 'string' && ['start', 'stage', 'done', 'failed'].includes(e.phase ?? '')
}
