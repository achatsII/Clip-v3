import type { Metadata } from 'next'
import { FeaturesPage } from '@/components/site/pages/FeaturesPage'
import { pageMetadata } from '@/lib/site/metadata'
import { intlLang } from '@/lib/site/intl'

export const dynamic = 'force-static'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata('features', intlLang((await params).lang))
}

export default async function Page({ params }: Props) {
  return <FeaturesPage lang={intlLang((await params).lang)} />
}
