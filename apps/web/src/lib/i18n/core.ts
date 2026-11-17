/**
 * Le cœur des langues de l'outil, sans React : utilisable partout, routes du serveur comprises
 * (elles parlent français). Les composants passent par `@/lib/i18n` (`useMessages()`), qui ajoute
 * les hooks ; voir ce fichier pour les règles.
 *
 * Le français (la source) et l'anglais (le repli) sont toujours là ; les autres langues se chargent à
 * la demande, une fois (`loadLang`) : un dictionnaire pèse ~180 ko, et l'outil en parle dix-huit.
 * Chaque dictionnaire passe par `brandify` : le jeton `CLIP` y devient le nom de la marque de la build.
 */
import { brandify, PRODUCT } from '@/lib/brand/product'
import { en } from './en'
import { fr, type Messages } from './fr'

export type { Messages }

/**
 * Les langues de l'outil : le français et l'anglais, puis celles des grands pays industriels (décision
 * du 2026-11-17 : « n'importe quelle usine dans le monde […] l'a dans sa langue »).
 */
export const LANGS = ['fr', 'en', 'es', 'pt', 'de', 'it', 'pl', 'nl', 'cs', 'ro', 'hu', 'tr', 'zh', 'ja', 'ko', 'vi', 'id', 'th'] as const
export type Lang = (typeof LANGS)[number]

/** Le nom de chaque langue, écrit dans la langue elle-même. */
export const LANG_NAMES: Record<Lang, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  pt: 'Português (Brasil)',
  de: 'Deutsch',
  it: 'Italiano',
  pl: 'Polski',
  nl: 'Nederlands',
  cs: 'Čeština',
  ro: 'Română',
  hu: 'Magyar',
  tr: 'Türkçe',
  zh: '简体中文',
  ja: '日本語',
  ko: '한국어',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  th: 'ไทย',
}

/** La locale des dates et des nombres de chaque langue. */
export const LOCALES: Record<Lang, string> = {
  fr: 'fr-CA',
  en: 'en-CA',
  es: 'es-MX',
  pt: 'pt-BR',
  de: 'de-DE',
  it: 'it-IT',
  pl: 'pl-PL',
  nl: 'nl-NL',
  cs: 'cs-CZ',
  ro: 'ro-RO',
  hu: 'hu-HU',
  tr: 'tr-TR',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  vi: 'vi-VN',
  id: 'id-ID',
  th: 'th-TH',
}

export const isLang = (l: unknown): l is Lang => typeof l === 'string' && (LANGS as readonly string[]).includes(l)

/** La langue de l'outil la plus proche d'une étiquette de langue (« pt-PT » → `pt`, « zh-Hans » → `zh`). */
export function langOf(tag: string | null | undefined): Lang | null {
  const primary = (tag ?? '').trim().toLowerCase().split(/[-_]/)[0]
  return isLang(primary) ? primary : primary === 'in' ? 'id' : null
}

type Lazy = Exclude<Lang, 'fr' | 'en'>
const LOADERS: Record<Lazy, () => Promise<Messages>> = {
  es: () => import('./es').then((m) => m.es),
  pt: () => import('./pt').then((m) => m.pt),
  de: () => import('./de').then((m) => m.de),
  it: () => import('./it').then((m) => m.it),
  pl: () => import('./pl').then((m) => m.pl),
  nl: () => import('./nl').then((m) => m.nl),
  cs: () => import('./cs').then((m) => m.cs),
  ro: () => import('./ro').then((m) => m.ro),
  hu: () => import('./hu').then((m) => m.hu),
  tr: () => import('./tr').then((m) => m.tr),
  zh: () => import('./zh').then((m) => m.zh),
  ja: () => import('./ja').then((m) => m.ja),
  ko: () => import('./ko').then((m) => m.ko),
  vi: () => import('./vi').then((m) => m.vi),
  id: () => import('./id').then((m) => m.id),
  th: () => import('./th').then((m) => m.th),
}

