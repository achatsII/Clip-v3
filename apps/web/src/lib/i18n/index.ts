/**
 * La langue de l'outil (français ou anglais ; d'autres viendront). Chaque écran lit ses textes
 * dans un dictionnaire typé (`useMessages()` dans un composant, `messages()` ailleurs) : le
 * français est la source, et chaque autre langue doit avoir exactement les mêmes clés, sinon le
 * contrôle de types échoue. La personne choisit sa langue (Réglages → Apparence) ; sans choix, la
 * langue du navigateur. Les instructions elles-mêmes gardent leur langue (`content.language`), et
 * le lecteur des opérateurs a ses propres langues (components/player/i18n.ts).
 */
import { useSyncExternalStore } from 'react'
import { en } from './en'
import { fr, type Messages } from './fr'

export type { Messages }
export const LANGS = ['fr', 'en'] as const
export type Lang = (typeof LANGS)[number]
export const LANG_NAMES: Record<Lang, string> = { fr: 'Français', en: 'English' }

const KEY = 'clip_pref_ui_lang'
const DICTS: Record<Lang, Messages> = { fr, en }
const listeners = new Set<() => void>()
let current: Lang | null = null
/** Le nombre de changements de langue faits par la personne (pas la détection au démarrage). */
let switches = 0

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

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** La langue, dans un composant : il se redessine quand elle change. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => 'fr')
}

/**
 * Change à chaque changement de langue fait par la personne : la clé qui redessine la page en
 * entier (AppShell), pour que tout suive, même ce qui lit le catalogue sans s'abonner.
 */
export function useLangVersion(): number {
  return useSyncExternalStore(subscribe, () => switches, () => 0)
}

/** Les textes de l'outil, dans un composant. */
export function useMessages(): Messages {
  return DICTS[useLang()]
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
