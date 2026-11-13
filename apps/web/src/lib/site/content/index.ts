/**
 * Les textes du site dans une langue, les faits du produit déjà remplis : le nombre de langues des
 * opérateurs (lu dans `LANGUAGES`), et tout ce qui vient du manifeste (noms des forfaits qui donnent
 * une fonction, jours d'essai, mois offerts, prix en crédits). Au serveur seulement : le manifeste
 * se lit au build.
 *
 * Jetons remplis ici : `{languages}`, `{trialDays}`, `{freeMonths}`, `{paidMonths}`, `{freePlan}`,
 * `{modulePlans}`, `{generateMin}`, `{generateMax}`, `{stepAssist}`, `{translateCredits}`,
 * `{translateImageCredits}` et `{plans:<feature>}` (les forfaits qui donnent cette fonction). Les autres (`{count}`,
 * `{plan}`…) se remplissent au rendu, avec `fmt`.
 */
import { LANGUAGES } from '@/lib/model/catalog'
import { SITE_LOCALE, siteNum, type SiteLang } from '../lang'
import { operationCredits, plansWith, siteCatalog, type SiteCatalog } from '../pricing'
import { en } from './en'
import { fr, type SiteContent } from './fr'

export type { SiteContent }

export const SITE_DICTS: Record<SiteLang, SiteContent> = { fr, en }

/** Le nombre de langues que les opérateurs peuvent choisir (la liste de l'app). */
export const OPERATOR_LANGUAGE_COUNT = Object.keys(LANGUAGES).length

/** Le nom d'un forfait dans la langue du site (le manifeste, sauf traduction du dictionnaire). */
export function planName(code: string, lang: SiteLang, c: SiteCatalog = siteCatalog()): string {
  return SITE_DICTS[lang].planNames[code] ?? c.plans.find((p) => p.code === code)?.name ?? code
}

/** Une liste de noms, liée par « et » ou par « ou » selon la langue (`Intl.ListFormat`). */
export function listOf(names: string[], lang: SiteLang, type: 'conjunction' | 'disjunction' = 'conjunction'): string {
  return new Intl.ListFormat(SITE_LOCALE[lang], { style: 'long', type }).format(names)
}

/** Les faits qui remplissent les jetons des textes. */
export function siteFacts(lang: SiteLang, c: SiteCatalog = siteCatalog()): Record<string, string> {
  const gen = operationCredits(c, 'generate')
  const credits = (key: string) => {
    const v = c.operations[key]
    return v === undefined ? '' : siteNum(v, lang)
  }
  const moduleBases = [...new Set(c.modules.map((m) => m.basePlan))]
  return {
    languages: siteNum(OPERATOR_LANGUAGE_COUNT, lang),
    trialDays: siteNum(c.trialDays, lang),
    freeMonths: siteNum(c.freeMonths, lang),
    paidMonths: siteNum(c.paidMonths, lang),
    freePlan: planName(c.defaultPlan, lang, c),
    modulePlans: listOf(
      moduleBases.map((code) => planName(code, lang, c)),
      lang,
      'disjunction',
    ),
    generateMin: gen ? siteNum(gen.min, lang) : '',
    generateMax: gen ? siteNum(gen.max, lang) : '',
    stepAssist: credits('step_assist'),
    translateCredits: credits('translate'),
    translateImageCredits: credits('translate_image'),
  }
}

/** Remplit les jetons de faits d'un texte ; les autres restent pour le rendu. */
export function fillFacts(text: string, lang: SiteLang, facts: Record<string, string>, c: SiteCatalog = siteCatalog()): string {
  return text.replace(/\{(\w+)(?::(\w+))?\}/g, (all, key: string, arg: string | undefined) => {
    if (arg !== undefined) {
      if (key !== 'plans') return all
      const names = plansWith(c, arg).map((p) => planName(p.code, lang, c))
      return names.length ? listOf(names, lang) : all
    }
    return facts[key] ? facts[key] : all
  })
}

function deepFill<T>(value: T, fill: (s: string) => string): T {
  if (typeof value === 'string') return fill(value) as T
  if (Array.isArray(value)) return value.map((v) => deepFill(v, fill)) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepFill(v, fill)])) as T
  return value
}

const filled = new Map<SiteLang, SiteContent>()

/** Les textes du site dans cette langue, faits remplis. */
export function content(lang: SiteLang): SiteContent {
  let t = filled.get(lang)
  if (!t) {
    const c = siteCatalog()
    const facts = siteFacts(lang, c)
    t = deepFill(SITE_DICTS[lang], (s) => fillFacts(s, lang, facts, c))
    filled.set(lang, t)
  }
  return t
}
