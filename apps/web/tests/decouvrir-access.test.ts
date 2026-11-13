// @vitest-environment node
/**
 * L'accès à l'espace Découvrir par Sandboxes, sur les fonctions pures, avec la passerelle et l'API de
 * Sandboxes simulées (un `fetch` factice, aucun réseau) : la connexion, la revérification, l'intercepteur,
 * le relais limité et la configuration.
 */
import { describe, expect, it } from 'vitest'
import { gate, gatewayRouteAllowed, personOf, safeNext, signIn, verify, VERIFY_EVERY_MS, type Deps, type Fetch } from '@/lib/decouvrir/server/access'
import { accessMode, decouvrirConfig, type DecouvrirConfig } from '@/lib/decouvrir/server/config'
import type { DecouvrirSession } from '@/lib/decouvrir/server/session'

interface Call {
  key: string
  query: URLSearchParams
  headers: Record<string, string>
  body: Record<string, unknown> | undefined
}
type Reply = { status: number; body?: unknown } | 'panne'
type Handler = (c: Call) => Reply

const GW = 'https://passerelle.test'
const SBX = 'https://sandboxes.test'
const KEY = 'sbxk_clip-v3_essai'

function fakeFetch(routes: Record<string, Handler>, calls: Call[]): Fetch {
  return async (input, init = {}) => {
    const url = new URL(input)
    const headers = Object.fromEntries(Object.entries((init.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]))
    const body = typeof init.body === 'string' && init.body ? (JSON.parse(init.body) as Record<string, unknown>) : undefined
    const call: Call = { key: `${(init.method ?? 'GET').toUpperCase()} ${url.origin}${url.pathname}`, query: url.searchParams, headers, body }
    calls.push(call)
    const handler = routes[call.key]
    const reply = handler ? handler(call) : { status: 404, body: { success: false, error: 'introuvable' } }
    if (reply === 'panne') throw new TypeError('fetch failed')
    return new Response(reply.body === undefined ? '' : JSON.stringify(reply.body), { status: reply.status, headers: { 'Content-Type': 'application/json' } })
  }
}

/** Clip aujourd'hui : l'application partagée `html`, donc aucune étape « client de Clip ». */
const CONFIG: DecouvrirConfig = { gateway: GW, productApp: null, probeType: 'clip_org', sandboxesApp: 'sandboxes', sandboxes: { url: SBX, cle: KEY } }
/** Le jour où `clip-v3` existe à la passerelle : l'étape client s'allume. */
const WITH_APP: DecouvrirConfig = { ...CONFIG, productApp: 'clip-v3' }
const NOW = Date.UTC(2026, 10, 13, 15, 0, 0)
/** Fin d'accès : minuit (heure du Québec) au soir du 15 décembre 2026 ; une fin passée, le 12 octobre. */
const FIN = Date.UTC(2026, 11, 16, 5, 0, 0)
const FIN_PASSEE = Date.UTC(2026, 9, 13, 4, 0, 0)

const tokens = (a: string, r: string) => ({ status: 200, body: { access_token: a, refresh_token: r, expires_in: 7200 } })
const refused = { status: 400, body: { success: false, error: 'Invalid login credentials' } }
const me = { status: 200, body: { success: true, user: { sub: 'u-client-1' }, results: { email: 'cliente@usine-demo.test', profile: { fullname: 'Camille Démo' }, organization: { id: 'org-client', name: 'Usine Démo inc.' } } } }
const prospectOk = { status: 200, body: { ok: true, type: 'prospect', fin: FIN, personne: { id: 'u-prospect-1', courriel: 'prospect@exemple.test', nom: 'Alex Exemple' }, entreprise: { id: 'org-prospect', nom: 'Atelier Exemple' } } }

function deps(routes: Record<string, Handler>, calls: Call[], over: Partial<Deps> = {}): Deps {
  return { fetch: fakeFetch(routes, calls), now: () => NOW, config: CONFIG, refresh: async () => null, ...over }
}
const byApp = (replies: Record<string, Reply>): Handler => (c) => replies[c.query.get('app_identifier') ?? ''] ?? refused
const called = (calls: Call[], key: string) => calls.filter((c) => c.key === key)
const prospectRoutes = (acces: Reply) => ({ [`POST ${GW}/api/v1/auth/token`]: byApp({ sandboxes: tokens('A-sbx', 'R-sbx') }), [`POST ${SBX}/api/v1/acces`]: () => acces })

