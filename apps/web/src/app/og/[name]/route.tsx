/**
 * Les images de partage (Open Graph, Twitter) à une adresse stable, pour les pages qui n'ont pas leur
 * propre fichier `opengraph-image` : le site dans les seize autres langues, et les guides. Next 16 ajoute
 * un suffixe aux images de fichier (`/en/pricing/opengraph-image-1tvkvk`) : une adresse écrite à la main
 * vers elles répondait 404 (novembre 2026). Le texte est en anglais (la police des images est latine).
 */
import { GUIDES, guidesIn, type GuideKey } from '@/lib/site/guides'
import { ogImageWithTitle, siteOgImage } from '@/lib/site/og'
import { PAGES, type PageKey } from '@/lib/site/routes'

export const dynamic = 'force-static'
export const dynamicParams = false

export const generateStaticParams = () => [...PAGES.map((p) => ({ name: `${p}.png` })), ...GUIDES.map((k) => ({ name: `guide-${k}.png` }))]

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = (await params).name.replace(/\.png$/, '')
  if ((PAGES as readonly string[]).includes(name)) return siteOgImage('en', name as PageKey)
  const key = name.startsWith('guide-') ? name.slice('guide-'.length) : ''
  const guide = (GUIDES as readonly string[]).includes(key) ? guidesIn('en')?.guides[key as GuideKey] : null
  if (guide) return ogImageWithTitle('en', guide.title)
  return new Response(null, { status: 404 })
}
