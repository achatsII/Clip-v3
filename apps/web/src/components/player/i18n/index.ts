/**
 * Les mots du lecteur, dans les langues des opérateurs (choisies au poste, pas celle de l'outil) :
 * tout ce qu'un opérateur lit ou entend au poste passe par ici. Le contenu, lui, vient des
 * traductions. Le français est la source (`./fr.ts`) ; chaque langue (`./<langue>.ts`) a les mêmes
 * clés (le contrôle de types y veille), et une langue que le lecteur ne parle pas prend l'anglais.
 */
import { useSyncExternalStore } from 'react'
import type { Check } from '@/lib/model/types'
import { brandify } from '@/lib/brand/product'
import { en } from './en'
import { es } from './es'
import { fr, type PlayerStrings } from './fr'

export type { PlayerStrings }

/**
 * Les mots du lecteur dans chaque langue de l'outil. Le français (la source), l'anglais (le repli) et
 * l'espagnol sont toujours là ; les autres se chargent à la demande, une fois. Une langue d'opérateur
 * que le lecteur ne parle pas (le tagalog, le pendjabi…) prend l'anglais : le contenu, lui, suit sa
 * traduction.
 */
type Lazy = 'pt' | 'de' | 'it' | 'pl' | 'nl' | 'cs' | 'ro' | 'hu' | 'tr' | 'zh' | 'ja' | 'ko' | 'vi' | 'id' | 'th'
const LOADERS: Record<Lazy, () => Promise<PlayerStrings>> = {
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

const STRINGS: Record<string, PlayerStrings> = { fr: brandify(fr), en: brandify(en), es: brandify(es) }
const loading = new Map<string, Promise<PlayerStrings>>()
const listeners = new Set<() => void>()

const primary = (lang: string) => (lang || '').toLowerCase().split(/[-_]/)[0]

/** Charge les mots d'une langue (une fois) ; une langue inconnue rend l'anglais. */
export function loadPlayerStrings(lang: string): Promise<PlayerStrings> {
  const l = primary(lang)
  if (STRINGS[l]) return Promise.resolve(STRINGS[l])
  const loader = LOADERS[l as Lazy]
  if (!loader) return Promise.resolve(STRINGS.en)
  let p = loading.get(l)
  if (!p) {
    p = loader().then((words) => {
      STRINGS[l] = brandify(words)
      listeners.forEach((fn) => fn())
      return STRINGS[l]
    })
    p.catch(() => loading.delete(l))
    loading.set(l, p)
  }
  return p
}

/** Les mots du lecteur dans cette langue ; pas encore chargés, l'anglais (et ils se chargent). */
export function strings(lang: string): PlayerStrings {
  const l = primary(lang)
  const ready = STRINGS[l]
  if (ready) return ready
  if (LOADERS[l as Lazy]) void loadPlayerStrings(l).catch(() => undefined)
  return STRINGS.en
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Les mots du lecteur, dans un composant : il se redessine quand la langue finit de se charger. */
export function usePlayerStrings(lang: string): PlayerStrings {
  return useSyncExternalStore(
    subscribe,
    () => strings(lang),
    () => STRINGS.fr,
  )
}

export function rangeText(c: Check, t: PlayerStrings['records']): string | null {
  const unit = c.unit ?? ''
  const lo = typeof c.min === 'number' ? t.num(c.min) : null
  const hi = typeof c.max === 'number' ? t.num(c.max) : null
  if (lo && hi) return t.between(lo, hi, unit)
  if (lo) return t.atLeast(lo, unit)
  if (hi) return t.atMost(hi, unit)
  return null
}
