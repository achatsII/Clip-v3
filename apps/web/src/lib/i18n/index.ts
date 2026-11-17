/**
 * La langue de l'outil (dix-huit langues, `LANGS`). Chaque écran lit ses textes dans un dictionnaire
 * typé (`useMessages()` dans un composant, `messages()` ailleurs) : le français est la source, et
 * chaque autre langue doit avoir exactement les mêmes clés, sinon le contrôle de types échoue. La
 * personne choisit sa langue (Réglages → Apparence, ou à la connexion) ; sans choix, celle du
 * navigateur. Hors du français et de l'anglais, un dictionnaire se charge à la demande. Les instructions elles-mêmes gardent leur langue (`content.language`), et
 * le lecteur des opérateurs a ses propres langues (components/player/i18n.ts).
 */
import { useSyncExternalStore } from 'react'
import { DICTS, getLang, langSwitches, messages, subscribe, type Lang } from './core'
import type { Messages } from './fr'

export * from './core'

/** La langue, dans un composant : il se redessine quand elle change. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => 'fr')
}

/**
 * Change à chaque changement de langue fait par la personne : la clé qui redessine la page en
 * entier (AppShell), pour que tout suive, même ce qui lit le catalogue sans s'abonner.
 */
export function useLangVersion(): number {
  return useSyncExternalStore(subscribe, langSwitches, () => 0)
}

/** Les textes de l'outil, dans un composant : il se redessine quand la langue change ou finit de se charger. */
export function useMessages(): Messages {
  return useSyncExternalStore(subscribe, messages, () => DICTS.fr)
}