describe('l’interrupteur et la configuration', () => {
  it('ferme l’espace seulement avec « sandboxes » (espaces et majuscules compris)', () => {
    expect(accessMode({})).toBe('ouvert')
    expect(accessMode({ DECOUVRIR_ACCES: 'ouvert' })).toBe('ouvert')
    expect(accessMode({ DECOUVRIR_ACCES: 'n’importe quoi' })).toBe('ouvert')
    expect(accessMode({ DECOUVRIR_ACCES: 'sandboxes' })).toBe('sandboxes')
    expect(accessMode({ DECOUVRIR_ACCES: ' Sandboxes ' })).toBe('sandboxes')
  })

  it('saute l’étape client tant que Clip partage `html`, et l’allume avec son propre identifiant', () => {
    expect(decouvrirConfig({}).productApp).toBeNull()
    expect(decouvrirConfig({ NEXT_PUBLIC_APP_IDENTIFIER: 'html' }).productApp).toBeNull()
    expect(decouvrirConfig({ NEXT_PUBLIC_APP_IDENTIFIER: 'clip-v3' }).productApp).toBe('clip-v3')
  })

  it('prend la passerelle de Découvrir, sinon celle de Clip ; Sandboxes seulement avec son adresse et sa clé', () => {
    expect(decouvrirConfig({ DECOUVRIR_GATEWAY_URL: 'https://gateway.intelligenceindustrielle.com/' }).gateway).toBe('https://gateway.intelligenceindustrielle.com')
    expect(decouvrirConfig({ NEXT_PUBLIC_GATEWAY_URL: 'https://qa.gateway.intelligenceindustrielle.com' }).gateway).toBe('https://qa.gateway.intelligenceindustrielle.com')
    expect(decouvrirConfig({}).gateway).toBe('https://qa.gateway.intelligenceindustrielle.com')
    expect(decouvrirConfig({ SANDBOXES_URL: 'https://sandboxes-gamma.vercel.app' }).sandboxes).toBeNull()
    expect(decouvrirConfig({ SANDBOXES_URL: 'https://sandboxes-gamma.vercel.app/', SANDBOXES_CLE: KEY }).sandboxes).toEqual({ url: 'https://sandboxes-gamma.vercel.app', cle: KEY })
    expect(decouvrirConfig({}).sandboxesApp).toBe('sandboxes')
  })
})

