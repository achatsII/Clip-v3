import type { MetadataRoute } from 'next'
import { APP_PATHS, SITE_INDEXED, SITE_URL } from '@/lib/site/routes'

/**
 * Les moteurs lisent le site public ; l'app, ses liens publics et ses routes restent hors de l'index. Le
 * site de CLIP (vendu par l'équipe) ne s'indexe pas du tout : seule la marque publique se fait trouver.
 */
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXED) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/', disallow: APP_PATHS },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
