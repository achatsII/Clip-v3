/**
 * Les métadonnées d'une page du site : titre et description du dictionnaire, canonique, hreflang (les
 * dix-huit langues, x-default → la langue par défaut de la marque), Open Graph et Twitter. Les images Open
 * Graph et Twitter sont générées par les pages en français et en anglais (`opengraph-image.tsx`,
 * `src/lib/site/og.tsx`) ; les autres langues reprennent l'image anglaise de la page. Un site qui ne doit
 * pas se trouver dans les moteurs (CLIP, vendu par l'équipe) le dit à chaque page (`SITE_INDEXED`).
 */
import type { Metadata } from 'next'
import { content } from './content'
import { PRODUCT } from '@/lib/brand/product'
import { HREFLANG, OG_LOCALE, SITE_LANGS, type SiteLang } from './lang'
import { ROUTES, SITE_INDEXED, type PageKey } from './routes'

/** Les adresses de la page dans chaque langue, pour hreflang (relatives : `metadataBase` les complète). */
export function languageAlternates(page: PageKey): Record<string, string> {
  return { ...Object.fromEntries(SITE_LANGS.map((l) => [HREFLANG[l], ROUTES[page][l]])), 'x-default': ROUTES[page][PRODUCT.defaultLang] }
}

/** L'image de partage d'une page à son adresse stable (`src/app/og/[name]/route.tsx`). */
export const shareImage = (page: PageKey): string => `/og/${page}.png`

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
      alternateLocale: SITE_LANGS.filter((l) => l !== lang).map((l) => OG_LOCALE[l]),
      url: path,
      title,
      description,
      // Hors du français et de l'anglais : l'image de la page en anglais, à son adresse stable (`/og/<page>.png` :
      // celles des fichiers `opengraph-image` portent un suffixe, et une adresse écrite à la main répondait 404).
      ...(lang === 'fr' || lang === 'en' ? {} : { images: [shareImage(page)] }),
    },
    twitter: { card: 'summary_large_image', title, description, ...(lang === 'fr' || lang === 'en' ? {} : { images: [shareImage(page)] }) },
    robots: SITE_INDEXED ? { index: true, follow: true } : { index: false, follow: false },
  }
}
