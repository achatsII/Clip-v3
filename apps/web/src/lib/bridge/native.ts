/**
 * Côté web du pont avec la coquille native (packages/bridge). Hors de la coquille, `nativeEnv()`
 * vaut `null` et l'app prend le chemin du navigateur.
 */
import {
  BRIDGE_VERSION,
  WEB_RECEIVER,
  isEventMessage,
  isResponseMessage,
  type BridgeErrorCode,
  type BridgeEvent,
  type BridgeRequestMap,
  type BridgeRequestType,
  type Capability,
  type NativeEnvironment,
} from '@clip/bridge'
import { messages } from '@/lib/i18n'

declare global {
  interface Window {
    __CLIP_NATIVE__?: NativeEnvironment
    ReactNativeWebView?: { postMessage(message: string): void }
    [WEB_RECEIVER]?: (json: string) => void
  }
}

export class NativeError extends Error {
  code: BridgeErrorCode
  constructor(code: BridgeErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

type Pending = { resolve: (v: unknown) => void; reject: (e: unknown) => void; timer: ReturnType<typeof setTimeout> | null }
const pending = new Map<string, Pending>()
const eventListeners = new Set<(e: BridgeEvent) => void>()
let installed = false

function install() {
  if (installed || typeof window === 'undefined') return
  installed = true
  window[WEB_RECEIVER] = (json: string) => {
    let msg: unknown
    try {
      msg = typeof json === 'string' ? JSON.parse(json) : json
    } catch {
      return
    }
    if (isResponseMessage(msg)) {
      const p = pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id)
      if (p.timer) clearTimeout(p.timer)
      if (msg.ok) p.resolve(msg.result)
      else p.reject(new NativeError(msg.error.code, msg.error.message))
    } else if (isEventMessage(msg)) {
      eventListeners.forEach((fn) => fn(msg.event))
    }
  }
}

/** La page tourne-t-elle dans la coquille ? Sans effet de bord (ne pose pas l'écoute du pont). */
export function inNativeShell(): boolean {
  return typeof window !== 'undefined' && !!window.__CLIP_NATIVE__ && !!window.ReactNativeWebView
}

export function nativeEnv(): NativeEnvironment | null {
  if (typeof window === 'undefined') return null
  const env = window.__CLIP_NATIVE__
  if (!env || !window.ReactNativeWebView) return null
  install()
  return env
}

export function hasCapability(cap: Capability): boolean {
  return !!nativeEnv()?.capabilities.includes(cap)
}

export function callNative<T extends BridgeRequestType>(
  type: T,
  payload: BridgeRequestMap[T]['payload'],
  opts: { timeoutMs?: number } = {},
): Promise<BridgeRequestMap[T]['result']> {
  const env = nativeEnv()
  if (!env || !env.capabilities.includes(type as Capability)) return Promise.reject(new NativeError('unsupported', messages().auth.native.unavailable))
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return new Promise((resolve, reject) => {
    const timer = opts.timeoutMs ? setTimeout(() => {
      pending.delete(id)
      reject(new NativeError('failed', messages().auth.native.noResponse))
    }, opts.timeoutMs) : null
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer })
    window.ReactNativeWebView!.postMessage(JSON.stringify({ v: BRIDGE_VERSION, id, type, payload }))
  })
}

export function onNativeEvent(fn: (e: BridgeEvent) => void): () => void {
  install()
  eventListeners.add(fn)
  return () => eventListeners.delete(fn)
}

/** Vibration discrète quand la coquille le permet ; rien sinon. */
export function haptic(style: 'light' | 'medium' | 'success' | 'warning' | 'error' = 'light') {
  if (hasCapability('haptics')) void callNative('haptics', { style }).catch(() => undefined)
  else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(style === 'error' ? [30, 40, 30] : 12)
    } catch {
      /* non pris en charge */
    }
  }
}
