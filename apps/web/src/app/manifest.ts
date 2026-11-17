import type { MetadataRoute } from 'next'
import { BRAND } from '@/lib/brand/colors'
import { PRODUCT, SERVER_META } from '@/lib/brand/product'

/** Le manifeste de l'app installée (écran d'accueil), au nom et aux icônes de la marque de la build. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SERVER_META.title,
    short_name: PRODUCT.name,
    start_url: '/accueil',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: BRAND.primary,
    lang: SERVER_META.lang,
    icons: [
      { src: `/brands/${PRODUCT.id}/icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: `/brands/${PRODUCT.id}/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `/brands/${PRODUCT.id}/icon-512.png`, sizes: '512x512', type: 'image/png' },
      { src: `/brands/${PRODUCT.id}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' },
    ],
  }
}
