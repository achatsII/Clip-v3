import type { Metadata } from 'next'
import { GuidesIndexPage } from '@/components/site/pages/GuidesIndexPage'
import { guidesIndexMetadata } from '@/lib/site/guides/metadata'

export const dynamic = 'force-static'

export const metadata: Metadata = guidesIndexMetadata('en')

export default function Page() {
  return <GuidesIndexPage lang="en" />
}
