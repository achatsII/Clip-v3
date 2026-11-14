/**
 * La session de l'espace Découvrir : un cookie à part (`clip_decouvrir`), HttpOnly, Secure, SameSite=Lax,
 * chiffré AES-256-GCM. Clip garde les jetons de ses utilisateurs dans le navigateur et n'a aucune autre
 * session serveur : celle-ci est la seule, et elle n'ouvre que l'espace. Sa clé est tirée de
 * `SESSION_SECRET` mais à part de toute autre (`sha256("clip_decouvrir|" + secret)`), et elle marque sa
 * forme (`v`) : une valeur scellée pour un autre usage ne s'ouvre jamais ici. Serveur seulement.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { PersonType } from '../contract'

export const DECOUVRIR_COOKIE = 'clip_decouvrir'
/** La durée du cookie ; la fin de l'accès et la revérification ferment la session plus tôt. */
export const SESSION_MAX_AGE = 30 * 24 * 3600
/** La forme du contenu scellé. */
const FORM = 1

export interface Person {
  id: string
  courriel: string
  nom: string
}

export interface Company {
  id: string
  nom: string
}

/** Ce que garde le cookie (scellé, HttpOnly) ; le navigateur n'en voit que `publicInfo`, jamais les jetons. */
export interface DecouvrirSession {
  access: string
  refresh: string
  /** Expiration de l'access token (epoch ms). */
  exp: number
  /** L'application qui a émis les jetons : on les renouvelle avec le même app_identifier. */
  app: string
  type: PersonType
  /** Fin de l'accès (epoch ms) ; null : sans fin (client de Clip, équipe d'II). */
  fin: number | null
  personne: Person
  entreprise: Company | null
  /** Dernière vérification de l'accès (epoch ms). */
  verifieA: number
}

/** La clé du cookie, à part de toute autre ; null si `SESSION_SECRET` manque ou fait moins de 32 caractères. */
export function decouvrirKey(secret: string | undefined = process.env.SESSION_SECRET): Buffer | null {
  if (!secret || secret.length < 32) return null
  return createHash('sha256').update(`clip_decouvrir|${secret}`).digest()
}

export function sealWith(value: unknown, key: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64url')
}

/** Ouvre une valeur scellée ; null si elle est absente, altérée ou scellée avec une autre clé. */
export function unsealWith<T>(value: string | undefined | null, key: Buffer): T | null {
  if (!value) return null
  try {
    const raw = Buffer.from(value, 'base64url')
    if (raw.length < 29) return null
    const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12))
    decipher.setAuthTag(raw.subarray(12, 28))
    const json = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

/** Le cookie scellé ; null sans `SESSION_SECRET` utilisable (la route le dit, jamais une erreur technique). */
export function sealSession(s: DecouvrirSession, secret?: string): string | null {
  const key = decouvrirKey(secret ?? process.env.SESSION_SECRET)
  return key ? sealWith({ v: FORM, ...s }, key) : null
}

const isText = (v: unknown): v is string => typeof v === 'string'

/** La session du cookie, si elle est intacte, de la bonne forme et scellée avec la clé de l'espace. */
export function openSession(value: string | undefined | null, secret?: string): DecouvrirSession | null {
  const key = decouvrirKey(secret ?? process.env.SESSION_SECRET)
  if (!key) return null
  const s = unsealWith<Record<string, unknown>>(value, key)
  if (!s || typeof s !== 'object' || s.v !== FORM) return null
  const p = s.personne as Record<string, unknown> | undefined
  const e = s.entreprise as Record<string, unknown> | null | undefined
  const ok =
    isText(s.access) &&
    isText(s.refresh) &&
    isText(s.app) &&
    typeof s.exp === 'number' &&
    typeof s.verifieA === 'number' &&
    (s.type === 'client' || s.type === 'prospect' || s.type === 'equipe') &&
    (s.fin === null || typeof s.fin === 'number') &&
    !!p &&
    isText(p.id) &&
    (e === null || (!!e && isText(e.id)))
  if (!ok) return null
  // La forme ne repart pas dans la session.
  const session: Record<string, unknown> = { ...s }
  delete session.v
  return session as unknown as DecouvrirSession
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }
}
