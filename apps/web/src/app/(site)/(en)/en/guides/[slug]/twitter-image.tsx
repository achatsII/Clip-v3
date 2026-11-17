import { GUIDE_SLUGS, guideKeyOf, GUIDES, guidesIn } from '@/lib/site/guides'
import { OG_CONTENT_TYPE, OG_SIZE, ogImageWithTitle } from '@/lib/site/og'

export const alt = guidesIn('en')?.ui.guides ?? ''
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const generateStaticParams = () => GUIDES.map((key) => ({ slug: GUIDE_SLUGS[key].en }))

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const key = guideKeyOf((await params).slug, 'en')
  const g = key ? guidesIn('en')?.guides[key] : null
  return ogImageWithTitle('en', g?.title ?? '')
}
