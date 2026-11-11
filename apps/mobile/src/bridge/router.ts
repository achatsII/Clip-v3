import { BridgeError } from './errors'
import {
  BRIDGE_VERSION,
  type BridgeRequestMap,
  type BridgeRequestType,
  type BridgeResponseMessage,
  type Capability,
} from './protocol'
import { isKnownRequestType, validators } from './validate'
import { strings } from '../i18n'

export type BridgeHandlers = {
  [T in BridgeRequestType]: (payload: BridgeRequestMap[T]['payload']) => Promise<BridgeRequestMap[T]['result']>
}

export interface RouterDeps {
  handlers: Partial<BridgeHandlers>
  /** Les capacités annoncées en ce moment (elles changent avec la configuration du serveur). */
  capabilities: () => readonly Capability[]
  onError?: (error: unknown, context: { type?: string }) => void
}

function errorResponse(id: string, code: BridgeError['code'], message: string): BridgeResponseMessage {
  return { v: BRIDGE_VERSION, id, ok: false, error: { code, message } }
}

/**
 * Traite un message reçu de la page et rend la réponse à lui renvoyer, ou `null` quand le
 * message n'est pas une requête du pont (rien à répondre sans identifiant).
 *
 * - type inconnu, ou capacité non annoncée en ce moment : `unsupported` ;
 * - charge utile invalide : `failed`, avec la raison ;
 * - erreur d'un module : son code (`cancelled`, `permission_denied`…) ou `failed`.
 */
export async function routeBridgeMessage(raw: string, deps: RouterDeps): Promise<BridgeResponseMessage | null> {
  let msg: unknown
  try {
    msg = JSON.parse(raw)
  } catch {
    return null
  }
  if (!msg || typeof msg !== 'object') return null
  const { id, type, payload } = msg as { id?: unknown; type?: unknown; payload?: unknown }
  if (typeof id !== 'string' || !id || !('type' in (msg as object))) return null

  if (!isKnownRequestType(type)) {
    return errorResponse(id, 'unsupported', strings().errors.unknownRequest(String(type)))
  }
  if (!deps.capabilities().includes(type as Capability)) {
    return errorResponse(id, 'unsupported', strings().errors.notNow(type))
  }
  const handler = deps.handlers[type] as ((p: unknown) => Promise<unknown>) | undefined
  if (!handler) {
    return errorResponse(id, 'unsupported', strings().errors.notInVersion(type))
  }

  const validation = validators[type](payload)
  if (!validation.ok) return errorResponse(id, 'failed', strings().errors.invalidRequest(validation.reason))

  try {
    const result = await handler(validation.value)
    return { v: BRIDGE_VERSION, id, ok: true, result } as BridgeResponseMessage
  } catch (e) {
    if (e instanceof BridgeError) return errorResponse(id, e.code, e.message)
    deps.onError?.(e, { type })
    return errorResponse(id, 'failed', e instanceof Error ? e.message : strings().errors.unexpected)
  }
}
