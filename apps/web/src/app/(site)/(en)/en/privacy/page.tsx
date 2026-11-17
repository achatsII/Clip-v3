import type { Metadata } from 'next'
import { PrivacyPage } from '@/components/site/pages/PrivacyPage'
import { PRODUCT } from '@/lib/brand/product'

export const dynamic = 'force-static'
export const metadata: Metadata = { title: { absolute: `Privacy policy · ${PRODUCT.name}` }, alternates: { canonical: '/en/privacy' } }

export default function Page() {
  return <PrivacyPage lang={'en'} />
}