describe('la connexion', () => {
  it('un prospect avec un accès entre jusqu’à sa fin, avec les jetons de `sandboxes`, sans lire les données de Clip', async () => {
    const calls: Call[] = []
    const r = await signIn('prospect@exemple.test', 'secret', deps({ ...prospectRoutes(prospectOk), [`POST ${SBX}/api/v1/acces`]: (c) => (c.body?.via === 'sandboxes' && c.body?.jeton === 'A-sbx' ? prospectOk : { status: 400 }) }, calls))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.session).toMatchObject({ type: 'prospect', fin: FIN, app: 'sandboxes', access: 'A-sbx', refresh: 'R-sbx', verifieA: NOW })
    expect(r.session.entreprise).toEqual({ id: 'org-prospect', nom: 'Atelier Exemple' })
    const acces = called(calls, `POST ${SBX}/api/v1/acces`)
    expect(acces).toHaveLength(1)
    expect(acces[0].headers.authorization).toBe(`Bearer ${KEY}`)
    // Clip partage `html` : aucune connexion à une application de Clip, aucune lecture de ses données.
    expect(calls.filter((c) => c.key === `POST ${GW}/api/v1/auth/token`).map((c) => c.query.get('app_identifier'))).toEqual(['sandboxes'])
    expect(calls.some((c) => c.key.includes('/api/v1/data/'))).toBe(false)
    expect(personOf(r.session)).toEqual({ id: 'u-prospect-1', courriel: 'prospect@exemple.test', nom: 'Alex Exemple', entrepriseId: 'org-prospect', type: 'prospect' })
  })

  it('l’équipe d’II entre sans fin ; un nom absent devient le début du courriel', async () => {
    const team = await signIn('equipe@intelligenceindustrielle.com', 'secret', deps(prospectRoutes({ status: 200, body: { ok: true, type: 'equipe', fin: null, personne: { id: 'u-ii', courriel: 'equipe@intelligenceindustrielle.com', nom: null }, entreprise: { id: 'org-ii', nom: 'Intelligence Industrielle' } } }), []))
    expect(team.ok && team.session.type).toBe('equipe')
    expect(team.ok && team.session.fin).toBeNull()
    expect(team.ok && team.session.personne.nom).toBe('equipe')
  })

  it('refuse avec les raisons du contrat : pas encore ouvert, ou terminé (avec la date)', async () => {
    const none = await signIn('prospect@exemple.test', 'secret', deps(prospectRoutes({ status: 200, body: { ok: false, raison: 'aucun_acces' } }), []))
    expect(none).toEqual({ ok: false, status: 403, raison: 'aucun_acces' })
    const ended = await signIn('prospect@exemple.test', 'secret', deps(prospectRoutes({ status: 200, body: { ok: false, raison: 'expire', fin: FIN_PASSEE } }), []))
    expect(ended).toEqual({ ok: false, status: 403, raison: 'expire', fin: FIN_PASSEE })
  })

  it('un mauvais mot de passe : un seul message, quelle que soit l’application qui refuse', async () => {
    const wrong = await signIn('prospect@exemple.test', 'mauvais', deps({ [`POST ${GW}/api/v1/auth/token`]: () => refused }, []))
    expect(wrong).toEqual({ ok: false, status: 401, raison: 'identifiants' })
    const wrongBoth = await signIn('cliente@usine-demo.test', 'mauvais', deps({ [`POST ${GW}/api/v1/auth/token`]: () => refused }, [], { config: WITH_APP }))
    expect(wrongBoth).toEqual({ ok: false, status: 401, raison: 'identifiants' })
  })

  it('une panne n’est jamais un mauvais mot de passe', async () => {
    expect(await signIn('p@exemple.test', 'x', deps({ [`POST ${GW}/api/v1/auth/token`]: () => 'panne' }, []))).toMatchObject({ ok: false, status: 503, raison: 'indisponible' })
    expect(await signIn('p@exemple.test', 'x', deps({ [`POST ${GW}/api/v1/auth/token`]: () => ({ status: 502 }) }, []))).toMatchObject({ raison: 'indisponible' })
    expect(await signIn('p@exemple.test', 'x', deps(prospectRoutes('panne'), []))).toMatchObject({ raison: 'indisponible' })
    expect(await signIn('p@exemple.test', 'x', deps(prospectRoutes({ status: 429, body: { ok: false, raison: 'trop_d_appels' } }), []))).toMatchObject({ raison: 'indisponible' })
    // Une clé inconnue de Sandboxes (401 sans jeton_invalide) : une panne de configuration, pas un refus d'accès.
    expect(await signIn('p@exemple.test', 'x', deps(prospectRoutes({ status: 401, body: { ok: false, raison: 'cle_inconnue' } }), []))).toMatchObject({ raison: 'indisponible' })
    // Un jeton que Sandboxes refuse à l'entrée.
    expect(await signIn('p@exemple.test', 'x', deps(prospectRoutes({ status: 401, body: { ok: false, raison: 'jeton_invalide' } }), []))).toMatchObject({ raison: 'indisponible' })
  })

  it('sans Sandboxes configuré, un prospect est refusé avec le message « pas encore ouvert », jamais une erreur technique', async () => {
    const calls: Call[] = []
    const r = await signIn('prospect@exemple.test', 'secret', deps(prospectRoutes(prospectOk), calls, { config: { ...CONFIG, sandboxes: null } }))
    expect(r).toEqual({ ok: false, status: 403, raison: 'aucun_acces' })
    expect(calls.some((c) => c.key.startsWith(`POST ${SBX}`))).toBe(false)
  })

  describe('le jour où Clip a sa propre application', () => {
    const clientRoutes = (acces: Handler): Record<string, Handler> => ({
      [`POST ${GW}/api/v1/auth/token`]: byApp({ 'clip-v3': tokens('A-prod', 'R-prod') }),
      [`POST ${GW}/api/v1/data/clip_org/count`]: (c) => (c.headers.authorization === 'Bearer A-prod' ? { status: 200, body: { count: 1 } } : { status: 401 }),
      [`GET ${GW}/api/v1/auth/me`]: () => me,
      [`POST ${SBX}/api/v1/acces`]: acces,
    })

    it('une cliente entre avec son compte Clip, confirmée par une lecture ; Sandboxes en est informé (via produit)', async () => {
      const calls: Call[] = []
      const r = await signIn('cliente@usine-demo.test', 'secret', deps(clientRoutes((c) => (c.body?.via === 'produit' ? { status: 200, body: { ok: true, type: 'client' } } : { status: 400 })), calls, { config: WITH_APP }))
      expect(r.ok && r.session).toMatchObject({ type: 'client', app: 'clip-v3', fin: null, access: 'A-prod', personne: { id: 'u-client-1', nom: 'Camille Démo' }, entreprise: { id: 'org-client' } })
      expect(called(calls, `POST ${SBX}/api/v1/acces`)[0]?.body).toEqual({ jeton: 'A-prod', via: 'produit' })
      expect(calls.some((c) => c.query.get('app_identifier') === 'sandboxes')).toBe(false)
    })

    it('une cliente entre même si Sandboxes ne répond pas', async () => {
      const r = await signIn('cliente@usine-demo.test', 'secret', deps(clientRoutes(() => 'panne'), [], { config: WITH_APP }))
      expect(r.ok && r.session.type).toBe('client')
    })

    it('un compte Clip sans lecture permise n’est pas client : on essaie `sandboxes`', async () => {
      const r = await signIn('prospect@exemple.test', 'secret', deps({
        [`POST ${GW}/api/v1/auth/token`]: byApp({ 'clip-v3': tokens('A-prod', 'R-prod'), sandboxes: tokens('A-sbx', 'R-sbx') }),
        [`POST ${GW}/api/v1/data/clip_org/count`]: () => ({ status: 403 }),
        [`POST ${SBX}/api/v1/acces`]: () => prospectOk,
      }, [], { config: WITH_APP }))
      expect(r.ok && r.session.type).toBe('prospect')
    })

    it('de bons identifiants sans aucun accès : « pas encore ouvert », pas « mot de passe incorrect »', async () => {
      const r = await signIn('cliente@usine-demo.test', 'secret', deps({
        [`POST ${GW}/api/v1/auth/token`]: byApp({ 'clip-v3': tokens('A-prod', 'R-prod') }),
        [`POST ${GW}/api/v1/data/clip_org/count`]: () => ({ status: 403 }),
      }, [], { config: WITH_APP }))
      expect(r).toEqual({ ok: false, status: 403, raison: 'aucun_acces' })
    })

    it('l’équipe d’II entrée par l’application de Clip reste « equipe »', async () => {
      const r = await signIn('equipe@intelligenceindustrielle.com', 'secret', deps(clientRoutes(() => ({ status: 200, body: { ok: true, type: 'equipe' } })), [], { config: WITH_APP }))
      expect(r.ok && r.session.type).toBe('equipe')
    })

    it('l’application inconnue de la passerelle de Découvrir (404) : on essaie `sandboxes`', async () => {
      const r = await signIn('prospect@exemple.test', 'secret', deps({ [`POST ${GW}/api/v1/auth/token`]: byApp({ 'clip-v3': { status: 404, body: { error: 'Unknown application slug' } }, sandboxes: tokens('A-sbx', 'R-sbx') }), [`POST ${SBX}/api/v1/acces`]: () => prospectOk }, [], { config: WITH_APP }))
      expect(r.ok && r.session.app).toBe('sandboxes')
    })
  })
})

