/**
 * Les pages du site public et leurs adresses dans chaque langue (slugs traduits), l'adresse publique
 * du site (canoniques, hreflang, sitemap) et les liens vers l'app.
 */
import { SELF_SERVICE } from '@/lib/config'
import type { PlanInterval } from '@/lib/billing/intent'
import type { SiteLang } from './lang'

/** L'adresse publique du site, sans barre finale (canoniques, sitemap, Open Graph). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://clip-v3.vercel.app').replace(/\/+$/, '')

/** Le compte HubSpot du suivi (chargé seulement après consentement). Vide : aucun suivi. */
export const HUBSPOT_ID = (process.env.NEXT_PUBLIC_HUBSPOT_ID ?? '3429410').trim()

/** Le calendrier de rendez-vous HubSpot (intégré à la page Réserver une démo). */
export const MEETINGS_URL = 'https://meetings.hubspot.com/eric-monange'
export const MEETINGS_ORIGIN = 'https://meetings.hubspot.com'

export const PAGES = ['home', 'features', 'pricing', 'knowledge', 'training', 'lockout', 'translation', 'book'] as const
export type PageKey = (typeof PAGES)[number]

/** Les pages « solution », dans l'ordre du menu. */
export const SOLUTIONS = ['knowledge', 'training', 'lockout', 'translation'] as const satisfies readonly PageKey[]
export type SolutionKey = (typeof SOLUTIONS)[number]

export const ROUTES: Record<PageKey, Record<SiteLang, string>> = {
  home: { fr: '/', en: '/en' },
  features: { fr: '/fonctionnalites', en: '/en/features' },
  pricing: { fr: '/tarifs', en: '/en/pricing' },
  knowledge: { fr: '/solutions/transfert-de-savoir-faire', en: '/en/solutions/knowledge-transfer' },
  training: { fr: '/solutions/formation-des-operateurs', en: '/en/solutions/operator-training' },
  lockout: { fr: '/solutions/cadenassage-et-sst', en: '/en/solutions/lockout-safety' },
  translation: { fr: '/solutions/traduction-des-instructions', en: '/en/solutions/work-instruction-translation' },
  book: { fr: '/rendez-vous', en: '/en/book-a-demo' },
}

export const pathOf = (page: PageKey, lang: SiteLang) => ROUTES[page][lang]

/** Le nom court d'une page (menu, fil d'Ariane). */
export function pageLabel(
  page: PageKey,
  t: { nav: { features: string; pricing: string }; cta: { book: string }; breadcrumb: { home: string }; solutions: Record<SolutionKey, { menu: string }> },
): string {
  if (page === 'home') return t.breadcrumb.home
  if (page === 'features') return t.nav.features
  if (page === 'pricing') return t.nav.pricing
  if (page === 'book') return t.cta.book
  return t.solutions[page].menu
}

/** L'adresse absolue d'un chemin du site (la racine sans barre finale, comme la résout Next). */
export const absoluteUrl = (path: string) => (path === '/' ? SITE_URL : `${SITE_URL}${path}`)

/** Les adresses de l'app, hors de l'index des moteurs (robots.txt). */
export const APP_PATHS = [
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
]

/* ───────────────────────── Les liens vers l'app ───────────────────────── */

/** Se connecter : l'app, hors du site (chargement complet, la langue de l'outil s'y applique). */
export const LOGIN_PATH = '/connexion'

/** Créer un compte (libre-service), avec le forfait choisi sur la page des tarifs. */
export function signupPath(plan?: { code: string; interval: PlanInterval }): string {
  const q = new URLSearchParams({ inscription: '1' })
  if (plan) {
    q.set('plan', plan.code)
    q.set('interval', plan.interval)
  }
  return `${LOGIN_PATH}?${q.toString()}`
}

/** Le bouton principal du site : essayer (libre-service ouvert) ou réserver une démo. */
export interface SiteCta {
  href: string
  /** Vers l'app : un lien ordinaire (chargement complet), pas une navigation du site. */
  app: boolean
  kind: 'trial' | 'book'
}

export function primaryCta(lang: SiteLang): SiteCta {
  return SELF_SERVICE ? { href: signupPath(), app: true, kind: 'trial' } : { href: pathOf('book', lang), app: false, kind: 'book' }
}

/** Le bouton d'un forfait : l'inscription avec le forfait (libre-service), sinon une démo. */
export function planCta(lang: SiteLang, plan: { code: string; paid: boolean; interval: PlanInterval } | null): SiteCta {
  if (!SELF_SERVICE || !plan) return { href: pathOf('book', lang), app: false, kind: 'book' }
  return { href: plan.paid ? signupPath({ code: plan.code, interval: plan.interval }) : signupPath(), app: true, kind: 'trial' }
}
