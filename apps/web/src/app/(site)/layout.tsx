import type { Metadata, Viewport } from 'next'
import { InlineScript } from '@/components/site/client'
import { ClipMark } from '@/components/site/ui'
import { SITE_GUARD_SCRIPT } from '@/lib/site/guard'
import { SEARCH_VERIFICATION, SITE_URL } from '@/lib/site/routes'
import { PRODUCT } from '@/lib/brand/product'
import './site.css'

/**
 * Le site public (français à la racine, anglais sous /en). Ses pages sont statiques. Le script de garde
 * passe avant tout le reste : dans la coquille mobile, ou avec une session sur `/`, on part vers l'app
 * sans jamais afficher le site (src/lib/site/guard.ts).
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Les icônes de la marque de la build (public/brands/<marque>/, `npm run brand-icons`).
  icons: { icon: `/brands/${PRODUCT.id}/icon.svg`, apple: `/brands/${PRODUCT.id}/apple-touch-icon.png` },
  // La vérification de la Search Console de Google et de Bing (jetons fournis par chaque outil, sans secret).
  verification: { google: SEARCH_VERIFICATION.google || undefined, other: SEARCH_VERIFICATION.bing ? { 'msvalidate.01': SEARCH_VERIFICATION.bing } : undefined },
}

/** La racine bloque le zoom (une app) ; un site se zoome. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f18' },
  ],
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InlineScript html={SITE_GUARD_SCRIPT} />
      <div className="site-leaving-mark" data-boot-loader aria-hidden>
        <ClipMark className="animate-float h-16 w-16" />
      </div>
      {children}
    </>
  )
}
