/**
 * Les métadonnées d'une page du site : titre et description du dictionnaire, canonique, hreflang
 * (fr-CA, en, x-default → le français), Open Graph et Twitter. Les images Open Graph et Twitter sont
 * générées par chaque page (`opengraph-image.tsx`, `twitter-image.tsx`, `src/lib/site/og.tsx`).
 */
import type { Metadata } from 'next'
import { content } from './content'
import { HREFLANG, OG_LOCALE, otherLang, type SiteLang } from './lang'
import { ROUTES, type PageKey } from './routes'

/** Les adresses de la page dans chaque langue, pour hreflang (relatives : `metadataBase` les complète). */
export function languageAlternates(page: PageKey): Record<string, string> {
  return { [HREFLANG.fr]: ROUTES[page].fr, [HREFLANG.en]: ROUTES[page].en, 'x-default': ROUTES[page].fr }
}

export function pageMetadata(page: PageKey, lang: SiteLang): Metadata {
  const t = content(lang)
  const { title, description } = t.meta[page]
  const path = ROUTES[page][lang]
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path, languages: languageAlternates(page) },
    openGraph: {
      type: 'website',
      siteName: t.brand.name,
      locale: OG_LOCALE[lang],
      alternateLocale: [OG_LOCALE[otherLang(lang)]],
      url: path,
      title,
      description,
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
  }
}
