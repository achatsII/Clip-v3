import { Platform } from 'react-native'

/**
 * Journalisation de la coquille. Tout passe par `logEvent` et `logError` : brancher un outil plus
 * tard ne touchera que ce fichier. Chaque entrée porte la version de la coquille et
 * l'organisation connectée (reçue de la page par `context.set`), sinon une erreur ne se
 * reproduit pas quand plusieurs versions circulent.
 */
export interface LogContext {
  screen?: string
  action?: string
  [key: string]: unknown
}

const base = {
  appVersion: 'unknown',
  platform: Platform.OS,
  installId: null as string | null,
  organizationId: null as string | null,
  userId: null as string | null,
}

export function configureLogging(values: Partial<typeof base>): void {
  Object.assign(base, values)
}

export function setSessionContext(organizationId: string | null, userId: string | null): void {
  base.organizationId = organizationId
  base.userId = userId
}

export function logEvent(name: string, payload: Record<string, unknown> = {}, context: LogContext = {}): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ level: 'info', event: name, ...base, context, payload, at: new Date().toISOString() }))
}

export function logError(error: unknown, context: LogContext = {}): void {
  const err =
    error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) }
  // eslint-disable-next-line no-console
  console.warn(JSON.stringify({ level: 'error', ...base, context, error: err, at: new Date().toISOString() }))
}
