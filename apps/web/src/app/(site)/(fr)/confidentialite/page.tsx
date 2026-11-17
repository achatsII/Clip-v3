import type { Metadata } from 'next'
import { PrivacyPage } from '@/components/site/pages/PrivacyPage'
import { PRODUCT } from '@/lib/brand/product'

export const dynamic = 'force-static'
export const metadata: Metadata = { title: { absolute: `Politique de confidentialité · ${PRODUCT.name}` }, alternates: { canonical: '/confidentialite' } } // i18n-ignore : rendu au serveur

export default function Page() {
  return <PrivacyPage lang={'fr'} />
}
