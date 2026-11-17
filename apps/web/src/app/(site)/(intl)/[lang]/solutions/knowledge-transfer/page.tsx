import type { Metadata } from 'next'
import { SolutionPage } from '@/components/site/pages/SolutionPage'
import { pageMetadata } from '@/lib/site/metadata'
import { intlLang } from '@/lib/site/intl'

export const dynamic = 'force-static'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata('knowledge', intlLang((await params).lang))
}

export default async function Page({ params }: Props) {
  return <SolutionPage lang={intlLang((await params).lang)} page="knowledge" />
}
