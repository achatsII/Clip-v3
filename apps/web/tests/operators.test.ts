// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { checkPin, currentKeyId, hashPin, lockedUntil, LOCK_MS, MAX_TRIES, noteFailure, noteSuccess, randomPin, readSession, signSession } from '@/lib/server/operators'
import { buildScope } from '@/lib/server/scope'

const saved = { s: process.env.CLIP_PIN_SECRET, a: process.env.ABLY_KEY }
beforeEach(() => {
  delete process.env.CLIP_PIN_SECRET
  process.env.ABLY_KEY = 'cle-de-test.abc:def'
})
afterEach(() => {
  process.env.CLIP_PIN_SECRET = saved.s
  process.env.ABLY_KEY = saved.a
  if (saved.s === undefined) delete process.env.CLIP_PIN_SECRET
  if (saved.a === undefined) delete process.env.ABLY_KEY
})

describe('les codes des opérateurs', () => {
  const id = '65a1b2c3d4e5f6a7b8c9d0e1'

  it('ne sont gardés qu’en empreinte, liée à la personne, et se vérifient', () => {
    const h = hashPin(id, '4827')!
    expect(h).toMatch(/^a1:/)
    expect(h).not.toContain('4827')
    expect(checkPin(id, '4827', h)).toBe(true)
    expect(checkPin(id, '4828', h)).toBe(false)
    // La même empreinte ne vaut pas pour une autre personne.
    expect(checkPin('65a1b2c3d4e5f6a7b8c9d0e2', '4827', h)).toBe(false)
    expect(checkPin(id, '4827', null)).toBe(false)
    expect(hashPin(id, '12a4')).toBeNull()
  })

  it('restent bons quand l’usine ajoute sa propre clé ; sans aucune clé, rien ne se vérifie', () => {
    const old = hashPin(id, '4827')!
    process.env.CLIP_PIN_SECRET = 'une-cle-dediee-de-test'
    expect(currentKeyId()).toBe('s1')
    expect(checkPin(id, '4827', old)).toBe(true)
    expect(hashPin(id, '4827')).toMatch(/^s1:/)
    delete process.env.CLIP_PIN_SECRET
    delete process.env.ABLY_KEY
    expect(currentKeyId()).toBeNull()
    expect(checkPin(id, '4827', old)).toBe(false)
  })

  it('sont tirés au hasard, jamais les suites évidentes', () => {
    const seq = [0, 0.1234, 0.4827]
    expect(randomPin(() => seq.shift()!)).toBe('4827')
    expect(randomPin(() => 0.05)).toBe('0500')
  })

  it('bloquent un nom après 5 essais ratés, puis le libèrent', () => {
    const k = 'lien:personne'
    const now = 1_000_000
    for (let i = 0; i < MAX_TRIES - 1; i++) noteFailure(k, now)
    expect(lockedUntil(k, now)).toBeNull()
    noteFailure(k, now)
    expect(lockedUntil(k, now)).toBe(now + LOCK_MS)
    expect(lockedUntil(k, now + LOCK_MS + 1)).toBeNull()
    noteSuccess(k)
  })
})

describe('la session au poste', () => {
  it('se signe, se relit, et n’est plus bonne échue ou modifiée', () => {
    const s = signSession({ op: 'x', name: 'Marc', link: 'L', org: 'O', exp: 2_000 })!
    expect(readSession(s, 1_000)).toMatchObject({ op: 'x', name: 'Marc' })
    expect(readSession(s, 3_000)).toBeNull()
    const [k, body, sig] = s.split('.')
    const forged = Buffer.from(JSON.stringify({ op: 'y', name: 'Autre', link: 'L', org: 'O', exp: 9_999_999 })).toString('base64url')
    expect(readSession(`${k}.${forged}.${sig}`, 1_000)).toBeNull()
    expect(readSession(`${k}.${body}`, 1_000)).toBeNull()
  })
})

describe('la portée des liens (version 2)', () => {
  it('ouvre les noms des personnes en lecture seulement, et l’écriture du travail fait et des réponses', () => {
    const s = buildScope('station', '65a1b2c3d4e5f6a7b8c9d0e1', { mode: 'focus', sharedApp: true, slug: 'clip-v3' })
    const by = (t: string) => s.resources.find((r) => r.data_type === t)
    expect(by('clip_operator')).toEqual({ data_type: 'clip_operator', filter: { 'json_data.active': true, 'json_data.app_identifier': 'clip-v3' }, actions: ['read'] })
    expect(by('clip_execution')?.actions).toEqual(['insert'])
    expect(by('clip_training')?.actions).toEqual(['insert'])
  })

  it('ne montre jamais l’équipe au lien d’une instruction', () => {
    const s = buildScope('instruction', '65a1b2c3d4e5f6a7b8c9d0e1', { sharedApp: true, slug: 'clip-v3' })
    expect(s.resources.some((r) => r.data_type === 'clip_operator')).toBe(false)
    expect(s.resources.find((r) => r.data_type === 'clip_execution')?.actions).toEqual(['insert'])
  })
})
