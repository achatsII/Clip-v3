import type { Metadata } from 'next'
import { PricingPage } from '@/components/site/pages/PricingPage'
import { pageMetadata } from '@/lib/site/metadata'
import { intlLang } from '@/lib/site/intl'

export const dynamic = 'force-static'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata('pricing', intlLang((await params).lang))
}

export default async function Page({ params }: Props) {
  return <PricingPage lang={intlLang((await params).lang)} />
}
