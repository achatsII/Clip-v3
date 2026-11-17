import appJson from '../../app.json'
import { BRAND, brandIdOf, brandify, brandOf, brandText } from './brand'
import { PRODUCTION_WEB_URL } from './env'

type Config = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

/** La configuration que verrait EAS pour une marque, avec la table des marques donnée. */
function resolveConfig(brand: string | undefined, brands?: Record<string, unknown>): Config {
  const before = process.env.EXPO_PUBLIC_BRAND
  if (brand === undefined) delete process.env.EXPO_PUBLIC_BRAND
  else process.env.EXPO_PUBLIC_BRAND = brand
  try {
    let config: Config = {}
    jest.isolateModules(() => {
      if (brands) jest.doMock('../../brands.json', () => brands)
      const build = require('../../app.config.js') as (ctx: { config: Config }) => Config
      config = build({ config: JSON.parse(JSON.stringify(appJson.expo)) })
    })
    return config
  } finally {
    if (before === undefined) delete process.env.EXPO_PUBLIC_BRAND
    else process.env.EXPO_PUBLIC_BRAND = before
    jest.dontMock('../../brands.json')
  }
}

const PUBLIC = {
  clip: { name: 'CLIP', webUrl: 'https://clip-v3.vercel.app', defaultLang: 'fr', scheme: 'clip', bundleIdentifier: 'com.intelligenceindustrielle.clip', package: 'com.intelligenceindustrielle.clip' },
  gesto: { name: 'Gesto', webUrl: 'https://getgesto.vercel.app', defaultLang: 'en', scheme: 'gesto', bundleIdentifier: 'com.example.public', package: 'com.example.public' },
}

describe('la marque de la coquille', () => {
  it('se choisit à la build ; sans valeur ou inconnue, CLIP', () => {
    expect(brandIdOf(undefined)).toBe('clip')
    expect(brandIdOf(' Gesto ')).toBe('gesto')
    expect(brandIdOf('autre')).toBe('clip')
    expect(BRAND.id).toBe('clip')
    expect(PRODUCTION_WEB_URL).toBe('https://clip-v3.vercel.app')
  })

  it('met le nom de la marque dans les mots de la coquille, fonctions comprises', () => {
    const pub = brandOf('gesto')
    expect(brandText('Une mise à jour de CLIP est requise', pub)).toBe('Une mise à jour de Gesto est requise')
    // Un nom de variable ou un extrait (« clip ») ne change pas.
    expect(brandText('Définissez EXPO_PUBLIC_CLIP_WEB_URL, puis un clip', pub)).toBe('Définissez EXPO_PUBLIC_CLIP_WEB_URL, puis un clip')
    const dict = { a: 'CLIP', b: { fn: (n: number) => `CLIP ${n}`, n: (x: number) => x * 2 } }
    const out = brandify(dict, pub)
    expect(out.a).toBe('Gesto')
    expect(out.b.fn(2)).toBe('Gesto 2')
    expect(out.b.n(2)).toBe(4)
    expect(brandify(dict, brandOf('clip'))).toBe(dict)
  })
})

describe('la configuration de la build (app.config.js)', () => {
  it('CLIP garde app.json tel quel, avec chacune de ses langues déclarée', () => {
    const c = resolveConfig(undefined)
    expect(c.name).toBe('CLIP')
    expect(c.ios.bundleIdentifier).toBe('com.intelligenceindustrielle.clip')
    expect(c.android.package).toBe('com.intelligenceindustrielle.clip')
    expect(c.plugins).toEqual(appJson.expo.plugins)
    expect(c.locales.fr.ios.NSCameraUsageDescription).toMatch(/^CLIP /)
    expect(Object.keys(c.locales)).toEqual(expect.arrayContaining(['fr', 'en']))
    // Chaque langue déclarée à iOS, sinon l'App Store n'en affiche qu'une partie.
    expect(c.ios.infoPlist.CFBundleLocalizations).toEqual(Object.keys(c.locales))
    expect(c.ios.infoPlist.CFBundleLocalizations).toHaveLength(18)
  })

  it('la marque publique ne se construit jamais sans ses propres identifiants', () => {
    expect(() => resolveConfig('gesto', { ...PUBLIC, gesto: { ...PUBLIC.gesto, bundleIdentifier: null } })).toThrow(/identifiants/)
  })

  it('la marque publique a son nom, ses identifiants, ses icônes et ses permissions à son nom, dans chaque langue', () => {
    const c = resolveConfig('gesto', PUBLIC)
    expect([c.name, c.scheme, c.ios.bundleIdentifier, c.android.package]).toEqual(['Gesto', 'gesto', 'com.example.public', 'com.example.public'])
    expect(c.icon).toBe('./assets/brands/gesto/icon.png')
    expect(c.android.adaptiveIcon.foregroundImage).toBe('./assets/brands/gesto/android-icon-foreground.png')
    expect(c.extra.brand).toBe('gesto')
    expect(c.ios.infoPlist.CFBundleLocalizations).toHaveLength(18)
    expect(c.extra.eas.projectId).toBe(appJson.expo.extra.eas.projectId)
    // Aucun « CLIP » nulle part : ni dans Info.plist, ni dans les modules, ni dans une langue.
    expect(JSON.stringify([c.ios.infoPlist, c.plugins, c.locales])).not.toMatch(/\bCLIP\b/)
    // Les textes par défaut sont dans la langue de base de la marque (l'anglais).
    expect(c.ios.infoPlist.NSCameraUsageDescription).toMatch(/^Gesto uses the camera/)
    const splash = c.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen')
    expect(splash[1].image).toBe('./assets/brands/gesto/splash-icon.png')
    const keys = Object.entries(c.locales as Record<string, { ios: Record<string, string> }>).map(([tag, locale]) => [tag, Object.keys(locale.ios).sort().join()])
    expect(keys.filter(([, k]) => k !== 'NSCameraUsageDescription,NSMicrophoneUsageDescription,NSPhotoLibraryUsageDescription')).toEqual([])
  })
})
