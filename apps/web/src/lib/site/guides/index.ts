/**
 * Les guides du site : leurs adresses dans chaque langue, ceux qu'une personne a approuvés, et leurs
 * textes au nom de la marque. Au serveur seulement (pages statiques, plan du site).
 *
 * Porte humaine (moteur marketing : rien de public sans une personne qui l'a vu) : un guide absent de
 * `GUIDES_APPROVED` se lit à son adresse, pour la relecture, mais ne se montre nulle part. Il n'est ni dans
 * le plan du site, ni dans la page des guides, ni dans les liens, et il dit `noindex` aux moteurs.
 */
import { brandify } from '@/lib/brand/product'
import { SITE_LANGS, SITE_LOCALE, type SiteLang } from '../lang'
import { GUIDE_DICTS } from './content'
import { GUIDES, type GuideKey, type GuidesDict } from './types'

export { GUIDES, type GuideKey, type GuidesDict, type GuideText } from './types'

/** Les slugs de chaque guide : le français a les siens ; l'anglais et les autres langues, ceux de l'anglais. */
export const GUIDE_SLUGS: Record<GuideKey, { fr: string; en: string }> = {
  write: { fr: 'rediger-une-instruction-de-travail', en: 'how-to-write-work-instructions' },
  template: { fr: 'modele-instruction-de-travail', en: 'work-instruction-template' },
  video: { fr: 'instructions-de-travail-en-video', en: 'video-work-instructions' },
  sopVsWi: { fr: 'procedure-ou-instruction-de-travail', en: 'sop-vs-work-instruction' },
  onboarding: { fr: 'former-un-nouvel-operateur', en: 'train-new-operators' },
  skillsMatrix: { fr: 'matrice-de-competences', en: 'skills-matrix' },
}

/**
 * Les guides approuvés, avec la date de l'approbation (une personne, dans la version vue). Seuls ceux-ci
 * se montrent et se laissent indexer.
 */
export const GUIDES_APPROVED: Partial<Record<GuideKey, string>> = {}

/** La dernière modification des guides (affichée, et `dateModified` des données structurées). */
export const GUIDES_UPDATED = '2026-11-17'

export const isApproved = (key: GuideKey): boolean => Boolean(GUIDES_APPROVED[key])
export const approvedGuides = (): GuideKey[] => GUIDES.filter(isApproved)

/** Les langues où les guides existent (le français et l'anglais d'abord, puis leurs traductions). */
export const GUIDE_LANGS: SiteLang[] = SITE_LANGS.filter((l) => Boolean(GUIDE_DICTS[l]))
export const hasGuides = (lang: SiteLang): boolean => Boolean(GUIDE_DICTS[lang])

/** La page qui liste les guides, dans une langue. */
export const guidesIndexPath = (lang: SiteLang): string => (lang === 'fr' ? '/guides' : `/${lang}/guides`)

/** L'adresse d'un guide dans une langue. */
export const guidePath = (key: GuideKey, lang: SiteLang): string => `${guidesIndexPath(lang)}/${GUIDE_SLUGS[key][lang === 'fr' ? 'fr' : 'en']}`

/** Le guide d'un slug dans une langue (le slug français en français, l'anglais ailleurs). */
export function guideKeyOf(slug: string, lang: SiteLang): GuideKey | null {
  const side = lang === 'fr' ? 'fr' : 'en'
  return GUIDES.find((k) => GUIDE_SLUGS[k][side] === slug) ?? null
}

/** Chaque langue où le guide existe → son adresse (hreflang, plan du site). */
export function guideAlternates(key: GuideKey | null): Array<[SiteLang, string]> {
  return GUIDE_LANGS.map((l) => [l, key ? guidePath(key, l) : guidesIndexPath(l)])
}

const cache = new Map<SiteLang, GuidesDict>()

/** Les textes des guides dans une langue, au nom de la marque (`null` : pas encore dans cette langue). */
export function guidesIn(lang: SiteLang): GuidesDict | null {
  const dict = GUIDE_DICTS[lang]
  if (!dict) return null
  let t = cache.get(lang)
  if (!t) {
    t = brandify(dict)
    cache.set(lang, t)
  }
  return t
}

/** La date d'une modification, écrite dans la langue (« 17 novembre 2026 »). */
export const guideDate = (iso: string, lang: SiteLang): string =>
  new Intl.DateTimeFormat(SITE_LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))
