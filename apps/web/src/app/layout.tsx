import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/providers/Providers'
import { THEME_SCRIPT } from '@/lib/theme'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'CLIP — Instructions de travail', template: '%s · CLIP' },
  description: "Filmez, parlez, l'IA rédige l'instruction de travail. Vos opérateurs la trouvent au bon poste, au bon moment.",
  applicationName: 'CLIP',
  appleWebApp: { capable: true, title: 'CLIP', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg' },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f18' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-CA" suppressHydrationWarning data-preset="ocean">
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
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
