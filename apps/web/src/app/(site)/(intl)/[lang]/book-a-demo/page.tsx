import type { Metadata } from 'next'
import { BookPage } from '@/components/site/pages/BookPage'
import { pageMetadata } from '@/lib/site/metadata'
import { intlLang } from '@/lib/site/intl'

export const dynamic = 'force-static'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata('book', intlLang((await params).lang))
}

export default async function Page({ params }: Props) {
  return <BookPage lang={intlLang((await params).lang)} />
}
