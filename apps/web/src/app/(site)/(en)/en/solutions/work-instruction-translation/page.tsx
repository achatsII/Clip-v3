import type { Metadata } from 'next'
import { SolutionPage } from '@/components/site/pages/SolutionPage'
import { pageMetadata } from '@/lib/site/metadata'

export const dynamic = 'force-static'
export const metadata: Metadata = pageMetadata('translation', 'en')

export default function Page() {
  return <SolutionPage lang="en" page="translation" />
}
