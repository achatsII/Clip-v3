// @vitest-environment node
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '@/lib/model/catalog'
import { content, OPERATOR_LANGUAGE_COUNT, SITE_DICTS } from '@/lib/site/content'
import { DEMO, DEMO_LANGS } from '@/lib/site/content/demo'
import { breadcrumbLd, faqLd, graph, organizationLd, softwareLd, transcriptOf, videoLd, websiteLd } from '@/lib/site/jsonld'
import { SITE_LANGS } from '@/lib/site/lang'
import { pageMetadata } from '@/lib/site/metadata'
import { siteCatalog } from '@/lib/site/pricing'
import { APP_PATHS, PAGES, ROUTES } from '@/lib/site/routes'

/** Les feuilles d'un dictionnaire : chemin → valeur. */
function leaves(o: unknown, path = ''): Array<[string, unknown]> {
  if (typeof o === 'string' || typeof o === 'number' || typeof o === 'boolean') return [[path, o]]
  if (Array.isArray(o)) return o.flatMap((v, i) => leaves(v, `${path}[${i}]`))
  if (o && typeof o === 'object') return Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k))
  return [[path, o]]
}
/** Les traductions de forfaits par code ne sont qu'en anglais (le français garde le nom du manifeste). */
const shared = (k: string) => !k.startsWith('planNames.')

