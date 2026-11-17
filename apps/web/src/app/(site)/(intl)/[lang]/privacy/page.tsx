import type { Metadata } from 'next'
import { PrivacyPage } from '@/components/site/pages/PrivacyPage'
import { PRODUCT } from '@/lib/brand/product'
import { intlLang } from '@/lib/site/intl'

export const dynamic = 'force-static'
export const metadata: Metadata = { title: { absolute: `Privacy policy · ${PRODUCT.name}` }, alternates: { canonical: '/en/privacy' } }

type Props = { params: Promise<{ lang: string }> }

export default async function Page({ params }: Props) {
  return <PrivacyPage lang={intlLang((await params).lang)} />
}
