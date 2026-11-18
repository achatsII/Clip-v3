/**
 * Les tests A/B du site : chaque test a ses bras, et un visiteur en voit un, tiré au hasard une fois puis
 * gardé dans ce navigateur (`localStorage`, `site_xp`). Seulement avec l'accord aux témoins et le toggle
 * `siteExperiments` : sans eux, tout le monde voit le premier bras (le témoin), et rien n'est gardé ni
 * mesuré. Chaque événement de la mesure porte les bras vus (`experiences`, « prix-intervalle:annee »),
 * et le tirage envoie `experience_vue` une fois.
 *
 * Le moteur marketing décide quels tests tournent, en lit les chiffres et tranche (marketing-2.0,
 * plan/experiences.md). Ouvrir, fermer ou ajouter un test : une entrée ici, puis le composant qui lit son
 * bras (`useArm`, components/site/experiments.tsx). Un test fermé montre à tous son gagnant (`winner`), ou
 * le témoin.
 */

export interface Experiment {
  id: string
  /** Le premier bras est le témoin : ce que le site montrait avant le test. */
  arms: readonly [string, ...string[]]
  /** Ouvert : les visiteurs qui ont donné leur accord y entrent. */
  open: boolean
  /** Le bras retenu une fois le test tranché, montré à tous. */
  winner?: string
}

export const EXPERIMENTS = [
  // Les tarifs s'ouvrent au prix mensuel (témoin) ou au prix annuel (deux mois offerts) : lequel donne le
  // plus d'essais, puis de revenu ? Ouvert dès que la mesure de la marque tourne (GA4, actions 130 et 131).
  { id: 'prix-intervalle', arms: ['mois', 'annee'], open: false },
] as const satisfies readonly Experiment[]

export type ExperimentId = (typeof EXPERIMENTS)[number]['id']

export const XP_KEY = 'site_xp'

export const experimentOf = (id: string): Experiment | undefined => (EXPERIMENTS as readonly Experiment[]).find((x) => x.id === id)

/** Un bras tiré au hasard, à parts égales. */
export function pickArm(xp: Experiment, random: () => number = Math.random): string {
  return xp.arms[Math.min(xp.arms.length - 1, Math.floor(random() * xp.arms.length))]!
}

/**
 * Le bras à montrer : le gagnant d'un test tranché ; celui déjà tiré, si le test est ouvert et ce bras
 * existe encore ; sinon le témoin (le tirage, s'il a lieu, se fait ailleurs : `assign`).
 */
export function armOf(xp: Experiment, stored: Record<string, string>): string {
  if (xp.winner) return xp.winner
  const mine = stored[xp.id]
  return xp.open && mine && xp.arms.includes(mine) ? mine : xp.arms[0]
}

/** Le tirage : le bras gardé s'il vaut encore, sinon un nouveau (et `fresh` le dit, pour mesurer l'exposition). */
export function assign(xp: Experiment, stored: Record<string, string>, random?: () => number): { arm: string; fresh: boolean } {
  if (xp.winner || !xp.open) return { arm: armOf(xp, stored), fresh: false }
  const mine = stored[xp.id]
  if (mine && xp.arms.includes(mine)) return { arm: mine, fresh: false }
  return { arm: pickArm(xp, random), fresh: true }
}

/** Les bras vus, pour les événements : « prix-intervalle:annee », séparés par des virgules (tests ouverts seulement). */
export function experiencesOf(stored: Record<string, string>): string {
  return (EXPERIMENTS as readonly Experiment[])
    .filter((xp) => xp.open && !xp.winner && stored[xp.id] && xp.arms.includes(stored[xp.id]!))
    .map((xp) => `${xp.id}:${stored[xp.id]}`)
    .join(',')
}

/** Les bras gardés dans ce navigateur (vide sans stockage). */
export function readArms(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(XP_KEY)
    const v = raw ? (JSON.parse(raw) as unknown) : null
    return v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string')) : {}
  } catch {
    return {}
  }
}

export function saveArm(id: string, arm: string): void {
  try {
    window.localStorage.setItem(XP_KEY, JSON.stringify({ ...readArms(), [id]: arm }))
  } catch {
    /* stockage bloqué : le bras vaut pour cette page seulement */
  }
}

/** Un refus de la mesure efface aussi les bras : plus rien de gardé. */
export function forgetArms(): void {
  try {
    window.localStorage.removeItem(XP_KEY)
  } catch {
    /* rien à effacer */
  }
}