describe('les dictionnaires du site', () => {
  it('ont les mêmes clés et les mêmes formes en français et en anglais, sans fonction', () => {
    const fr = leaves(SITE_DICTS.fr).filter(([k]) => shared(k))
    const en = new Map(leaves(SITE_DICTS.en).filter(([k]) => shared(k)))
    expect([...en.keys()].sort()).toEqual(fr.map(([k]) => k).sort())
    for (const [k, v] of fr) expect(typeof en.get(k), k).toBe(typeof v)
    for (const [k, v] of [...fr, ...en]) expect(typeof v, k).not.toBe('function')
  })

  it('n’ont aucun texte vide, et l’anglais n’est pas une copie du français', () => {
    const frMap = new Map(leaves(SITE_DICTS.fr))
    // `feature: ''` : une fonction sans forfait particulier (aucune pastille), voulu.
    for (const [k, v] of [...leaves(SITE_DICTS.fr), ...leaves(SITE_DICTS.en)]) if (typeof v === 'string' && !k.endsWith('.feature')) expect(v.trim(), k).not.toBe('')
    const copies = leaves(SITE_DICTS.en).filter(
      ([k, v]) => typeof v === 'string' && v === frMap.get(k) && /\s/.test(v) && !/^(Intelligence Industrielle|https?:)/.test(v) && !/^(<\s)?\d+\s?min$|^Document · \d+ pages$/.test(v),
    )
    expect(copies.map(([k]) => k)).toEqual([])
    const accented = leaves(SITE_DICTS.en).filter(([k, v]) => typeof v === 'string' && /[àâçéèêëîïôûùœ]/i.test(v) && !/Québec|Français|Intelligence Industrielle/.test(v) && k !== 'a11y.switchLang')
    expect(accented.map(([k, v]) => `${k}: ${v}`)).toEqual([])
  })

  it('remplit les faits du produit : nombre de langues, jours d’essai, forfaits qui donnent une fonction', () => {
    expect(OPERATOR_LANGUAGE_COUNT).toBe(Object.keys(LANGUAGES).length)
    for (const lang of SITE_LANGS) {
      const t = content(lang)
      const unfilled = leaves(t).filter(
        ([, v]) =>
          typeof v === 'string' && /\{(languages|trialDays|freeMonths|paidMonths|freePlan|modulePlans|generateMin|generateMax|stepAssist|translateCredits|translateImageCredits|plans:\w+)\}/.test(v),
      )
      expect(unfilled.map(([k]) => k)).toEqual([])
    }
    expect(content('fr').meta.translation.description).toContain(`${OPERATOR_LANGUAGE_COUNT} langues`)
    expect(content('fr').home.faq.items[3].a).toMatch(/Équipe et Usine/)
    expect(content('en').home.faq.items[3].a).toMatch(/Team and Plant/)
    expect(content('fr').pricing.yearlyBonus).toBe(`${siteCatalog().freeMonths} mois offerts`.replace(' ', ' '))
  })

  it('chaque page a un titre de 60 caractères au plus et une description de 155 au plus', () => {
    for (const lang of SITE_LANGS) {
      for (const page of PAGES) {
        const { title, description } = content(lang).meta[page]
        expect(title.length, `${lang} ${page} : ${title}`).toBeLessThanOrEqual(60)
        expect(description.length, `${lang} ${page} : ${description}`).toBeLessThanOrEqual(155)
        expect(description.length, `${lang} ${page}`).toBeGreaterThan(70)
      }
    }
    const titles = SITE_LANGS.flatMap((l) => PAGES.map((p) => content(l).meta[p].title))
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('la démo du poste a la même instruction dans chaque langue, l’arabe de droite à gauche', () => {
    for (const l of DEMO_LANGS) {
      expect(DEMO[l].steps).toHaveLength(DEMO.fr.steps.length)
      expect(DEMO[l].quiz).toHaveLength(DEMO.fr.quiz.length)
      DEMO[l].steps.forEach((s, i) => {
        expect(s.photo).toBe(DEMO.fr.steps[i].photo)
        expect(s.warning?.level).toBe(DEMO.fr.steps[i].warning?.level)
        expect(s.keyPoints).toHaveLength(DEMO.fr.steps[i].keyPoints.length)
      })
      DEMO[l].quiz.forEach((q, i) => {
        expect(q.answer).toBe(DEMO.fr.quiz[i].answer)
        expect(q.choices).toHaveLength(DEMO.fr.quiz[i].choices.length)
      })
    }
    expect(DEMO.ar.dir).toBe('rtl')
    expect(DEMO_LANGS.every((l) => l === 'fr' || l === 'en' || LANGUAGES[l])).toBe(true)
  })
})

describe('les adresses et le référencement', () => {
  it('chaque page a son adresse française à la racine et son adresse anglaise sous /en', () => {
    for (const page of PAGES) {
      expect(ROUTES[page].fr.startsWith('/en')).toBe(false)
      expect(ROUTES[page].en === '/en' || ROUTES[page].en.startsWith('/en/')).toBe(true)
    }
    const all = PAGES.flatMap((p) => [ROUTES[p].fr, ROUTES[p].en])
    expect(new Set(all).size).toBe(all.length)
  })

  it('robots.txt ferme l’app et ses liens publics, jamais une page du site', () => {
    for (const p of [
      '/accueil',
      '/instructions',
      '/postes',
      '/equipe',
      '/retours',
      '/registre',
      '/rapports',
      '/statistiques',
      '/reglages',
      '/import',
      '/bienvenue',
      '/connexion',
      '/decouvrir',
      '/api/',
      '/p/',
      '/i/',
    ])
      expect(APP_PATHS).toContain(p)
    for (const page of PAGES) for (const lang of SITE_LANGS) for (const prefix of APP_PATHS) expect(ROUTES[page][lang].startsWith(prefix), `${ROUTES[page][lang]} ${prefix}`).toBe(false)
  })

  it('canonique, hreflang (fr-CA, en, x-default → français), Open Graph et Twitter sur chaque page', () => {
    for (const lang of SITE_LANGS) {
      for (const page of PAGES) {
        const m = pageMetadata(page, lang)
        expect(m.alternates?.canonical).toBe(ROUTES[page][lang])
        expect(m.alternates?.languages).toEqual({ 'fr-CA': ROUTES[page].fr, en: ROUTES[page].en, 'x-default': ROUTES[page].fr })
        expect(m.openGraph?.url).toBe(ROUTES[page][lang])
        expect((m.twitter as { card?: string })?.card).toBe('summary_large_image')
        expect(m.title).toEqual({ absolute: content(lang).meta[page].title })
      }
    }
  })

  it('les images Open Graph restent statiques : un suffixe de 6 caractères par page (bogue de Next 16.4)', () => {
    // Next ne reconnaît une image de métadonnées dans un groupe de routes que si le hachage du dossier
    // parent fait 6 caractères (`-\w{6}`) ; plus court, l'image devient dynamique et lit ses polices au
    // moment de la requête. Les dossiers : (site)/(fr)/… et (site)/(en)/en/….
    const require = createRequire(import.meta.url)
    const { djb2Hash } = require('next/dist/shared/lib/hash.js') as { djb2Hash: (s: string) => number }
    for (const page of PAGES) {
      const fr = `/(site)/(fr)${ROUTES[page].fr === '/' ? '' : ROUTES[page].fr}`
      const en = `/(site)/(en)${ROUTES[page].en}`
      for (const dir of [fr, en]) expect(djb2Hash(dir).toString(36).slice(0, 6), dir).toHaveLength(6)
    }
  })

  it('les données structurées se lisent, sans note ni avis, avec les offres du manifeste en CAD', () => {
    for (const lang of SITE_LANGS) {
      const t = content(lang)
      const json = JSON.parse(graph([organizationLd(lang), websiteLd(), softwareLd(lang), videoLd(lang), faqLd(t.home.faq.items), breadcrumbLd(lang, 'pricing')]))
      const types = json['@graph'].map((n: { '@type': string }) => n['@type'])
      expect(types).toEqual(['Organization', 'WebSite', 'SoftwareApplication', 'VideoObject', 'FAQPage', 'BreadcrumbList'])
      expect(JSON.stringify(json)).not.toMatch(/aggregateRating|"review"/)
      const app = json['@graph'][2]
      expect(app.applicationCategory).toBe('BusinessApplication')
      expect(app.operatingSystem).toBe('Web, iOS, Android')
      const paid = siteCatalog().plans.filter((p) => p.paid)
      expect(app.offers).toHaveLength(siteCatalog().plans.length - paid.length + paid.reduce((n, p) => n + p.prices.length, 0))
      for (const o of app.offers) {
        expect(o.priceCurrency).toBe('CAD')
        expect(o.price).toMatch(/^\d+(\.\d{2})?$/)
      }
      const video = json['@graph'][3]
      expect(video.duration).toBe('PT1M15S')
      expect(video.transcript).toMatch(/Voici Clip/)
      expect(json['@graph'][5].itemListElement.map((i: { position: number }) => i.position)).toEqual([1, 2])
    }
  })

  it('la transcription du film se tire des sous-titres', () => {
    const vtt = readFileSync(resolve(__dirname, '../public/site/video/clip-film.fr.vtt'), 'utf8')
    const text = transcriptOf(vtt)
    expect(text.startsWith('Jacques connaît sa machine mieux que personne.')).toBe(true)
    expect(text).not.toMatch(/-->|WEBVTT/)
    const en = readFileSync(resolve(__dirname, '../public/site/video/clip-film.en.vtt'), 'utf8')
    expect(en.match(/-->/g)?.length).toBe(vtt.match(/-->/g)?.length)
  })
})
