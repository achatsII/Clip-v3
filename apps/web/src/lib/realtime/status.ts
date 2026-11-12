/**
 * Le diagnostic du temps réel : la clé Ably est-elle là, et Ably l'accepte-t-il avec les droits dont
 * l'app a besoin (publier, écouter et présence sur un canal d'organisation) ? Une vraie demande de
 * jeton à Ably, sur un canal de diagnostic. Rien de la clé ne sort ; le résultat se garde 10 minutes
 * pour ne pas solliciter Ably à chaque appel.
 */
import { Rest } from 'ably'
import { orgChannel } from './events'

export interface RealtimeStatus {
  /** La clé est fournie au serveur (`ABLY_KEY`). */
  configured: boolean
  /** Ably accepte la clé et ses droits suffisent. */
  ok: boolean
  /** Le code d'erreur d'Ably quand il refuse (40101 : clé invalide ; 40160 : droits insuffisants). */
  code?: number
}

const KEEP_MS = 10 * 60_000
let kept: { key: string; at: number; status: RealtimeStatus } | null = null

export async function realtimeStatus(key: string | undefined, now = Date.now()): Promise<RealtimeStatus> {
  if (!key) return { configured: false, ok: false }
  if (kept && kept.key === key && now - kept.at < KEEP_MS) return kept.status
  let status: RealtimeStatus
  try {
    await new Rest({ key }).auth.requestToken({ capability: { [orgChannel('diagnostic')]: ['publish', 'subscribe', 'presence'] }, ttl: 60_000 })
    status = { configured: true, ok: true }
  } catch (e) {
    const code = (e as { code?: unknown })?.code
    status = { configured: true, ok: false, ...(typeof code === 'number' ? { code } : {}) }
  }
  kept = { key, at: now, status }
  return status
}
