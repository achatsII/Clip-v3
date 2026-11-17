/**
 * Les langues du site public : les dix-huit de l'outil (français du Québec à la racine, anglais sous /en,
 * les autres sous /<langue>, avec les slugs anglais). Ce module ne tire pas les dictionnaires de l'app
 * (`src/lib/i18n`), pour rester léger dans les composants client : le site est statique, sa langue vient
 * de l'adresse.
 */
export const SITE_LANGS = ['fr', 'en', 'es', 'pt', 'de', 'it', 'pl', 'nl', 'cs', 'ro', 'hu', 'tr', 'zh', 'ja', 'ko', 'vi', 'id', 'th'] as const
export type SiteLang = (typeof SITE_LANGS)[number]

/** Les langues servies sous /<langue> (toutes sauf le français, à la racine, et l'anglais, sous /en). */
export const INTL_LANGS = SITE_LANGS.filter((l): l is Exclude<SiteLang, 'fr' | 'en'> => l !== 'fr' && l !== 'en')
export type IntlLang = (typeof INTL_LANGS)[number]

export const isSiteLang = (l: unknown): l is SiteLang => typeof l === 'string' && (SITE_LANGS as readonly string[]).includes(l)

/** Le nom de chaque langue, écrit dans la langue elle-même (le menu des langues). */
export const SITE_LANG_NAMES: Record<SiteLang, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  pt: 'Português (Brasil)',
  de: 'Deutsch',
  it: 'Italiano',
  pl: 'Polski',
  nl: 'Nederlands',
  cs: 'Čeština',
  ro: 'Română',
  hu: 'Magyar',
  tr: 'Türkçe',
  zh: '简体中文',
  ja: '日本語',
  ko: '한국어',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  th: 'ไทย',
}

/** La locale des nombres, des prix et des dates du site. */
export const SITE_LOCALE: Record<SiteLang, string> = {
  fr: 'fr-CA',
  en: 'en-CA',
  es: 'es-MX',
  pt: 'pt-BR',
  de: 'de-DE',
  it: 'it-IT',
  pl: 'pl-PL',
  nl: 'nl-NL',
  cs: 'cs-CZ',
  ro: 'ro-RO',
  hu: 'hu-HU',
  tr: 'tr-TR',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  vi: 'vi-VN',
  id: 'id-ID',
  th: 'th-TH',
}

/** L'attribut hreflang (et `<html lang>`) de chaque langue. */
export const HREFLANG: Record<SiteLang, string> = {
  fr: 'fr-CA',
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

/** La locale Open Graph. */
export const OG_LOCALE: Record<SiteLang, string> = {
  fr: 'fr_CA',
  en: 'en_CA',
  es: 'es_MX',
  pt: 'pt_BR',
  de: 'de_DE',
  it: 'it_IT',
  pl: 'pl_PL',
  nl: 'nl_NL',
  cs: 'cs_CZ',
  ro: 'ro_RO',
  hu: 'hu_HU',
  tr: 'tr_TR',
  zh: 'zh_CN',
  ja: 'ja_JP',
  ko: 'ko_KR',
  vi: 'vi_VN',
  id: 'id_ID',
  th: 'th_TH',
}

/** Un modèle de texte du dictionnaire : `{nom}` remplacé par sa valeur. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (all, key: string) => (key in values ? String(values[key]) : all))
}

/** Un nombre dans la langue du site (« 12 000 » ou « 12,000 »). */
export const siteNum = (n: number, lang: SiteLang) => n.toLocaleString(SITE_LOCALE[lang])
