import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/providers/Providers'
import { THEME_SCRIPT } from '@/lib/theme'
import './globals.css'
import { ShellSplash } from '@/components/ShellSplash'
import { PRODUCT, SERVER_META } from '@/lib/brand/product'

/**
 * Les métadonnées se rendent au serveur, qui ne connaît pas la langue de l'outil (choisie dans le
 * navigateur, `clip_pref_ui_lang`) : elles restent dans la langue par défaut de la marque (`SERVER_META`).
 * Les icônes et le manifeste sont ceux de la marque de la build (`public/brands/<marque>/`).
 */
export const metadata: Metadata = {
  title: { default: SERVER_META.title, template: `%s · ${PRODUCT.name}` },
  description: SERVER_META.description,
  applicationName: PRODUCT.name,
  appleWebApp: { capable: true, title: PRODUCT.name, statusBarStyle: 'default' },
  icons: { icon: `/brands/${PRODUCT.id}/icon.svg`, apple: `/brands/${PRODUCT.id}/apple-touch-icon.png` },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Une app, pas un document : les écrans ne se zooment pas au pincement (ni au focus d'un champ sur iOS).
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f18' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={SERVER_META.lang} suppressHydrationWarning data-preset="ocean">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300..900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="app-bg no-print" aria-hidden>
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="grain" />
        </div>
        <ShellSplash />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