describe('la revérification', () => {
  const base: DecouvrirSession = { access: 'A-sbx', refresh: 'R-sbx', exp: NOW + 3_600_000, app: 'sandboxes', type: 'prospect', fin: FIN, personne: { id: 'u-prospect-1', courriel: 'prospect@exemple.test', nom: 'Alex' }, entreprise: { id: 'org-prospect', nom: 'Atelier' }, verifieA: NOW - 5 * 60_000 }
  const due = { ...base, verifieA: NOW - VERIFY_EVERY_MS - 1 }

  it('vérifiée il y a 5 minutes : aucun appel ; une fin passée : fermée sans appel', async () => {
    const calls: Call[] = []
    expect(await verify(base, deps({}, calls))).toEqual({ closed: false, session: base, changed: false })
    expect(await verify({ ...base, fin: FIN_PASSEE, verifieA: NOW }, deps({}, calls))).toEqual({ closed: true, raison: 'expire', fin: FIN_PASSEE })
    expect(calls).toHaveLength(0)
  })

  it('après 15 minutes : POST /acces via `sandboxes`, la nouvelle fin gardée', async () => {
    const calls: Call[] = []
    const later = FIN + 30 * 86_400_000
    const r = await verify(due, deps({ [`POST ${SBX}/api/v1/acces`]: () => ({ status: 200, body: { ...prospectOk.body, fin: later } }) }, calls))
    expect(r.closed).toBe(false)
    if (r.closed) return
    expect(r.session.fin).toBe(later)
    expect(r.session.verifieA).toBe(NOW)
    expect(r.changed).toBe(true)
    expect(called(calls, `POST ${SBX}/api/v1/acces`)[0]?.body?.via).toBe('sandboxes')
  })

  it('un accès révoqué ou échu ferme la session ; Sandboxes absent aussi', async () => {
    expect(await verify(due, deps({ [`POST ${SBX}/api/v1/acces`]: () => ({ status: 200, body: { ok: false, raison: 'aucun_acces' } }) }, []))).toEqual({ closed: true, raison: 'aucun_acces' })
    expect(await verify(due, deps({ [`POST ${SBX}/api/v1/acces`]: () => ({ status: 200, body: { ok: false, raison: 'expire', fin: FIN_PASSEE } }) }, []))).toEqual({ closed: true, raison: 'expire', fin: FIN_PASSEE })
    expect(await verify(due, deps({}, [], { config: { ...CONFIG, sandboxes: null } }))).toEqual({ closed: true, raison: 'aucun_acces' })
  })

  it('Sandboxes injoignable : la personne n’est pas bloquée, nouvel essai dans une minute', async () => {
    const r = await verify(due, deps({ [`POST ${SBX}/api/v1/acces`]: () => 'panne' }, []))
    expect(r.closed).toBe(false)
    if (!r.closed) expect(NOW - r.session.verifieA).toBe(VERIFY_EVERY_MS - 60_000)
  })

  it('un jeton expiré se renouvelle une fois, avec l’application qui l’a émis', async () => {
    const renewed: Array<[string, string]> = []
    const refresh = async (r: string, app: string) => {
      renewed.push([r, app])
      return { access_token: 'A2-sbx', refresh_token: 'R2-sbx', expires_in: 7200 }
    }
    const r = await verify({ ...due, exp: NOW - 1 }, deps({ [`POST ${SBX}/api/v1/acces`]: (c) => (c.body?.jeton === 'A2-sbx' ? prospectOk : { status: 401, body: { ok: false, raison: 'jeton_invalide' } }) }, [], { refresh }))
    expect(renewed).toEqual([['R-sbx', 'sandboxes']])
    expect(!r.closed && r.session.access).toBe('A2-sbx')
    expect(!r.closed && r.session.refresh).toBe('R2-sbx')
  })

  it('un jeton refusé et un renouvellement refusé : la session se ferme, après un seul essai', async () => {
    const tries: string[] = []
    const r = await verify(due, deps({ [`POST ${SBX}/api/v1/acces`]: () => ({ status: 401, body: { ok: false, raison: 'jeton_invalide' } }) }, [], { refresh: async (_r, app) => (tries.push(app), null) }))
    expect(r).toEqual({ closed: true, raison: 'session' })
    expect(tries).toEqual(['sandboxes'])
  })

  it('une cliente (application de Clip) : la lecture autorisée, puis via produit ; fermée si elle perd Clip', async () => {
    const client: DecouvrirSession = { ...due, app: 'clip-v3', type: 'client', fin: null, access: 'A-prod', refresh: 'R-prod' }
    const calls: Call[] = []
    const ok = await verify(client, deps({ [`POST ${GW}/api/v1/data/clip_org/count`]: () => ({ status: 200, body: { count: 1 } }), [`POST ${SBX}/api/v1/acces`]: () => ({ status: 200, body: { ok: true, type: 'client' } }) }, calls, { config: WITH_APP }))
    expect(ok.closed).toBe(false)
    expect(called(calls, `POST ${SBX}/api/v1/acces`)[0]?.body?.via).toBe('produit')
    const lost = await verify(client, deps({ [`POST ${GW}/api/v1/data/clip_org/count`]: () => ({ status: 403 }) }, [], { config: WITH_APP }))
    expect(lost).toEqual({ closed: true, raison: 'aucun_acces' })
  })
})

