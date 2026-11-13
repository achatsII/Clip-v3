// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { seal, unseal } from '@/lib/server/keys'
import { allow, compose, deliver, NOTIFY_PURPOSE, recipientsOf, serviceToken } from '@/lib/server/notify'

const saved = { s: process.env.CLIP_PIN_SECRET, a: process.env.ABLY_KEY }
beforeEach(() => {
  delete process.env.CLIP_PIN_SECRET
  process.env.ABLY_KEY = 'cle-de-test.abc:def'
})
afterEach(() => {
  vi.unstubAllGlobals()
  process.env.CLIP_PIN_SECRET = saved.s
  process.env.ABLY_KEY = saved.a
  if (saved.s === undefined) delete process.env.CLIP_PIN_SECRET
  if (saved.a === undefined) delete process.env.ABLY_KEY
})

describe('le lien de service scellé', () => {
  it('ne s’ouvre qu’au serveur, pour son usage, et refuse toute retouche', () => {
    const s = seal({ link: 'abc123def', org: 'o1' }, NOTIFY_PURPOSE)!
    expect(s.startsWith('a1.')).toBe(true)
    expect(s).not.toContain('abc123def')
    expect(unseal(s, NOTIFY_PURPOSE)).toEqual({ link: 'abc123def', org: 'o1' })
    expect(unseal(s, 'autre-usage')).toBeNull()
    const parts = s.split('.')
    const tampered = [parts[0], parts[1], parts[2].slice(0, -2) + (parts[2].endsWith('A') ? 'B' : 'A') + parts[2].slice(-1), parts[3]].join('.')
    expect(unseal(tampered, NOTIFY_PURPOSE)).toBeNull()
    expect(unseal('n’importe quoi', NOTIFY_PURPOSE)).toBeNull()
  })

  it('reste lisible quand l’usine ajoute sa propre clé ; sans aucune clé, rien ne se scelle', () => {
    const s = seal({ link: 'abc123def', org: 'o1' }, NOTIFY_PURPOSE)!
    process.env.CLIP_PIN_SECRET = 'une-autre-cle'
    expect(unseal(s, NOTIFY_PURPOSE)).toEqual({ link: 'abc123def', org: 'o1' })
    delete process.env.CLIP_PIN_SECRET
    delete process.env.ABLY_KEY
    expect(seal({ x: 1 }, NOTIFY_PURPOSE)).toBeNull()
  })

  it('ne sert pas une autre usine', async () => {
    const s = seal({ link: 'abc123def', org: 'o1' }, NOTIFY_PURPOSE)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ access_token: 'jeton', data: { organization_id: 'o1', permissions: ['data:read', 'communication:send_email'] } }))))
    expect(await serviceToken(s, 'o2')).toBeNull()
    expect(await serviceToken(s, 'o1')).toEqual({ token: 'jeton', email: true })
  })
})

describe('les avertissements', () => {
  it('se disent dans la langue de la personne, et rien de ce qu’on a tapé ne s’exécute', () => {
    const fr = compose({ kind: 'danger', station: 'Presse P-12', instruction: 'Changer la matrice', who: 'Julie', text: 'Garde <b>brisé</b>', url: 'https://clip/retours' }, 'fr')
    expect(fr.title).toBe('Danger signalé au poste Presse P-12')
    expect(fr.body).toBe('Changer la matrice · par Julie · « Garde <b>brisé</b> »')
    expect(fr.html).toContain('Garde &lt;b&gt;brisé&lt;/b&gt;')
    expect(fr.html).not.toContain('<b>brisé')
    const en = compose({ kind: 'review', instruction: 'Change the die', who: 'Luc', url: 'https://clip/i' }, 'en')
    expect(en).toMatchObject({ title: 'To approve: Change the die', body: 'Luc is asking for your approval.' })
    expect(compose({ kind: 'test', url: 'https://clip' }, 'xx').title).toBe('CLIP alerts test')
  })

  it('vont aux bonnes personnes : sans doublon, sans l’auteur, sans invitation en attente', () => {
    expect(recipientsOf(['a', 'b', 'a', null, 'email:x@y.ca', 'c'], 'c')).toEqual(['a', 'b'])
  })

  it('ont un frein par source', () => {
    const now = 1_000_000
    for (let i = 0; i < 3; i++) expect(allow('l:poste', 3, now + i)).toBe(true)
    expect(allow('l:poste', 3, now + 10)).toBe(false)
    expect(allow('l:autre', 3, now + 10)).toBe(true)
    expect(allow('l:poste', 3, now + 3600_001)).toBe(true)
  })

  it('partent par courriel et sur chaque téléphone, selon ce que chacun veut', async () => {
    const sent: Array<{ url: string; body: unknown }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : null
        sent.push({ url, body })
        if (url.includes('/data/clip_contact/filter'))
          return new Response(
            JSON.stringify({
              results: [
                { _id: '1', json_data: { app_identifier: 'clip-v3', userId: 'u1', name: 'Nathalie', email: 'n@usine.ca', lang: 'fr', emails: true, push: true, pushTokens: [{ token: 'ExponentPushToken[a]', platform: 'ios', updatedAt: '' }] } },
                { _id: '2', json_data: { app_identifier: 'clip-v3', userId: 'u2', name: 'Luc', email: 'l@usine.ca', lang: 'en', emails: false, push: true, pushTokens: [{ token: 'ExponentPushToken[b]', platform: 'android', updatedAt: '' }] } },
              ],
            }),
          )
        return new Response(JSON.stringify({ success: true }))
      }),
    )
    const r = await deliver({ token: 'service', email: true }, ['u1', 'u2'], { kind: 'deviation', instruction: 'Rails', station: 'M-1234', who: 'Julie', text: 'Graisse · 3,1 g', url: 'https://clip/registre?ecarts=1' })
    expect(r).toEqual({ emails: 1, pushes: 2 })
    const emails = sent.filter((s) => s.url.endsWith('/communication/email'))
    expect(emails.map((e) => (e.body as { recipients: string }).recipients)).toEqual(['n@usine.ca'])
    const push = sent.find((s) => s.url.startsWith('https://exp.host'))!.body as Array<{ to: string; title: string; data: { url: string } }>
    expect(push.map((p) => [p.to, p.title])).toEqual([
      ['ExponentPushToken[a]', 'Écart relevé au poste M-1234'],
      ['ExponentPushToken[b]', 'Deviation recorded at M-1234'],
    ])
    expect(push[0].data.url).toBe('https://clip/registre?ecarts=1')
  })

  it('sans droit au courriel, seulement les téléphones', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('/data/clip_contact/filter')
          ? new Response(JSON.stringify({ results: [{ _id: '1', json_data: { app_identifier: 'clip-v3', userId: 'u1', name: 'N', email: 'n@usine.ca', lang: 'fr', emails: true, push: true, pushTokens: [{ token: 'ExponentPushToken[a]', platform: 'ios', updatedAt: '' }] } }] }))
          : new Response(JSON.stringify({ success: true })),
      ),
    )
    expect(await deliver({ token: 'service', email: false }, ['u1'], { kind: 'test', url: 'https://clip' })).toEqual({ emails: 0, pushes: 1 })
  })
})
