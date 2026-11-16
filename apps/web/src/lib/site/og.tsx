/**
 * Les images Open Graph et Twitter du site (1200 × 630), générées au build par `next/og` : la marque
 * Clip, le titre court de la page, la mention d'Intelligence Industrielle, une photo. Dans `src/lib/site/og/` :
 * Inter (sous-ensemble latin, licence OFL) et la photo en JPEG, copie de `public/site/photos/filmer.webp`
 * (le rendu de `next/og` ne lit pas le WebP).
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { BRAND } from '../brand/colors'
import { iconSvg } from '../brand/marks'
import { content } from './content'
import type { SiteLang } from './lang'
import type { PageKey } from './routes'

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const ASSET_DIR = join(process.cwd(), 'src/lib/site/og')
let fonts: Promise<[Buffer, Buffer]> | null = null
const loadFonts = () => (fonts ??= Promise.all([readFile(join(ASSET_DIR, 'inter-black.otf')), readFile(join(ASSET_DIR, 'inter-bold.otf'))]))
/** La photo de la carte inclinée (une technicienne filme un machiniste), sans texte incrusté : la même dans les deux langues. */
let photo: Promise<string> | null = null
const loadPhoto = () => (photo ??= readFile(join(ASSET_DIR, 'filmer.jpg')).then((b) => `data:image/jpeg;base64,${b.toString('base64')}`))

/** Le texte de remplacement de l'image d'une page. */
export const ogAlt = (lang: SiteLang, page: PageKey) => `${content(lang).og.alt} — ${content(lang).og[page]}`

// Le logo de CLIP (banque `src/lib/brand/marks.ts`), dans la couleur par défaut.
const MARK = `data:image/svg+xml;base64,${Buffer.from(iconSvg({ from: BRAND.from, to: BRAND.to, shape: 'rounded' })).toString('base64')}`

export async function siteOgImage(lang: SiteLang, page: PageKey): Promise<ImageResponse> {
  const t = content(lang)
  const [[black, bold], picture] = await Promise.all([loadFonts(), loadPhoto()])
  const title = t.og[page]
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        backgroundColor: '#f8fafc',
        backgroundImage:
          // Le même fond calme que l'app : un voile de la couleur de CLIP et de bleu froid.
          `radial-gradient(circle at 12% 8%, rgba(${BRAND.rgb}, 0.16) 0%, rgba(${BRAND.rgb}, 0) 45%), radial-gradient(circle at 92% 88%, rgba(56, 189, 248, 0.14) 0%, rgba(56, 189, 248, 0) 50%)`,
        fontFamily: 'Inter',
        color: '#0f172a',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 700,
          top: 92,
          width: 560,
          height: 450,
          borderRadius: 48,
          transform: 'rotate(7deg)',
          backgroundImage: `linear-gradient(135deg, ${BRAND.from} 0%, ${BRAND.to} 100%)`,
          boxShadow: '0 40px 80px rgba(15,23,42,0.30)',
          padding: 14,
          display: 'flex',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={picture} width={532} height={422} alt="" style={{ borderRadius: 36, objectFit: 'cover' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', width: 680, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK} width={64} height={64} alt="" />
          <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2 }}>{t.brand.wordmark}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', color: BRAND.strong }}>{t.og.kicker}</span>
          <span style={{ fontSize: title.length > 44 ? 60 : 72, fontWeight: 900, lineHeight: 1.03, letterSpacing: -3 }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 700, color: '#475569' }}>
          <span>{t.brand.poweredBy}</span>
          <span style={{ fontWeight: 900, color: '#0f172a' }}>{t.brand.company}</span>
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Inter', data: black, weight: 900, style: 'normal' },
        { name: 'Inter', data: bold, weight: 700, style: 'normal' },
      ],
    },
  )
}
