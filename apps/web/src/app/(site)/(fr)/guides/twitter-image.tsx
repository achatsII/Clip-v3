import { guidesIn } from '@/lib/site/guides'
import { OG_CONTENT_TYPE, OG_SIZE, ogImageWithTitle } from '@/lib/site/og'

export const alt = guidesIn('fr')?.index.h1 ?? ''
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return ogImageWithTitle('fr', guidesIn('fr')?.index.title ?? '')
}