const KEY = 'clip_pref_ui_lang'
/** Les dictionnaires prêts : le français et l'anglais d'office, les autres une fois chargés. */
export const DICTS: Partial<Record<Lang, Messages>> & Record<'fr' | 'en', Messages> = { fr: brandify(fr), en: brandify(en) }
const loading = new Map<Lang, Promise<Messages>>()
const listeners = new Set<() => void>()
let current: Lang | null = null
let pending: Lang | null = null
/** Le nombre de changements de langue faits par la personne (pas la détection au démarrage). */
let switches = 0
export const langSwitches = () => switches
const emit = () => listeners.forEach((fn) => fn())

/** Charge une langue (une seule fois) ; le français et l'anglais sont déjà là. */
export function loadLang(l: Lang): Promise<Messages> {
  const ready = DICTS[l]
  if (ready) return Promise.resolve(ready)
  let p = loading.get(l)
  if (!p) {
    p = LOADERS[l as Lazy]().then((dict) => {
      const branded = brandify(dict)
      DICTS[l] = branded
      return branded
    })
    p.catch(() => loading.delete(l))
    loading.set(l, p)
  }
  return p
}

/** Les textes d'une langue, chargée au besoin : ce qui se prépare hors de l'écran (PDF, courriel). */
export async function loadMessages(lang: string): Promise<Messages> {
  const l = langOf(lang)
  if (!l) return DICTS.en
  try {
    return await loadLang(l)
  } catch {
    return DICTS.en
  }
}

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (isLang(saved)) return saved
  } catch {
    /* stockage indisponible */
  }
  if (typeof navigator !== 'undefined') {
    for (const tag of navigator.languages?.length ? navigator.languages : [navigator.language]) {
      const l = langOf(tag)
      if (l) return l
    }
  }
  return PRODUCT.defaultLang
}

function applyDocumentLang(l: Lang) {
  if (typeof document === 'undefined') return
  // Le site public (`[data-site]`) déclare lui-même sa langue, celle de son adresse : l'outil n'y touche pas.
  if (document.querySelector('[data-site]')) return
  document.documentElement.lang = LOCALES[l]
}

/** La langue de l'outil en ce moment. */
export function getLang(): Lang {
  if (current === null) {
    if (typeof window === 'undefined') return 'fr'
    current = detect()
    applyDocumentLang(current)
    // Une langue à charger : l'anglais en attendant, puis l'écran se redessine dans la bonne langue.
    const l = current
    if (!DICTS[l])
      void loadLang(l).then(
        () => {
          if (current !== l) return
          switches += 1
          emit()
        },
        () => undefined,
      )
  }
  return current
}

/** Change la langue de l'outil ; une langue pas encore chargée l'est d'abord (l'écran ne passe pas par l'anglais). */
export function setLang(l: Lang): void {
  pending = l
  const apply = () => {
    if (pending !== l) return
    current = l
    try {
      localStorage.setItem(KEY, l)
    } catch {
      /* le choix vaut pour cette visite */
    }
    applyDocumentLang(l)
    switches += 1
    emit()
  }
  if (DICTS[l]) apply()
  else void loadLang(l).then(apply, () => undefined)
}

/** S'abonner aux changements de langue (les hooks de `./index` s'en servent). */
export const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Les textes de l'outil, hors d'un composant (fonctions des bibliothèques, appelées au rendu). */
export function messages(): Messages {
  return DICTS[getLang()] ?? DICTS.en
}

/**
 * Les textes dans une langue donnée, quelle que soit celle de l'outil : ce qui suit la langue d'une
 * instruction (son PDF). Une langue pas encore chargée prend l'anglais (et se charge pour la suite) ;
 * `loadMessages` l'attend.
 */
export function messagesIn(lang: string): Messages {
  const l = langOf(lang)
  if (!l) return DICTS.en
  const ready = DICTS[l]
  if (ready) return ready
  void loadLang(l).catch(() => undefined)
  return DICTS.en
}

/** La locale des dates et des nombres. */
export function locale(): string {
  return LOCALES[getLang()]
}

/**
 * La langue d'une instruction qu'on crée : celle de l'outil de la personne qui la crée. Une
 * instruction garde ensuite sa langue (`content.language`), et l'IA qui la retouche l'écrit dans
 * celle-ci ; ses traductions sont à part.
 */
export const contentLanguage = (): Lang => getLang()

/** Un nombre dans la langue de l'outil (« 12 000 » ou « 12,000 »). */
export const num = (n: number) => n.toLocaleString(locale())
