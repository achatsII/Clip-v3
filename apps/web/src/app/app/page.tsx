import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppDownload } from '@/components/devices/AppDownload'
import { PRODUCT, storeUrlFor } from '@/lib/brand/product'
import { serverToggles } from '@/lib/serverToggles'

export const metadata: Metadata = { title: PRODUCT.name, robots: { index: false, follow: false } }

// Chaque visite : l'appareil (l'agent du navigateur) et le toggle du moment. Sinon la build fige la page (redirection
// vers l'accueil, toggle éteint au moment de la build).
export const dynamic = 'force-dynamic'

/**
 * Le lien du code QR « L'app sur votre téléphone » : un iPhone part vers l'App Store, un Android vers Google Play ; un
 * ordinateur voit le code et les liens. Toggle `storeLinks` éteint (fiches pas encore en ligne) : l'accueil du site.
 */
export default async function AppPage() {
  const userAgent = (await headers()).get('user-agent') ?? ''
  if (!serverToggles().storeLinks) redirect('/')
  const store = storeUrlFor(userAgent)
  if (store) redirect(store)
  return <AppDownload />
}
