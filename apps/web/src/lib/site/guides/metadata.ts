/**
 * Les métadonnées des guides : titre et description du guide, canonique, hreflang (les langues où le
 * guide existe ; x-default → la langue par défaut de la marque, sinon l'anglais), Open Graph et Twitter.
 * Un guide que personne n'a encore approuvé dit `noindex` ; la page des guides aussi, tant qu'aucun ne l'est.
 */
import type { Metadata } from 'next'
import { PRODUCT } from '@/lib/brand/product'
import { content } from '../content'
import type { Crumb } from '../crumbs'
import { HREFLANG, OG_LOCALE, type SiteLang } from '../lang'
import { ROUTES, SITE_INDEXED } from '../routes'
import { approvedGuides, guideAlternates, guidePath, guidesIn, guidesIndexPath, isApproved, type GuideKey } from '.'

function languages(key: GuideKey | null): Record<string, string> {
  const pairs = guideAlternates(key)
  const fallback = pairs.find(([l]) => l === PRODUCT.defaultLang) ?? pairs.find(([l]) => l === 'en') ?? pairs[0]
  return { ...Object.fromEntries(pairs.map(([l, path]) => [HREFLANG[l], path])), ...(fallback ? { 'x-default': fallback[1] } : {}) }
}

/**
 * L'image de partage d'un guide (ou de la page des guides), à son adresse stable (`/og/…png`) : le
 * français et l'anglais ont aussi leurs fichiers `opengraph-image`, dont l'adresse porte un suffixe.
 */
export function guideImage(key: GuideKey | null): string {
  return key ? `/og/guide-${key}.png` : '/og/home.png'
}

function metadataOf(lang: SiteLang, key: GuideKey | null, title: string, description: string, path: string, indexed: boolean): Metadata {
  const t = content(lang)
  const own = lang === 'fr' || lang === 'en'
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path, languages: languages(key) },
    openGraph: {
      type: key ? 'article' : 'website',
      siteName: t.brand.name,
      locale: OG_LOCALE[lang],
      url: path,
      title,
      description,
      // Le français et l'anglais ont leur image (fichiers opengraph-image) ; les autres langues, celle de l'anglais.
      ...(own ? {} : { images: [guideImage(key)] }),
    },
    twitter: { card: 'summary_large_image', title, description, ...(own ? {} : { images: [guideImage(key)] }) },
    robots: indexed ? { index: true, follow: true } : { index: false, follow: false },
  }
}

export function guideMetadata(key: GuideKey, lang: SiteLang): Metadata {
  const g = guidesIn(lang)?.guides[key]
  if (!g) return {}
  return metadataOf(lang, key, g.title, g.description, guidePath(key, lang), SITE_INDEXED && isApproved(key))
}

export function guidesIndexMetadata(lang: SiteLang): Metadata {
  const d = guidesIn(lang)
  if (!d) return {}
  return metadataOf(lang, null, d.index.title, d.index.description, guidesIndexPath(lang), SITE_INDEXED && approvedGuides().length > 0)
}

/** Le fil d'Ariane d'une page des guides : l'accueil, les guides, puis le guide. */
export function guideCrumbs(lang: SiteLang, key: GuideKey | null): Crumb[] {
  const d = guidesIn(lang)
  const home = { name: content(lang).breadcrumb.home, path: ROUTES.home[lang] }
  if (!d) return [home]
  const index = { name: d.ui.guides, path: guidesIndexPath(lang) }
  return key ? [home, index, { name: d.guides[key].h1, path: guidePath(key, lang) }] : [home, index]
}
