import { useSyncExternalStore } from 'react'

import { en } from './en'
import { fr, type ShellStrings } from './fr'

/**
 * La langue des écrans natifs de la coquille. Au démarrage, celle que la personne a choisie dans
 * l'outil (gardée à la dernière visite), sinon celle de l'appareil ; ensuite, l'app web la dit par
 * le pont (`ui.language`) et la coquille la suit aussitôt. Une langue que la coquille ne connaît
 * pas encore prend l'anglais.
 */
export type ShellLang = 'fr' | 'en'
export type { ShellStrings }

const DICTS: Record<ShellLang, ShellStrings> = { fr, en }
const listeners = new Set<() => void>()
/** Garde la langue sur l'appareil ; relié au démarrage (persist.ts), absent dans les tests. */
let save: ((lang: ShellLang) => void) | null = null

/** La langue de l'appareil : l'anglais s'il est en anglais, le français sinon (comme l'app web). */
export function deviceLang(locale?: string): ShellLang {
  let loc = locale
  if (loc === undefined) {
    try {
      loc = Intl.DateTimeFormat().resolvedOptions().locale
    } catch {
      loc = ''
    }
  }
  return /^en\b/i.test(loc ?? '') ? 'en' : 'fr'
}

let current: ShellLang = deviceLang()

/** La langue d'un code donné par la page : la sienne si la coquille la connaît, l'anglais sinon. */
export function shellLangOf(code: string): ShellLang {
  const base = code.toLowerCase().split(/[-_]/)[0]
  return base === 'fr' || base === 'en' ? base : 'en'
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
  if (saved === 'fr' || saved === 'en') apply(saved)
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
