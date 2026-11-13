/**
 * Portée des liens publics (jetons guest), bâtie côté serveur à partir du type de lien et de la
 * ressource partagée. Voir docs/architecture.md, « Liens publics sans compte ».
 */
export type LinkType = 'station' | 'instruction'

export interface Scope {
  resources: Array<{ data_type: string; filter?: Record<string, unknown>; actions: string[] }>
}

/** La version de cette portée, rangée sur le poste avec son lien. */
export { LINK_SCOPE_VERSION } from '../model/linkScope'

export function buildScope(type: LinkType, id: string, opts: { mode?: 'focus' | 'only'; sharedApp: boolean; slug: string }): Scope {
  const withSlug = (filter: Record<string, unknown> = {}) => (opts.sharedApp ? { ...filter, 'json_data.app_identifier': opts.slug } : filter)
  const resources: Scope['resources'] = []
  if (type === 'station') {
    resources.push({ data_type: 'clip_station', filter: { _id: id }, actions: ['read'] })
    resources.push({ data_type: 'clip_published', filter: withSlug(opts.mode === 'only' ? { 'json_data.stationIds': id } : {}), actions: ['read'] })
  } else {
    resources.push({ data_type: 'clip_published', filter: withSlug({ 'json_data.instructionId': id }), actions: ['read'] })
  }
  resources.push({ data_type: 'clip_feedback', actions: ['insert'] })
  resources.push({ data_type: 'clip_event', actions: ['insert'] })
  // Qui travaille au poste : les noms de l'équipe, seulement sur la tablette d'un poste (jamais par le
  // lien d'une instruction, qui peut sortir de l'usine). Les codes n'y sont que des empreintes
  // inutilisables sans la clé du serveur.
  if (type === 'station') resources.push({ data_type: 'clip_operator', filter: withSlug({ 'json_data.active': true }), actions: ['read'] })
  resources.push({ data_type: 'clip_execution', actions: ['insert'] })
  resources.push({ data_type: 'clip_training', actions: ['insert'] })
  return { resources }
}

/**
 * Tout lien lit à voix haute, par la voix en direct (`ai:live`) ; l'assistant vocal (questions,
 * navigation à la voix) ne s'ouvre que sur un poste qui l'a demandé (`assistant:ask`).
 */
export function permissionsFor(type: LinkType, assistant: boolean): string[] {
  const permissions = ['data:read', 'data:write', 'ai:live', 'files:write']
  if (type === 'station' && assistant) permissions.push('assistant:ask')
  return permissions
}
