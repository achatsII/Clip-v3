/**
 * Les langues du site public (français du Québec par défaut, anglais sous /en). Ce module ne touche
 * pas aux langues de l'app (`src/lib/i18n`) : le site est statique, sa langue vient de l'adresse.
 */
export const SITE_LANGS = ['fr', 'en'] as const
export type SiteLang = (typeof SITE_LANGS)[number]

/** La locale des nombres, des prix et des dates du site. */
export const SITE_LOCALE: Record<SiteLang, string> = { fr: 'fr-CA', en: 'en-CA' }

/** L'attribut hreflang de chaque langue. */
export const HREFLANG: Record<SiteLang, string> = { fr: 'fr-CA', en: 'en' }

/** La locale Open Graph. */
export const OG_LOCALE: Record<SiteLang, string> = { fr: 'fr_CA', en: 'en_CA' }

export const otherLang = (lang: SiteLang): SiteLang => (lang === 'fr' ? 'en' : 'fr')

/** Un modèle de texte du dictionnaire : `{nom}` remplacé par sa valeur. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (all, key: string) => (key in values ? String(values[key]) : all))
}

/** Un nombre dans la langue du site (« 12 000 » ou « 12,000 »). */
export const siteNum = (n: number, lang: SiteLang) => n.toLocaleString(SITE_LOCALE[lang])
