import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GuidePage } from '@/components/site/pages/GuidePage'
import { GUIDE_SLUGS, guideKeyOf, GUIDES, hasGuides } from '@/lib/site/guides'
import { guideMetadata } from '@/lib/site/guides/metadata'
import { intlLang } from '@/lib/site/intl'
import { isSiteLang } from '@/lib/site/lang'

export const dynamic = 'force-static'
export const dynamicParams = false

/** Les guides de chaque langue qui les a déjà (slugs anglais) ; une langue sans guides n'en a aucun. */
export const generateStaticParams = ({ params }: { params: { lang: string } }) =>
  isSiteLang(params.lang) && hasGuides(params.lang) ? GUIDES.map((key) => ({ slug: GUIDE_SLUGS[key].en })) : []

type Props = { params: Promise<{ lang: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  const l = intlLang(lang)
  const key = guideKeyOf(slug, l)
  return key && hasGuides(l) ? guideMetadata(key, l) : {}
}

export default async function Page({ params }: Props) {
  const { lang, slug } = await params
  const l = intlLang(lang)
  const key = guideKeyOf(slug, l)
  if (!key || !hasGuides(l)) notFound()
  return <GuidePage lang={l} guide={key} />
}
