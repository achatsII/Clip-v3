/**
 * Les textes du site dans une langue, les faits du produit déjà remplis : le nombre de langues des
 * opérateurs (lu dans `LANGUAGES`), et tout ce qui vient du manifeste (noms des forfaits qui donnent
 * une fonction, jours d'essai, mois offerts). L'IA n'a pas de prix fixe : aucun coût d'opération ne
 * s'annonce. Au serveur seulement : le manifeste se lit au build.
 *
 * Jetons remplis ici : `{languages}`, `{uiLanguages}`, `{trialDays}`, `{trialPlans}`, `{trialPlansOr}`, `{freeMonths}`, `{paidMonths}`, `{freePlan}`,
 * `{modulePlans}` et `{plans:<feature>}` (les forfaits qui donnent cette fonction). Les autres (`{count}`,
 * `{plan}`…) se remplissent au rendu, avec `fmt`.
 */
import { LANGUAGES } from '@/lib/model/catalog'
import { SITE_LANGS, SITE_LOCALE, siteNum, type SiteLang } from '../lang'
import { plansWith, siteCatalog, type SiteCatalog } from '../pricing'
import { brandText } from '@/lib/brand/product'
import { cs } from './cs'
import { de } from './de'
import { en } from './en'
import { es } from './es'
import { fr, type SiteContent } from './fr'
import { hu } from './hu'
import { id } from './id'
import { it } from './it'
import { ja } from './ja'
import { ko } from './ko'
import { nl } from './nl'
import { pl } from './pl'
import { pt } from './pt'
import { ro } from './ro'
import { th } from './th'
import { tr } from './tr'
import { vi } from './vi'
import { zh } from './zh'

export type { SiteContent }

/** Les textes du site dans ses dix-huit langues (au serveur seulement : rien de ceci ne part au navigateur). */
export const SITE_DICTS: Record<SiteLang, SiteContent> = { fr, en, es, pt, de, it, pl, nl, cs, ro, hu, tr, zh, ja, ko, vi, id, th }

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
  const moduleBases = [...new Set(c.modules.map((m) => m.basePlan))]
  return {
    languages: siteNum(OPERATOR_LANGUAGE_COUNT, lang),
    // Les langues de l'outil lui-même (et du site) : les dix-huit de `SITE_LANGS`.
    uiLanguages: siteNum(SITE_LANGS.length, lang),
    trialDays: siteNum(c.trialDays, lang),
    freeMonths: siteNum(c.freeMonths, lang),
    paidMonths: siteNum(c.paidMonths, lang),
    freePlan: planName(c.defaultPlan, lang, c),
    // Les forfaits qui s'essaient (`trial_days` du manifeste), liés par « et » ou par « ou ».
    trialPlans: listOf(c.plans.filter((p) => p.trialDays > 0).map((p) => planName(p.code, lang, c)), lang),
    trialPlansOr: listOf(c.plans.filter((p) => p.trialDays > 0).map((p) => planName(p.code, lang, c)), lang, 'disjunction'),
    modulePlans: listOf(
      moduleBases.map((code) => planName(code, lang, c)),
      lang,
      'disjunction',
    ),
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
    // Les faits du catalogue, puis le nom de la marque de la build (`Clip` → « Kiplo » ; CLIP : tel quel).
    t = deepFill(SITE_DICTS[lang], (s) => brandText(fillFacts(s, lang, facts, c)))
    filled.set(lang, t)
  }
  return t
}
