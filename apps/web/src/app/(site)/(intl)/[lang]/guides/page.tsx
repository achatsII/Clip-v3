import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GuidesIndexPage } from '@/components/site/pages/GuidesIndexPage'
import { hasGuides } from '@/lib/site/guides'
import { guidesIndexMetadata } from '@/lib/site/guides/metadata'
import { intlLang } from '@/lib/site/intl'

export const dynamic = 'force-static'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return guidesIndexMetadata(intlLang((await params).lang))
}

/** Les guides d'une langue qui ne les a pas encore : 404. */
export default async function Page({ params }: Props) {
  const lang = intlLang((await params).lang)
  if (!hasGuides(lang)) notFound()
  return <GuidesIndexPage lang={lang} />
}
