import { fetchPublicConfig, parsePublicConfig } from './remoteConfig'
import { shouldLoadInApp } from './navigation'
import { PRODUCTION_WEB_URL, parseWebTarget, resolveWebTarget } from './env'

function json(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response
}

const valid = {
  configVersion: 1,
  forceUpdate: { ios: { versions: '<1.0.0', storeUrl: 'https://apps.apple.com/x' } },
  toggles: { nativeCapture: true, inconnu: 'oui' },
  realtime: true,
  champFutur: 3,
}

describe('parsePublicConfig', () => {
  it('garde ce qui est valide et ignore le reste', () => {
    expect(parsePublicConfig(valid)).toEqual({
      configVersion: 1,
      forceUpdate: { ios: { versions: '<1.0.0', storeUrl: 'https://apps.apple.com/x' } },
      toggles: { nativeCapture: true },
      realtime: true,
    })
  })

  it('refuse une autre version de configuration ou une forme fausse', () => {
    expect(parsePublicConfig({ ...valid, configVersion: 2 })).toBeNull()
    expect(parsePublicConfig('texte')).toBeNull()
    expect(parsePublicConfig(null)).toBeNull()
  })
})

describe('fetchPublicConfig', () => {
  it('envoie la version de la coquille et lit la réponse', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(json(valid))
    const cfg = await fetchPublicConfig('https://clip.exemple', '1.0.0', 'ios', fetchImpl)
    expect(cfg?.realtime).toBe(true)
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://clip.exemple/api/config',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-App-Version': '1.0.0' }) }),
    )
  })

  it('réessaie une seule fois après une coupure réseau', async () => {
    const fetchImpl = jest.fn().mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValue(json(valid))
    expect(await fetchPublicConfig('https://clip.exemple', '1.0.0', 'ios', fetchImpl)).not.toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('rend null sans boucler quand le serveur reste injoignable', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('Network request failed'))
    expect(await fetchPublicConfig('https://clip.exemple', '1.0.0', 'ios', fetchImpl)).toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('ne réessaie pas une réponse 4xx et rend null', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(json({}, 404))
    expect(await fetchPublicConfig('https://clip.exemple', '1.0.0', 'android', fetchImpl)).toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('adresse et navigation', () => {
  it('lit l’adresse de l’app web sans en inventer', () => {
    expect(parseWebTarget(undefined)).toBeNull()
    expect(parseWebTarget('ftp://x')).toBeNull()
    expect(parseWebTarget('https://clip.exemple/')).toEqual({ url: 'https://clip.exemple', origin: 'https://clip.exemple' })
    expect(parseWebTarget('http://192.168.1.20:3000')).toEqual({
      url: 'http://192.168.1.20:3000',
      origin: 'http://192.168.1.20:3000',
    })
  })

  it('affiche la production sans adresse donnée, et jamais la production à la place d’une adresse invalide', () => {
    expect(resolveWebTarget(undefined)).toEqual({ url: PRODUCTION_WEB_URL, origin: PRODUCTION_WEB_URL })
    expect(resolveWebTarget('  ')).toEqual({ url: PRODUCTION_WEB_URL, origin: PRODUCTION_WEB_URL })
    expect(resolveWebTarget('http://192.168.1.20:3000')?.origin).toBe('http://192.168.1.20:3000')
    expect(resolveWebTarget('ftp://x')).toBeNull()
  })

  it('garde l’app web dans la WebView et envoie les autres sites au navigateur', () => {
    const origin = 'https://clip.exemple'
    expect(shouldLoadInApp({ url: 'https://clip.exemple/p/abc', isTopFrame: true }, origin)).toBe(true)
    expect(shouldLoadInApp({ url: 'about:blank', isTopFrame: true }, origin)).toBe(true)
    expect(shouldLoadInApp({ url: 'https://ailleurs.exemple', isTopFrame: true }, origin)).toBe(false)
    expect(shouldLoadInApp({ url: 'https://clip.exemple.attaquant.test', isTopFrame: true }, origin)).toBe(false)
    expect(shouldLoadInApp({ url: 'https://lecteur.exemple/embed', isTopFrame: false }, origin)).toBe(true)
  })
})
