import type { Metadata } from 'next'
import { BookPage } from '@/components/site/pages/BookPage'
import { pageMetadata } from '@/lib/site/metadata'

export const dynamic = 'force-static'
export const metadata: Metadata = pageMetadata('book', 'fr')

export default function Page() {
  return <BookPage lang="fr" />
}
