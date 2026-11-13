// @vitest-environment node
/**
 * La session de l'espace Découvrir : un cookie scellé avec une clé à part (`sha256("clip_decouvrir|" +
 * secret)`), qui marque sa forme. Une valeur scellée pour un autre usage, avec le même secret, ne s'ouvre pas.
 */
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { decouvrirKey, openSession, sealSession, sealWith, unsealWith, type DecouvrirSession } from '@/lib/decouvrir/server/session'

const SECRET = 'un-secret-de-session-de-test-de-plus-de-32-caracteres'
const saved = process.env.SESSION_SECRET
afterEach(() => {
  if (saved === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = saved
})

const session: DecouvrirSession = {
  access: 'A',
  refresh: 'R',
  exp: 1_800_000_000_000,
  app: 'sandboxes',
  type: 'prospect',
  fin: 1_800_000_000_000,
  personne: { id: 'p', courriel: 'p@exemple.test', nom: 'P' },
  entreprise: { id: 'o', nom: 'O' },
  verifieA: 1_790_000_000_000,
}

describe('la session de l’espace Découvrir', () => {
  it('se scelle et s’ouvre à l’identique ; le contenu est illisible', () => {
    const sealed = sealSession(session, SECRET)!
    expect(sealed).toBeTruthy()
    expect(sealed).not.toContain('prospect')
    expect(sealed).not.toContain('p@exemple.test')
    expect(openSession(sealed, SECRET)).toEqual(session)
  })

  it('altérée, absente ou scellée avec un autre secret : aucune session', () => {
    const sealed = sealSession(session, SECRET)!
    const tampered = `${sealed.slice(0, -4)}${sealed.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA'}`
    expect(openSession(tampered, SECRET)).toBeNull()
    expect(openSession('', SECRET)).toBeNull()
    expect(openSession(undefined, SECRET)).toBeNull()
    expect(openSession('pas-un-cookie', SECRET)).toBeNull()
    expect(openSession(sealed, 'un-autre-secret-de-session-de-plus-de-32-caracteres')).toBeNull()
  })

  it('a sa propre clé : une valeur scellée avec la clé d’un autre usage du même secret ne s’ouvre pas', () => {
    const other = createHash('sha256').update(SECRET).digest()
    const key = decouvrirKey(SECRET)!
    expect(key.equals(other)).toBe(false)
    expect(key.equals(createHash('sha256').update(`clip_decouvrir|${SECRET}`).digest())).toBe(true)
    // Une session scellée par un autre usage du même secret (sans le préfixe), même de la bonne forme.
    const foreign = sealWith({ v: 1, ...session }, other)
    expect(openSession(foreign, SECRET)).toBeNull()
    expect(unsealWith(foreign, other)).toMatchObject({ access: 'A' })
  })

  it('n’ouvre que sa forme : un autre objet scellé avec sa clé n’est pas une session', () => {
    const key = decouvrirKey(SECRET)!
    expect(openSession(sealWith({ access: 'A' }, key), SECRET)).toBeNull()
    expect(openSession(sealWith({ ...session }, key), SECRET)).toBeNull()
    expect(openSession(sealWith({ v: 2, ...session }, key), SECRET)).toBeNull()
    expect(openSession(sealWith({ v: 1, ...session, type: 'admin' }, key), SECRET)).toBeNull()
  })

  it('sans SESSION_SECRET (ou trop court) : rien ne se scelle ni ne s’ouvre', () => {
    delete process.env.SESSION_SECRET
    expect(decouvrirKey(undefined)).toBeNull()
    expect(sealSession(session)).toBeNull()
    expect(decouvrirKey('court')).toBeNull()
    process.env.SESSION_SECRET = SECRET
    const sealed = sealSession(session)!
    expect(openSession(sealed)).toEqual(session)
  })
})
