import type { MetadataRoute } from 'next'
import { content } from '@/lib/site/content'
import { HREFLANG, SITE_LANGS } from '@/lib/site/lang'
import { FILM } from '@/lib/site/media'
import { absoluteUrl, PAGES, ROUTES, type PageKey } from '@/lib/site/routes'

/** Le plan du site : les pages du site public, en français et en anglais, rien de l'app. */
export const dynamic = 'force-static'

const PRIORITY: Partial<Record<PageKey, number>> = { home: 1, pricing: 0.9, features: 0.9, book: 0.8 }

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return PAGES.flatMap((page) =>
    SITE_LANGS.map((lang) => {
      const t = content(lang)
      return {
        url: absoluteUrl(ROUTES[page][lang]),
        lastModified,
        changeFrequency: 'monthly' as const,
        priority: PRIORITY[page] ?? 0.7,
        alternates: {
          languages: {
            [HREFLANG.fr]: absoluteUrl(ROUTES[page].fr),
            [HREFLANG.en]: absoluteUrl(ROUTES[page].en),
            'x-default': absoluteUrl(ROUTES[page].fr),
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
