import { useSyncExternalStore } from 'react'

import { BRAND, brandify } from '../config/brand'
import { cs } from './cs'
import { de } from './de'
import { en } from './en'
import { es } from './es'
import { fr, type ShellStrings } from './fr'
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

/**
 * La langue des écrans natifs de la coquille : les dix-huit de l'app web. Au démarrage, celle que la
 * personne a choisie dans l'outil (gardée à la dernière visite), sinon celle de l'appareil, sinon la langue
 * par défaut de la marque ; ensuite, l'app web la dit par le pont (`ui.language`) et la coquille la suit
 * aussitôt. Une langue que la coquille ne parle pas prend l'anglais.
 */
export const SHELL_LANGS = ['fr', 'en', 'es', 'pt', 'de', 'it', 'pl', 'nl', 'cs', 'ro', 'hu', 'tr', 'zh', 'ja', 'ko', 'vi', 'id', 'th'] as const
export type ShellLang = (typeof SHELL_LANGS)[number]
export type { ShellStrings }

const SOURCES: Record<ShellLang, ShellStrings> = { fr, en, es, pt, de, it, pl, nl, cs, ro, hu, tr, zh, ja, ko, vi, id, th }
/** Les mots de chaque langue, au nom de la marque de la build (une fois, au chargement). */
const DICTS = Object.fromEntries(SHELL_LANGS.map((l) => [l, brandify(SOURCES[l])])) as Record<ShellLang, ShellStrings>

const listeners = new Set<() => void>()
/** Garde la langue sur l'appareil ; relié au démarrage (persist.ts), absent dans les tests. */
let save: ((lang: ShellLang) => void) | null = null

export const isShellLang = (l: unknown): l is ShellLang => typeof l === 'string' && (SHELL_LANGS as readonly string[]).includes(l)

/** La langue d'une étiquette (« pt-BR », « zh-Hans-CN », « de_AT ») si la coquille la parle ; « in » est l'ancien code de l'indonésien. */
function langOfTag(tag: string | null | undefined): ShellLang | null {
  const base = (tag ?? '').toLowerCase().split(/[-_]/)[0]
  const code = base === 'in' ? 'id' : base
  return isShellLang(code) ? code : null
}

/** La langue de l'appareil, si la coquille la parle ; sinon la langue par défaut de la marque (comme l'app web). */
export function deviceLang(locale?: string): ShellLang {
  let loc = locale
  if (loc === undefined) {
    try {
      loc = Intl.DateTimeFormat().resolvedOptions().locale
    } catch {
      loc = ''
    }
  }
  return langOfTag(loc) ?? BRAND.defaultLang
}

let current: ShellLang = deviceLang()

/** La langue d'un code donné par la page : la sienne si la coquille la connaît, l'anglais sinon. */
export function shellLangOf(code: string): ShellLang {
  return langOfTag(code) ?? 'en'
}

function apply(lang: ShellLang) {
  if (lang === current) return
  current = lang
  listeners.forEach((fn) => fn())
}

/**
 * Au démarrage : la langue gardée (la dernière que la page a dite) l'emporte sur celle de
 * l'appareil, et chaque changement sera gardé par `persist`.
 */
export function initShellLang(saved: string | null, persist: (lang: ShellLang) => void): void {
  save = persist
  if (isShellLang(saved)) apply(saved)
}

/** La page a dit sa langue : les écrans natifs la suivent, et la coquille la garde pour la prochaine fois. */
export function setShellLang(lang: ShellLang): void {
  apply(lang)
  save?.(lang)
}

/** La requête `ui.language` du pont : la langue de la page, ou l'anglais si la coquille ne la parle pas. */
export function applyPageLanguage(code: string): void {
  setShellLang(shellLangOf(code))
}

export const shellLang = (): ShellLang => current

/** Les mots, hors d'un composant : lus au moment de l'appel. */
export const strings = (): ShellStrings => DICTS[current]

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Les mots, dans un composant : il se redessine quand la langue change. */
export function useStrings(): ShellStrings {
  return DICTS[useSyncExternalStore(subscribe, () => current, () => current)]
}

/** Les mots d'une langue donnée (la page des réglages, les tests). */
export const stringsIn = (lang: ShellLang): ShellStrings => DICTS[lang]
