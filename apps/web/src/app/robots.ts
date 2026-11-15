import type { MetadataRoute } from 'next'
import { APP_PATHS, SITE_URL } from '@/lib/site/routes'

/** Les moteurs lisent le site public ; l'app, ses liens publics et ses routes restent hors de l'index. */
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: APP_PATHS },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
