/**
 * Les codes des opérateurs (côté serveur seulement) : un code à 4 chiffres n'est jamais gardé en
 * clair. On garde son empreinte HMAC, liée à la personne, avec une clé que seul le serveur connaît :
 * la lire dans la base ne sert à rien. Le code est tiré au hasard par le serveur, jamais choisi. La vérification passe par le serveur, qui
 * bloque un nom après plusieurs essais ratés, et rend une session signée pour ce poste.
 *
 * La clé : `CLIP_PIN_SECRET` si elle existe ; sinon une clé propre à cet usage, dérivée (HKDF) de la
 * clé du temps réel du serveur (`ABLY_KEY`). L'empreinte porte l'identifiant de sa clé (`s1:`, `a1:`) :
 * ajouter `CLIP_PIN_SECRET` plus tard n'invalide pas les codes déjà donnés.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { currentKeyId, keyFor, type KeyId } from './keys'

export { currentKeyId }

/** Un code valide : 4 chiffres. */
export const PIN = /^\d{4}$/

/** L'empreinte d'un code, liée à la personne (son identifiant est unique). */
export function hashPin(operatorId: string, pin: string, keyId: KeyId | null = currentKeyId()): string | null {
  const key = keyId ? keyFor(keyId, 'operator-pin-v1') : null
  if (!key || !PIN.test(pin)) return null
  return `${keyId}:${createHmac('sha256', key).update(`${operatorId}:${pin}`).digest('base64url')}`
}

/** Le code tapé correspond-il à l'empreinte gardée ? Comparaison à temps constant. */
export function checkPin(operatorId: string, pin: string, stored: string | null | undefined): boolean {
  if (!stored) return false
  const id = stored.split(':')[0]
  if (id !== 's1' && id !== 'a1') return false
  const h = hashPin(operatorId, pin, id)
  if (!h) return false
  const a = Buffer.from(h)
  const b = Buffer.from(stored)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Un code au hasard (0000 à 9999, sans les suites trop évidentes). */
export function randomPin(rand: () => number = Math.random): string {
  const weak = new Set(['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '9876'])
  for (;;) {
    const pin = String(Math.floor(rand() * 10_000)).padStart(4, '0')
    if (!weak.has(pin)) return pin
  }
}

export interface OperatorSession {
  /** L'opérateur, son nom, le lien du poste et l'usine. */
  op: string
  name: string
  link: string
  org: string
  /** L'échéance (ms). */
  exp: number
}

/** Une session signée : on sait qui travaille au poste, sans la base, jusqu'à l'échéance. */
export function signSession(s: OperatorSession): string | null {
  const id = currentKeyId()
  const key = id ? keyFor(id, 'operator-session-v1') : null
  if (!key) return null
  const body = Buffer.from(JSON.stringify(s)).toString('base64url')
  return `${id}.${body}.${createHmac('sha256', key).update(body).digest('base64url')}`
}

/** La session si sa signature est bonne et qu'elle n'est pas échue ; sinon null. */
export function readSession(token: string, now = Date.now()): OperatorSession | null {
  const [id, body, sig] = token.split('.')
  if ((id !== 's1' && id !== 'a1') || !body || !sig) return null
  const key = keyFor(id, 'operator-session-v1')
  if (!key) return null
  const expected = Buffer.from(createHmac('sha256', key).update(body).digest('base64url'))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const s = JSON.parse(Buffer.from(body, 'base64url').toString()) as OperatorSession
    return typeof s.exp === 'number' && s.exp > now ? s : null
  } catch {
    return null
  }
}

/**
 * Les essais ratés, par personne et par poste : 5 ratés de suite bloquent 10 minutes. Gardé en
 * mémoire du serveur (chaque instance a la sienne) : un frein, pas un coffre-fort.
 */
const failures = new Map<string, { count: number; until: number }>()
export const MAX_TRIES = 5
export const LOCK_MS = 10 * 60_000

export function lockedUntil(key: string, now = Date.now()): number | null {
  const f = failures.get(key)
  return f && f.until > now ? f.until : null
}

export function noteFailure(key: string, now = Date.now()) {
  const f = failures.get(key) ?? { count: 0, until: 0 }
  const count = f.until && f.until <= now ? 1 : f.count + 1
  failures.set(key, { count: count >= MAX_TRIES ? 0 : count, until: count >= MAX_TRIES ? now + LOCK_MS : 0 })
  if (failures.size > 5000) failures.delete(failures.keys().next().value!)
}

export function noteSuccess(key: string) {
  failures.delete(key)
}
