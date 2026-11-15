import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, siteOgImage } from '@/lib/site/og'

export const alt = ogAlt('en', 'lockout')
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return siteOgImage('en', 'lockout')
}
