/**
 * Les clés du serveur (jamais dans le navigateur) : `CLIP_PIN_SECRET` si elle existe, sinon une clé
 * dérivée (HKDF) de la clé du temps réel (`ABLY_KEY`). Une clé par usage. Ce qui est signé ou scellé
 * porte l'identifiant de sa clé (`s1`, `a1`) : ajouter `CLIP_PIN_SECRET` plus tard n'invalide rien.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

export type KeyId = 's1' | 'a1'

export function keyFor(id: KeyId, purpose: string): Buffer | null {
  const secret = id === 's1' ? process.env.CLIP_PIN_SECRET : process.env.ABLY_KEY
  return secret ? Buffer.from(hkdfSync('sha256', secret, 'clip-v3', purpose, 32)) : null
}

/** La clé des nouvelles signatures ; null : le serveur n'en a aucune. */
export function currentKeyId(): KeyId | null {
  return process.env.CLIP_PIN_SECRET ? 's1' : process.env.ABLY_KEY ? 'a1' : null
}

/** Scelle une valeur (AES-256-GCM) : lisible et vérifiable par le serveur seulement. */
export function seal(value: unknown, purpose: string): string | null {
  const id = currentKeyId()
  const key = id ? keyFor(id, purpose) : null
  if (!id || !key) return null
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return `${id}.${iv.toString('base64url')}.${body.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}`
}

/** Ouvre une valeur scellée ; null si elle a été modifiée, ou scellée avec une autre clé ou un autre usage. */
export function unseal<T>(sealed: string | null | undefined, purpose: string): T | null {
  if (!sealed) return null
  const [id, iv, body, tag] = sealed.split('.')
  if ((id !== 's1' && id !== 'a1') || !iv || !body || !tag) return null
  const key = keyFor(id, purpose)
  if (!key) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    const plain = Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8')
    return JSON.parse(plain) as T
  } catch {
    return null
  }
}
