/**
 * La configuration de l'app selon sa marque : `EXPO_PUBLIC_BRAND`, posée par le profil de build d'EAS
 * (eas.json) ; sans valeur, CLIP.
 *
 * app.json reste la base, celle de CLIP, que les outils lisent tels quels. La marque publique y change
 * son nom, ses identifiants, son schéma de liens, ses icônes (assets/brands/<marque>/, refaites par
 * `npm run brand-icons` d'apps/web) et les textes de ses permissions. Les textes des permissions
 * (locales/<langue>.json) gardent le jeton CLIP, remplacé ici par le nom de la marque, dans les
 * dix-huit langues de l'app : chacune est déclarée, et les magasins l'annoncent.
 *
 * Les marques sont dans brands.json, que la coquille lit aussi (src/config/brand.ts) : même nom et même
 * adresse que la marque du web (apps/web/src/lib/brand/product.ts).
 */
const fs = require('fs')
const path = require('path')
const brands = require('./brands.json')

/** Le fichier de chaque langue → l'étiquette de langue d'iOS (le dossier <étiquette>.lproj). */
const LOCALE_TAGS = {
  fr: 'fr',
  en: 'en',
  es: 'es',
  pt: 'pt-BR',
  de: 'de',
  it: 'it',
  pl: 'pl',
  nl: 'nl',
  cs: 'cs',
  ro: 'ro',
  hu: 'hu',
  tr: 'tr',
  zh: 'zh-Hans',
  ja: 'ja',
  ko: 'ko',
  vi: 'vi',
  id: 'id',
  th: 'th',
}

/** Les propriétés des modules qui portent un texte de permission → la clé d'Info.plist au même sens. */
const PERMISSION_PROPS = {
  cameraPermission: 'NSCameraUsageDescription',
  microphonePermission: 'NSMicrophoneUsageDescription',
  photosPermission: 'NSPhotoLibraryUsageDescription',
}

const brandIdOf = (value) => {
  const id = (value ?? '').trim().toLowerCase()
  return Object.hasOwn(brands, id) ? id : 'clip'
}

const readLocale = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', `${file}.json`), 'utf8'))

module.exports = ({ config }) => {
  const id = brandIdOf(process.env.EXPO_PUBLIC_BRAND)
  const brand = brands[id]
  const text = (s) => (id === 'clip' ? s : s.replace(/\bCLIP\b/g, brand.name))
  const withText = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? text(v) : v]))

  const locales = {}
  for (const [file, tag] of Object.entries(LOCALE_TAGS)) {
    if (!fs.existsSync(path.join(__dirname, 'locales', `${file}.json`))) continue
    const json = readLocale(file)
    locales[tag] = { ...json, ios: withText(json.ios ?? {}) }
  }
  if (id === 'clip') return { ...config, locales }

  // Jamais une build de la marque publique avec les identifiants de CLIP : ils ne se changent plus ensuite.
  if (!brand.bundleIdentifier || !brand.package) {
    throw new Error(`La marque « ${id} » n'a pas encore ses identifiants : bundleIdentifier et package dans brands.json.`)
  }
  // Les textes de permissions par défaut (avant ceux de chaque langue) : dans la langue de base de la marque.
  const base = withText(readLocale(brand.defaultLang).ios)
  const asset = (file) => `./assets/brands/${id}/${file}`
  const plugins = (config.plugins ?? []).map((plugin) => {
    if (!Array.isArray(plugin)) return plugin
    const [name, props] = plugin
    if (!props || typeof props !== 'object') return plugin
    if (name === 'expo-splash-screen') {
      return [name, { ...props, image: asset('splash-icon.png'), dark: { ...props.dark, image: asset('splash-icon.png') } }]
    }
    const next = { ...props }
    for (const [prop, key] of Object.entries(PERMISSION_PROPS)) if (typeof next[prop] === 'string') next[prop] = base[key]
    return [name, next]
  })

  return {
    ...config,
    name: brand.name,
    scheme: brand.scheme,
    icon: asset('icon.png'),
    ios: {
      ...config.ios,
      bundleIdentifier: brand.bundleIdentifier,
      infoPlist: { ...config.ios?.infoPlist, ...base },
    },
    android: {
      ...config.android,
      package: brand.package,
      adaptiveIcon: {
        ...config.android?.adaptiveIcon,
        foregroundImage: asset('android-icon-foreground.png'),
        backgroundImage: asset('android-icon-background.png'),
        monochromeImage: asset('android-icon-monochrome.png'),
      },
    },
    web: { ...config.web, favicon: asset('favicon.png') },
    plugins,
    locales,
    extra: { ...config.extra, brand: id },
  }
}
