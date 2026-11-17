import type { Metadata } from 'next'
import { HomePage } from '@/components/site/pages/HomePage'
import { pageMetadata } from '@/lib/site/metadata'
import { intlLang } from '@/lib/site/intl'

export const dynamic = 'force-static'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata('home', intlLang((await params).lang))
}

export default async function Page({ params }: Props) {
  return <HomePage lang={intlLang((await params).lang)} />
}
