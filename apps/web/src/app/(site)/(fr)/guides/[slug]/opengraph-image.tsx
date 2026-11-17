import { GUIDE_SLUGS, guideKeyOf, GUIDES, guidesIn } from '@/lib/site/guides'
import { OG_CONTENT_TYPE, OG_SIZE, ogImageWithTitle } from '@/lib/site/og'

export const alt = guidesIn('fr')?.ui.guides ?? ''
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const generateStaticParams = () => GUIDES.map((key) => ({ slug: GUIDE_SLUGS[key].fr }))

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const key = guideKeyOf((await params).slug, 'fr')
  const g = key ? guidesIn('fr')?.guides[key] : null
  return ogImageWithTitle('fr', g?.title ?? '')
}
