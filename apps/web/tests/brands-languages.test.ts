/**
 * Deux marques, un seul produit (CLIP pour les clients de l'équipe, Gesto en libre-service), et dix-huit
 * langues : le nom de la marque dans les textes, ce que chaque marque vend, les langues chargées à la
 * demande (l'outil, le lecteur du poste, le site), et la mesure du site qui attend l'accord.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { brandIdOf, brandify, brandText, PRODUCTS, privacyHref } from '@/lib/brand/product'
import { presentOffer } from '@/lib/billing/catalog'
import type { PlansOffer, PublicPlan } from '@/lib/billing/client'
import { loadPlayerStrings, strings } from '@/components/player/i18n'
import { DICTS, LANGS, langOf, loadMessages, messagesIn } from '@/lib/i18n/core'
import { CONSENT_KEY, CONSENT_VERSION, loadGoogleAnalytics, revokeGoogleAnalytics, trackEvent } from '@/lib/site/consent'
import { content } from '@/lib/site/content'
import { INTL_LANGS, SITE_LANGS } from '@/lib/site/lang'
import { forBrand, siteCatalog } from '@/lib/site/pricing'
import { ROUTES, SITE_INDEXED } from '@/lib/site/routes'

const gesto = PRODUCTS.gesto
const clip = PRODUCTS.clip

describe('la marque', () => {
  it('se choisit à la build (NEXT_PUBLIC_BRAND) ; sans valeur, CLIP', () => {
    expect(brandIdOf(undefined)).toBe('clip')
    expect(brandIdOf('gesto')).toBe('gesto')
    expect(brandIdOf(' Gesto ')).toBe('gesto')
    expect(brandIdOf('autre')).toBe('clip')
  })

  it('Gesto remplace le jeton CLIP et ne nomme jamais Intelligence Industrielle ; CLIP reste tel quel', () => {
    const fr = 'CLIP envoie vos photos par la plateforme d’Intelligence Industrielle. Clip, c’est simple.'
    expect(brandText(fr, gesto)).toBe('Gesto envoie vos photos par la plateforme de Gesto. Gesto, c’est simple.')
    expect(brandText('Through Intelligence Industrielle’s platform', gesto)).toBe('Through Gesto’s platform')
    expect(brandText(fr, clip)).toBe(fr)
    // « clip » en minuscules (un extrait vidéo, un identifiant) ne change pas.
    expect(brandText('a video clip of clip-v3', gesto)).toBe('a video clip of clip-v3')
  })

  it('un dictionnaire entier, fonctions comprises, passe au nom de la marque', () => {
    const dict = { title: 'CLIP', nested: { list: ['Clip', 'x'], fn: (n: number) => `CLIP ${n}`, other: (n: number) => n * 2 } }
    const b = brandify(dict, gesto)
    expect(b.title).toBe('Gesto')
    expect(b.nested.list).toEqual(['Gesto', 'x'])
    expect(b.nested.fn(3)).toBe('Gesto 3')
    expect(b.nested.other(3)).toBe(6)
    expect(brandify(dict, clip)).toBe(dict)
  })

  it('chaque marque a son logo, sa politique de confidentialité et ce qu’elle montre', () => {
    expect(clip.mark).not.toBe(gesto.mark)
    expect([clip.company, gesto.company]).toEqual(['Intelligence Industrielle', null])
    expect([clip.selfServePrices, gesto.selfServePrices]).toEqual([false, true])
    expect([clip.decouvrir, gesto.decouvrir, clip.siteIndexed, gesto.siteIndexed]).toEqual([true, false, false, true])
    // La build des tests est CLIP : sa politique est celle de son entreprise.
    expect(privacyHref('fr')).toMatch(/^https:\/\/www\.intelligenceindustrielle\.com\//)
  })
})

describe('ce que chaque marque vend', () => {
  const plan = (code: string, cents: number, trial?: number): PublicPlan => ({ code, name: code, kind: 'base', ...(trial ? { trial_days: trial } : {}), prices: cents ? [{ interval: 'monthly', currency: 'CAD', amount_cents: cents }] : [], entitlements: {} })
  const offer: PlansOffer = { product: 'clip-v3', channel: 'web', currency: 'CAD', plans: [plan('free', 0), plan('solo', 4900, 7), plan('equipe', 19900, 7), plan('usine', 0), { ...plan('academie-usine', 0), kind: 'addon' }] }

  beforeEach(() => localStorage.setItem('clip_pref_ui_lang', 'fr'))

  it('Gesto : le libre-service seulement (ni Usine ni ses modules), noms dans la langue de l’outil', () => {
    const shown = presentOffer(offer, gesto).plans
    expect(shown.map((p) => p.code)).toEqual(['free', 'solo', 'equipe'])
    expect(shown.map((p) => p.name)).toEqual(['Sans abonnement', 'Solo', 'Équipe'])
    expect(shown.find((p) => p.code === 'solo')?.trial_days).toBe(7)
  })

  it('CLIP : tout, mais aucun prix du libre-service (sur devis)', () => {
    const shown = presentOffer(offer, clip).plans
    expect(shown.map((p) => p.code)).toEqual(['free', 'solo', 'equipe', 'usine', 'academie-usine'])
    expect(shown.every((p) => p.prices.length === 0)).toBe(true)
  })

  it('le site fait de même : Gesto sans forfait sur devis, CLIP sans prix ; l’essai est de 7 jours', () => {
    const c = siteCatalog()
    expect(c.trialDays).toBe(7)
    const g = forBrand(c, gesto)
    expect(g.plans.some((p) => p.quote)).toBe(false)
    expect(g.modules).toEqual([])
    expect(c.plans.every((p) => p.prices.length === 0)).toBe(true)
  })
})

describe('les dix-huit langues', () => {
  afterEach(() => localStorage.clear())

  it('l’outil, le site et le lecteur parlent les mêmes langues', () => {
    expect(LANGS).toHaveLength(18)
    expect([...SITE_LANGS]).toEqual([...LANGS])
    expect(INTL_LANGS).toHaveLength(16)
  })

  it('une étiquette du navigateur trouve sa langue', () => {
    expect([langOf('pt-PT'), langOf('zh-Hans-CN'), langOf('de_AT'), langOf('in'), langOf('sv'), langOf(null)]).toEqual(['pt', 'zh', 'de', 'id', null, null])
  })

  it('une langue se charge à la demande ; en attendant, l’anglais', async () => {
    expect(messagesIn('pl')).toBe(DICTS.en)
    const pl = await loadMessages('pl')
    expect(pl).not.toBe(DICTS.en)
    expect(pl.common).toBeTruthy()
    expect(messagesIn('pl')).toBe(pl)
    // Une langue que l'outil ne parle pas : l'anglais.
    expect(await loadMessages('sv')).toBe(DICTS.en)
  })

  it('chaque langue charge un dictionnaire complet, au nom de la marque', async () => {
    for (const l of LANGS) {
      const m = await loadMessages(l)
      expect(Object.keys(m).sort(), l).toEqual(Object.keys(DICTS.fr).sort())
      expect(typeof m.billing.count.stations(3), l).toBe('string')
      expect(m.billing.plans.tryPlan('X', 7), l).toContain('7')
    }
  })

  it('le lecteur du poste charge ses mots dans la langue de l’opérateur', async () => {
    expect(strings('de')).toBe(strings('en'))
    const de = await loadPlayerStrings('de')
    expect(strings('de')).toBe(de)
    expect(de.start).not.toBe(strings('en').start)
    // Une langue d'opérateur que le lecteur ne parle pas : l'anglais.
    expect(await loadPlayerStrings('tl')).toBe(strings('en'))
  })

  it('le site a chaque page dans chaque langue (slugs anglais sous /<langue>)', () => {
    expect(ROUTES.pricing.de).toBe('/de/pricing')
    expect(ROUTES.home.ja).toBe('/ja')
    expect(ROUTES.lockout.pl).toBe('/pl/solutions/lockout-safety')
    for (const l of SITE_LANGS) expect(content(l).meta.home.title.length, l).toBeGreaterThan(5)
    // Le site de CLIP (vendu par l'équipe) ne s'indexe pas ; seule la marque publique se fait trouver.
    expect(SITE_INDEXED).toBe(false)
  })
})

describe('la mesure du site attend l’accord', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    localStorage.clear()
    delete window.gtag
    delete window.dataLayer
  })

  it('Google Analytics ne se charge qu’après « Accepter », sans publicité ; refuser l’arrête et efface ses témoins', () => {
    trackEvent('vue_prix', { offre: 'gesto', type_page: 'pricing', langue: 'fr', emplacement: 'page' })
    expect(window.dataLayer).toBeUndefined()
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice: 'granted', version: CONSENT_VERSION }))
    loadGoogleAnalytics('G-TEST123')
    expect(document.querySelector('script[src*="googletagmanager.com/gtag/js?id=G-TEST123"]')).toBeTruthy()
    const consent = (window.dataLayer as unknown[][]).find((args) => args[0] === 'consent')
    expect(consent?.[2]).toMatchObject({ analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
    trackEvent('vue_prix', { offre: 'gesto', type_page: 'pricing', langue: 'fr', emplacement: 'page' })
    expect((window.dataLayer as unknown[][]).some((args) => args[0] === 'event' && args[1] === 'vue_prix')).toBe(true)
    document.cookie = '_ga=GA1.1.1; path=/'
    revokeGoogleAnalytics('G-TEST123')
    expect(document.querySelector('script[src*="googletagmanager.com"]')).toBeNull()
    expect(document.cookie).not.toContain('_ga=')
  })

  it('sans identifiant, rien ne se charge', () => {
    loadGoogleAnalytics('')
    expect(document.querySelector('script[src*="googletagmanager.com"]')).toBeNull()
  })
})
