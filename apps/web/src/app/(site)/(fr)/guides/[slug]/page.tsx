import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GuidePage } from '@/components/site/pages/GuidePage'
import { GUIDE_SLUGS, guideKeyOf, GUIDES } from '@/lib/site/guides'
import { guideMetadata } from '@/lib/site/guides/metadata'

export const dynamic = 'force-static'
export const dynamicParams = false
export const generateStaticParams = () => GUIDES.map((key) => ({ slug: GUIDE_SLUGS[key].fr }))

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = guideKeyOf((await params).slug, 'fr')
  return key ? guideMetadata(key, 'fr') : {}
}

export default async function Page({ params }: Props) {
  const key = guideKeyOf((await params).slug, 'fr')
  if (!key) notFound()
  return <GuidePage lang="fr" guide={key} />
}