describe('l’intercepteur', () => {
  const session: DecouvrirSession = { access: 'A', refresh: 'R', exp: NOW + 3_600_000, app: 'sandboxes', type: 'prospect', fin: FIN, personne: { id: 'p', courriel: 'p@exemple.test', nom: 'P' }, entreprise: null, verifieA: NOW }
  const at = (mode: 'ouvert' | 'sandboxes', url: string, s: DecouvrirSession | null = null) => {
    const u = new URL(url, 'https://clip.test')
    return gate({ mode, pathname: u.pathname, search: u.search, session: s, now: NOW })
  }

  it('interrupteur éteint : l’espace reste public, l’entrée renvoie aux vidéos, l’API de l’espace n’existe pas', () => {
    for (const p of ['/decouvrir', '/decouvrir?v=00-film', '/decouvrir/conseiller', '/decouvrir/v/00-film']) expect(at('ouvert', p).kind).toBe('next')
    expect(at('ouvert', '/decouvrir/entrer')).toEqual({ kind: 'redirect', location: '/decouvrir' })
    for (const p of ['/api/decouvrir/entrer', '/api/decouvrir/suivi', '/api/decouvrir/gw/api/v4/assistant/ask']) expect(at('ouvert', p).kind).toBe('absent')
  })

  it('allumé, sans session : l’entrée, avec le courriel prérempli et la page demandée', () => {
    expect(at('sandboxes', '/decouvrir?courriel=prospect%40exemple.test')).toEqual({ kind: 'redirect', location: '/decouvrir/entrer?courriel=prospect%40exemple.test', clear: false })
    const r = at('sandboxes', '/decouvrir/conseiller')
    expect(r.kind === 'redirect' && new URL(r.location, 'https://clip.test').searchParams.get('suite')).toBe('/decouvrir/conseiller')
    expect(at('sandboxes', '/decouvrir/entrer').kind).toBe('next')
    // L'API vérifie elle-même la session : l'intercepteur la laisse passer.
    expect(at('sandboxes', '/api/decouvrir/entrer').kind).toBe('next')
  })

  it('les fichiers restent publics (vidéos, affiches, sous-titres)', () => {
    for (const f of ['/decouvrir/videos/00-film.jpg', '/decouvrir/videos/00-film.vtt', '/decouvrir/videos/00-film.json']) expect(at('sandboxes', f).kind).toBe('next')
  })

  it('avec une session : on entre, et l’écran d’entrée renvoie à la suite (jamais ailleurs)', () => {
    expect(at('sandboxes', '/decouvrir/conseiller', session).kind).toBe('next')
    expect(at('sandboxes', '/decouvrir/entrer?suite=%2Fdecouvrir%2Fconseiller', session)).toEqual({ kind: 'redirect', location: '/decouvrir/conseiller' })
    expect(at('sandboxes', '/decouvrir/entrer?suite=https%3A%2F%2Failleurs.test', session)).toEqual({ kind: 'redirect', location: '/decouvrir' })
  })

  it('un accès arrivé à sa fin : l’entrée avec son message, et le cookie effacé', () => {
    const r = at('sandboxes', '/decouvrir/conseiller', { ...session, fin: FIN_PASSEE })
    expect(r.kind).toBe('redirect')
    if (r.kind !== 'redirect') return
    const to = new URL(r.location, 'https://clip.test')
    expect(to.searchParams.get('raison')).toBe('expire')
    expect(to.searchParams.get('fin')).toBe(String(FIN_PASSEE))
    expect(r.clear).toBe(true)
  })

  it('la suite reste dans Clip', () => {
    expect(safeNext('//ailleurs.test')).toBeNull()
    expect(safeNext('/\\ailleurs')).toBeNull()
    expect(safeNext('/decouvrir/entrer?x=1')).toBeNull()
    expect(safeNext('https://ailleurs.test')).toBeNull()
    expect(safeNext('/decouvrir/conseiller')).toBe('/decouvrir/conseiller')
  })
})

describe('le relais de l’IA', () => {
  it('laisse passer l’assistant et le téléversement direct, rien d’autre', () => {
    expect(gatewayRouteAllowed('POST', '/api/v4/assistant/ask')).toBe(true)
    expect(gatewayRouteAllowed('post', '/api/v1/files/upload/direct')).toBe(true)
    for (const [m, p] of [
      ['GET', '/api/v4/assistant/ask'],
      ['POST', '/api/v1/data/clip_instruction/filter'],
      ['POST', '/api/v1/auth/token/refresh'],
      ['GET', '/api/v1/org/me'],
      ['POST', '/api/v1/files/audio/transcribe'],
      ['POST', '/api/v2/ai/ask'],
      ['POST', '/api/v1/files/upload/multipart'],
      ['POST', '/api/v4/assistant/ask/../../v1/data/x'],
    ] as const)
      expect(gatewayRouteAllowed(m, p), `${m} ${p}`).toBe(false)
  })
})
