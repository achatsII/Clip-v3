import type { Metadata } from 'next'
import { FeaturesPage } from '@/components/site/pages/FeaturesPage'
import { pageMetadata } from '@/lib/site/metadata'

export const dynamic = 'force-static'
export const metadata: Metadata = pageMetadata('features', 'fr')

export default function Page() {
  return <FeaturesPage lang="fr" />
}
