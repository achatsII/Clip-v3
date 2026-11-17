import type { MetadataRoute } from 'next'
import { content } from '@/lib/site/content'
import { HREFLANG, SITE_LANGS } from '@/lib/site/lang'
import { FILM } from '@/lib/site/media'
import { PRODUCT } from '@/lib/brand/product'
import { approvedGuides, guideAlternates, GUIDES_UPDATED, type GuideKey } from '@/lib/site/guides'
import { absoluteUrl, PAGES, ROUTES, SITE_INDEXED, type PageKey } from '@/lib/site/routes'

/** Le plan du site : les pages du site public, dans ses dix-huit langues, rien de l'app (vide quand le site ne s'indexe pas). */
export const dynamic = 'force-static'

const PRIORITY: Partial<Record<PageKey, number>> = { home: 1, pricing: 0.9, features: 0.9, book: 0.8 }

/** Les guides approuvés (et leur page) dans chaque langue où ils existent ; rien tant qu'aucun ne l'est. */
function guideEntries(): MetadataRoute.Sitemap {
  const approved = approvedGuides()
  if (!approved.length) return []
  const entry = (key: GuideKey | null): MetadataRoute.Sitemap => {
    const pairs = guideAlternates(key)
    const fallback = pairs.find(([l]) => l === PRODUCT.defaultLang) ?? pairs.find(([l]) => l === 'en') ?? pairs[0]
    const languages = { ...Object.fromEntries(pairs.map(([l, path]) => [HREFLANG[l], absoluteUrl(path)])), ...(fallback ? { 'x-default': absoluteUrl(fallback[1]) } : {}) }
    return pairs.map(([, path]) => ({
      url: absoluteUrl(path),
      lastModified: new Date(`${GUIDES_UPDATED}T12:00:00Z`),
      changeFrequency: 'monthly' as const,
      priority: key ? 0.6 : 0.5,
      alternates: { languages },
    }))
  }
  return [...entry(null), ...approved.flatMap((key) => entry(key))]
}

export default function sitemap(): MetadataRoute.Sitemap {
  if (!SITE_INDEXED) return []
  return [...pageEntries(), ...guideEntries()]
}

function pageEntries(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return PAGES.filter((page) => page !== 'book' || PRODUCT.enterprise).flatMap((page) =>
    SITE_LANGS.map((lang) => {
      const t = content(lang)
      return {
        url: absoluteUrl(ROUTES[page][lang]),
        lastModified,
        changeFrequency: 'monthly' as const,
        priority: PRIORITY[page] ?? 0.7,
        alternates: {
          languages: {
            ...Object.fromEntries(SITE_LANGS.map((l) => [HREFLANG[l], absoluteUrl(ROUTES[page][l])])),
            'x-default': absoluteUrl(ROUTES[page][PRODUCT.defaultLang]),
          },
        },
        ...(page === 'home'
          ? {
              videos: [
                {
                  title: t.film.title,
                  description: t.meta.home.description,
                  thumbnail_loc: absoluteUrl(FILM.poster),
                  content_loc: FILM.mp4_1080,
                  duration: 75,
                  publication_date: FILM.uploadDate,
                },
              ],
            }
          : {}),
      }
    }),
  )
}
