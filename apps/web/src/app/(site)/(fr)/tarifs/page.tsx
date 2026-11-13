import type { Metadata } from 'next'
import { PricingPage } from '@/components/site/pages/PricingPage'
import { pageMetadata } from '@/lib/site/metadata'

export const dynamic = 'force-static'
export const metadata: Metadata = pageMetadata('pricing', 'fr')

export default function Page() {
  return <PricingPage lang="fr" />
}
