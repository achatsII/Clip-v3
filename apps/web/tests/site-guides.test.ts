/**
 * Les guides du site : complets et à la bonne taille dans chaque langue où ils existent, à leurs adresses,
 * et invisibles (hors des moteurs, du plan du site et des liens) tant qu'une personne ne les a pas approuvés.
 */
import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import { approvedGuides, GUIDE_LANGS, GUIDE_SLUGS, guideAlternates, guideKeyOf, guidePath, GUIDES, guidesIn, guidesIndexPath } from '@/lib/site/guides'
import { GUIDE_DICTS } from '@/lib/site/guides/content'
import { guideCrumbs, guideMetadata, guidesIndexMetadata } from '@/lib/site/guides/metadata'
import { SITE_LANGS } from '@/lib/site/lang'
import { pageMetadata } from '@/lib/site/metadata'
import { generateStaticParams as shareImages } from '@/app/og/[name]/route'

const CJK = new Set(['zh', 'ja', 'ko'])
const words = (s: string) => s.split(/\s+/).filter(Boolean).length

describe('les guides', () => {
  it('existent en français et en anglais, et seulement dans des langues du site', () => {
    expect(GUIDE_LANGS).toEqual(expect.arrayContaining(['fr', 'en']))
    for (const l of GUIDE_LANGS) expect(SITE_LANGS).toContain(l)
  })

  it('sont complets et à la bonne taille dans chaque langue', () => {
    for (const lang of GUIDE_LANGS) {
      const d = GUIDE_DICTS[lang]!
      expect(d.index.title.length, `${lang} index`).toBeLessThanOrEqual(60)
      for (const key of GUIDES) {
        const g = d.guides[key]
        const where = `${lang}/${key}`
        expect(g.title.length, `${where} title`).toBeLessThanOrEqual(CJK.has(lang) ? 40 : 60)
        expect(g.description.length, `${where} description`).toBeGreaterThanOrEqual(CJK.has(lang) ? 40 : 110)
        expect(g.description.length, `${where} description`).toBeLessThanOrEqual(170)
        expect(g.sections.length, `${where} sections`).toBeGreaterThanOrEqual(5)
        expect(g.sections.length, `${where} sections`).toBeLessThanOrEqual(7)
        expect(g.faq.length, `${where} faq`).toBeGreaterThanOrEqual(4)
        expect(g.faq.length, `${where} faq`).toBeLessThanOrEqual(6)
        expect(g.minutes, `${where} minutes`).toBeGreaterThan(0)
        for (const s of g.sections) expect(s.paragraphs.length, `${where} ${s.heading}`).toBeGreaterThan(0)
        // Le produit n'y paraît qu'à la fin, sous le jeton que la marque remplace.
        expect(g.cta.title + g.cta.text, `${where} cta`).toMatch(/\bClip\b/)
      }
    }
  })

  it('ont assez de fond en français et en anglais (au moins 800 mots chacun)', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const key of GUIDES) {
        const g = GUIDE_DICTS[lang]!.guides[key]
        const text = [g.lead, ...g.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list?.items ?? [])]), ...g.faq.flatMap((f) => [f.q, f.a])].join(' ')
        expect(words(text), `${lang}/${key}`).toBeGreaterThanOrEqual(800)
      }
    }
  })

  it('ne nomment ni l’entreprise, ni une conformité, ni un concurrent', () => {
    const all = JSON.stringify(GUIDE_DICTS)
    expect(all).not.toMatch(/Intelligence Industrielle/i)
    expect(all).not.toMatch(/\bRSST\b|CSA Z460|conforme (?:à|aux) (?:l[’']OSHA|OSHA|la norme)/i)
  })

  it('ont une adresse par langue : slugs français en français, anglais ailleurs', () => {
    expect(guidePath('write', 'fr')).toBe('/guides/rediger-une-instruction-de-travail')
    expect(guidePath('write', 'en')).toBe('/en/guides/how-to-write-work-instructions')
    expect(guidePath('write', 'de')).toBe('/de/guides/how-to-write-work-instructions')
    expect(guidesIndexPath('fr')).toBe('/guides')
    for (const key of GUIDES) {
      expect(guideKeyOf(GUIDE_SLUGS[key].fr, 'fr')).toBe(key)
      expect(guideKeyOf(GUIDE_SLUGS[key].en, 'ja')).toBe(key)
    }
    expect(new Set(GUIDES.map((k) => GUIDE_SLUGS[k].en)).size).toBe(GUIDES.length)
    // hreflang : seulement les langues où le guide existe.
    expect(guideAlternates('write').map(([l]) => l)).toEqual(GUIDE_LANGS)
    expect(guideCrumbs('fr', 'write').map((c) => c.path)).toEqual(['/', '/guides', '/guides/rediger-une-instruction-de-travail'])
  })

  it('restent hors des moteurs, du plan du site et des liens tant que personne ne les a approuvés', () => {
    expect(approvedGuides()).toEqual([])
    expect(guideMetadata('write', 'en').robots).toEqual({ index: false, follow: false })
    expect(guidesIndexMetadata('fr').robots).toEqual({ index: false, follow: false })
    // Le site des tests (CLIP) ne s'indexe pas : son plan est vide, guides compris.
    expect(sitemap().some((e) => e.url.includes('/guides'))).toBe(false)
    expect(guidesIn('fr')?.guides.write.h1).toBeTruthy()
  })
})

describe('les images de partage', () => {
  it('dans les seize autres langues, une adresse stable qui existe (pas celle d’un fichier opengraph-image, suffixée)', () => {
    const og = pageMetadata('pricing', 'de').openGraph as { images?: unknown }
    expect(og.images).toEqual(['/og/pricing.png'])
    expect((guideMetadata('write', 'en').openGraph as { images?: unknown }).images).toBeUndefined()
    const names = shareImages().map((p) => p.name)
    expect(names).toEqual(expect.arrayContaining(['pricing.png', 'home.png', 'guide-write.png']))
  })
})
