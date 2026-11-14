import type { Metadata, Viewport } from 'next'
import { InlineScript } from '@/components/site/client'
import { ClipMark } from '@/components/site/ui'
import { SITE_GUARD_SCRIPT } from '@/lib/site/guard'
import { SITE_URL } from '@/lib/site/routes'
import './site.css'

/**
 * Le site public (français à la racine, anglais sous /en). Ses pages sont statiques. Le script de garde
 * passe avant tout le reste : dans la coquille mobile, ou avec une session sur `/`, on part vers l'app
 * sans jamais afficher le site (src/lib/site/guard.ts).
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // La racine déclare déjà `icons` : Next n'y ajoute alors pas l'apple-icon de fichier, on le nomme ici.
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
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
      <div className="site-leaving-mark" aria-hidden>
        <ClipMark className="animate-float h-16 w-16" />
      </div>
      {children}
    </>
  )
}
