/**
 * Les données structurées (schema.org, JSON-LD) du site : l'organisation, le site, le logiciel et
 * ses offres (tirées du manifeste, en CAD), le film, la FAQ et le fil d'Ariane. Aucune note ni
 * aucun avis : Clip n'en a pas encore, on n'en invente pas.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { content, planName } from './content'
import { PRODUCT } from '@/lib/brand/product'
import { HREFLANG, SITE_LANGS, type SiteLang } from './lang'
import { filmFor, II_LOGO, PHOTOS } from './media'
import { siteCatalog } from './pricing'
import { crumbsFor, type Crumb } from './crumbs'
import { absoluteUrl, pathOf, SITE_URL, type PageKey } from './routes'

type Node = Record<string, unknown>

const ORG_ID = `${SITE_URL}/#organisation`
const SITE_ID = `${SITE_URL}/#site`
const APP_ID = `${SITE_URL}/#logiciel`

export function organizationLd(lang: SiteLang): Node {
  const t = content(lang)
  // La marque publique se présente seule (son nom, son site, son icône) ; CLIP, avec son entreprise.
  if (!PRODUCT.company) return { '@type': 'Organization', '@id': ORG_ID, name: PRODUCT.name, url: SITE_URL, logo: { '@type': 'ImageObject', url: absoluteUrl(`/brands/${PRODUCT.id}/icon-512.png`), width: 512, height: 512 } }
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: t.brand.company,
    url: t.brand.companyUrl,
    logo: { '@type': 'ImageObject', url: absoluteUrl(II_LOGO.onLight), width: II_LOGO.width, height: II_LOGO.height },
  }
}

export function websiteLd(): Node {
  const t = content('fr')
  return { '@type': 'WebSite', '@id': SITE_ID, url: SITE_URL, name: t.brand.name, inLanguage: SITE_LANGS.map((l) => HREFLANG[l]), publisher: { '@id': ORG_ID } }
}

/** Le logiciel et ses offres : chaque forfait du manifeste, à chaque intervalle, en dollars canadiens. */
export function softwareLd(lang: SiteLang): Node {
  const t = content(lang)
  const c = siteCatalog()
  const offers = c.plans.flatMap((plan) => {
    const name = planName(plan.code, lang, c)
    if (plan.quote) return []
    if (!plan.paid) return [{ '@type': 'Offer', name, price: '0', priceCurrency: 'CAD', url: absoluteUrl(pathOf('pricing', lang)) }]
    return plan.prices.map((p) => ({
      '@type': 'Offer',
      name: `${name} (${p.interval === 'month' ? t.pricing.monthly : t.pricing.yearly})`,
      price: (p.amountCents / 100).toFixed(2),
      priceCurrency: p.currency,
      url: absoluteUrl(pathOf('pricing', lang)),
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: (p.amountCents / 100).toFixed(2),
        priceCurrency: p.currency,
        billingDuration: p.interval === 'month' ? 'P1M' : 'P1Y',
        unitCode: p.interval === 'month' ? 'MON' : 'ANN',
      },
    }))
  })
  return {
    '@type': 'SoftwareApplication',
    '@id': APP_ID,
    name: t.brand.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    description: t.meta.home.description,
    url: absoluteUrl(pathOf('home', lang)),
    image: absoluteUrl(PRODUCT.film ? filmFor(lang).poster : PHOTOS.filming.src),
    inLanguage: SITE_LANGS.map((l) => HREFLANG[l]),
    publisher: { '@id': ORG_ID },
    offers,
  }
}

/** Le texte des sous-titres, sans les temps : la transcription du film. */
export function transcriptOf(vtt: string): string {
  return vtt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && l !== 'WEBVTT' && !l.includes('-->') && !/^\d+$/.test(l))
    .join(' ')
    .replace(/\s+/g, ' ')
}

/**
 * Le film de la page : la voix française en français, l'anglaise ailleurs. Les sous-titres de la page, et
 * la transcription de la voix (ses propres sous-titres).
 */
export function videoLd(lang: SiteLang): Node {
  const t = content(lang)
  const film = filmFor(lang)
  const captionLang: SiteLang = film.subtitles[lang] ? lang : film.voice
  const node: Node = {
    '@type': 'VideoObject',
    name: t.film.title,
    description: t.meta.home.description,
    thumbnailUrl: [absoluteUrl(film.poster)],
    uploadDate: film.uploadDate,
    duration: film.duration,
    contentUrl: film.mp4_1080,
    width: film.width,
    height: film.height,
    inLanguage: HREFLANG[film.voice],
    caption: { '@type': 'MediaObject', contentUrl: absoluteUrl(film.subtitles[captionLang]!), encodingFormat: 'text/vtt', inLanguage: HREFLANG[captionLang] },
    publisher: { '@id': ORG_ID },
  }
  // Le dossier public de l'app web : `public` au build (apps/web), `apps/web/public` depuis la racine.
  const words = film.subtitles[film.voice]!
  const file = [join(process.cwd(), 'public', words), join(process.cwd(), 'apps/web/public', words)].find((f) => existsSync(f))
  if (file) node.transcript = transcriptOf(readFileSync(file, 'utf8'))
  return node
}

export function faqLd(items: Array<{ q: string; a: string }>): Node {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }
}

/** Le fil d'Ariane d'une page : l'accueil, puis la page (le même qu'à l'écran, `crumbsFor`). */
export function breadcrumbLd(lang: SiteLang, page: PageKey): Node {
  return crumbListLd(crumbsFor(lang, page))
}

/** Un fil d'Ariane donné (les guides : l'accueil, les guides, le guide). */
export function crumbListLd(crumbs: Crumb[]): Node {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  }
}

/** Un guide : un article de la marque, daté (la page porte aussi `organizationLd`, que son auteur désigne). */
export function articleLd(lang: SiteLang, a: { path: string; headline: string; description: string; published: string; modified: string; image: string }): Node {
  return {
    '@type': 'Article',
    '@id': `${absoluteUrl(a.path)}#article`,
    headline: a.headline,
    description: a.description,
    inLanguage: HREFLANG[lang],
    datePublished: a.published,
    dateModified: a.modified,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    mainEntityOfPage: absoluteUrl(a.path),
    image: absoluteUrl(a.image),
  }
}

/** Plusieurs nœuds dans un seul bloc (un `@graph`), prêt à écrire dans la page. */
export function graph(nodes: Node[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c')
}
