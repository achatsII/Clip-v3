/**
 * Le cœur des langues de l'outil, sans React : utilisable partout, routes du serveur comprises
 * (elles parlent français). Les composants passent par `@/lib/i18n` (`useMessages()`), qui ajoute
 * les hooks ; voir ce fichier pour les règles.
 */
import { en } from './en'
import { fr, type Messages } from './fr'

export type { Messages }
export const LANGS = ['fr', 'en'] as const
export type Lang = (typeof LANGS)[number]
export const LANG_NAMES: Record<Lang, string> = { fr: 'Français', en: 'English' }

const KEY = 'clip_pref_ui_lang'
export const DICTS: Record<Lang, Messages> = { fr, en }
const listeners = new Set<() => void>()
let current: Lang | null = null
/** Le nombre de changements de langue faits par la personne (pas la détection au démarrage). */
let switches = 0
export const langSwitches = () => switches

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'fr' || saved === 'en') return saved
  } catch {
    /* stockage indisponible */
  }
  return typeof navigator !== 'undefined' && /^en\b/i.test(navigator.language || '') ? 'en' : 'fr'
}

function applyDocumentLang(l: Lang) {
  if (typeof document !== 'undefined') document.documentElement.lang = l === 'en' ? 'en-CA' : 'fr-CA'
}

/** La langue de l'outil en ce moment. */
export function getLang(): Lang {
  if (current === null) {
    if (typeof window === 'undefined') return 'fr'
    current = detect()
    applyDocumentLang(current)
  }
  return current
}

export function setLang(l: Lang): void {
  current = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    /* le choix vaut pour cette visite */
  }
  applyDocumentLang(l)
  switches += 1
  listeners.forEach((fn) => fn())
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
  return DICTS[getLang()]
}

/**
 * Les textes dans une langue donnée, quelle que soit celle de l'outil : ce qui suit la langue d'une
 * instruction (son PDF). Une langue que l'outil ne parle pas encore prend l'anglais.
 */
export function messagesIn(lang: string): Messages {
  return (DICTS as Record<string, Messages>)[lang] ?? DICTS.en
}

/** La locale des dates et des nombres. */
export function locale(): 'fr-CA' | 'en-CA' {
  return getLang() === 'en' ? 'en-CA' : 'fr-CA'
}

/**
 * La langue d'une instruction qu'on crée : celle de l'outil de la personne qui la crée. Une
 * instruction garde ensuite sa langue (`content.language`), et l'IA qui la retouche l'écrit dans
 * celle-ci ; ses traductions sont à part.
 */
export const contentLanguage = (): Lang => getLang()

/** Un nombre dans la langue de l'outil (« 12 000 » ou « 12,000 »). */
export const num = (n: number) => n.toLocaleString(locale())
