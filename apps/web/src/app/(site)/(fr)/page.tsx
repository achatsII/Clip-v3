import type { Metadata } from 'next'
import { HomePage } from '@/components/site/pages/HomePage'
import { pageMetadata } from '@/lib/site/metadata'

export const dynamic = 'force-static'
export const metadata: Metadata = pageMetadata('home', 'fr')

export default function Page() {
  return <HomePage lang="fr" />
}
