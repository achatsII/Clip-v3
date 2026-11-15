/**
 * Les données structurées (schema.org, JSON-LD) du site : l'organisation, le site, le logiciel et
 * ses offres (tirées du manifeste, en CAD), le film, la FAQ et le fil d'Ariane. Aucune note ni
 * aucun avis : Clip n'en a pas encore, on n'en invente pas.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { content, planName } from './content'
import { HREFLANG, type SiteLang } from './lang'
import { FILM, II_LOGO } from './media'
import { siteCatalog } from './pricing'
import { crumbsFor } from './crumbs'
import { absoluteUrl, pathOf, SITE_URL, type PageKey } from './routes'

type Node = Record<string, unknown>

const ORG_ID = `${SITE_URL}/#organisation`
const SITE_ID = `${SITE_URL}/#site`
const APP_ID = `${SITE_URL}/#logiciel`

export function organizationLd(lang: SiteLang): Node {
  const t = content(lang)
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
  return { '@type': 'WebSite', '@id': SITE_ID, url: SITE_URL, name: t.brand.name, inLanguage: [HREFLANG.fr, HREFLANG.en], publisher: { '@id': ORG_ID } }
}

/** Le logiciel et ses offres : chaque forfait du manifeste, à chaque intervalle, en dollars canadiens. */
export function softwareLd(lang: SiteLang): Node {
  const t = content(lang)
  const c = siteCatalog()
  const offers = c.plans.flatMap((plan) => {
    const name = planName(plan.code, lang, c)
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
    image: absoluteUrl(FILM.poster),
    inLanguage: [HREFLANG.fr, HREFLANG.en],
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

/** Le film : narration en français ; la page anglaise donne ses sous-titres anglais. */
export function videoLd(lang: SiteLang): Node {
  const t = content(lang)
  const caption = FILM.subtitles[lang]
  const node: Node = {
    '@type': 'VideoObject',
    name: t.film.title,
    description: t.meta.home.description,
    thumbnailUrl: [absoluteUrl(FILM.poster)],
    uploadDate: FILM.uploadDate,
    duration: FILM.duration,
    contentUrl: FILM.mp4_1080,
    width: FILM.width,
    height: FILM.height,
    inLanguage: HREFLANG.fr,
    caption: { '@type': 'MediaObject', contentUrl: absoluteUrl(caption), encodingFormat: 'text/vtt', inLanguage: HREFLANG[lang] },
    publisher: { '@id': ORG_ID },
  }
  // Le dossier public de l'app web : `public` au build (apps/web), `apps/web/public` depuis la racine.
  const file = [join(process.cwd(), 'public', FILM.subtitles.fr), join(process.cwd(), 'apps/web/public', FILM.subtitles.fr)].find((f) => existsSync(f))
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
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbsFor(lang, page).map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  }
}

/** Plusieurs nœuds dans un seul bloc (un `@graph`), prêt à écrire dans la page. */
export function graph(nodes: Node[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c')
}
