/**
 * La mémoire du conseiller d'achat, par personne et par appareil : l'offre montrée, celles rangées
 * par « Plus tard », et les essais de fonctions fermées. Une commodité : vidée, elle repart de zéro
 * sans rien casser (les offres restent rares, une par semaine au plus).
 */
import { addTry, emptyMemory, type AdvisorMemory } from './advisor'

export interface AdvisorStored {
  memory: AdvisorMemory
  tries: Partial<Record<string, number[]>>
}

const key = (userId: string) => `clip_advisor_${userId}`

export function readAdvisor(userId: string): AdvisorStored {
  try {
    const raw = localStorage.getItem(key(userId))
    const parsed = raw ? (JSON.parse(raw) as Partial<AdvisorStored>) : null
    return { memory: { ...emptyMemory(), ...(parsed?.memory ?? {}) }, tries: parsed?.tries ?? {} }
  } catch {
    return { memory: emptyMemory(), tries: {} }
  }
}

export function writeAdvisor(userId: string, value: AdvisorStored): void {
  try {
    localStorage.setItem(key(userId), JSON.stringify(value))
  } catch {
    /* facultatif : sans mémoire, le conseiller reste discret */
  }
}

/** Une fonction fermée vient d'être essayée (un refus de la plateforme, un verrou touché). */
export function recordTry(userId: string, feature: string, now = Date.now()): void {
  const s = readAdvisor(userId)
  writeAdvisor(userId, { ...s, tries: addTry(s.tries, feature, now) })
}
