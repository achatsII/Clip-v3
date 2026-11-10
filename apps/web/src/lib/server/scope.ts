/**
 * Portée des liens publics (jetons guest), bâtie côté serveur à partir du type de lien et de la
 * ressource partagée. Voir docs/architecture.md, « Liens publics sans compte ».
 */
export type LinkType = 'station' | 'instruction'

export interface Scope {
  resources: Array<{ data_type: string; filter?: Record<string, unknown>; actions: string[] }>
}

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
  return { resources }
}

export function permissionsFor(type: LinkType, assistant: boolean): string[] {
  const permissions = ['data:read', 'data:write', 'ai:tts', 'files:write']
  if (type === 'station' && assistant) permissions.push('assistant:ask', 'ai:live')
  return permissions
}
