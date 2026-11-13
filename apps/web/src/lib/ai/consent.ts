/**
 * L'accord avant d'envoyer quoi que ce soit à l'IA (exigence d'Apple, et la bonne chose à faire) :
 * photos, vidéos, notes vocales et textes partent vers des services d'IA (Google, OpenAI) par la
 * plateforme d'Intelligence Industrielle. On le demande une fois, au premier usage, par personne et
 * par appareil ; il se retire dans Réglages › Données.
 *
 * Le client de l'IA (`aiApi`) et l'envoi des fichiers aux modèles (`filesApi`) passent par
 * `aiAllowed()`. La fenêtre qui le demande (`AiConsentHost`) s'y branche dans l'app connectée ; les
 * liens publics n'en ont pas (rien n'y est envoyé de la personne qui lit).
 */
import { messages } from '@/lib/i18n'
import { ApiError } from '../gateway/client'

type Gate = () => Promise<boolean>

let gate: Gate | null = null

/** La fenêtre de l'accord s'y branche (null : plus de verrou, l'app s'est fermée). */
export function setAiGate(fn: Gate | null) {
  gate = fn
}

/** Peut-on envoyer à l'IA ? Sans fenêtre branchée (lien public, tests) : oui. */
export async function aiAllowed(): Promise<boolean> {
  return gate ? gate() : true
}

/** Refusé : l'appel ne part pas, et le message le dit. */
export async function requireAiConsent(): Promise<void> {
  if (!(await aiAllowed())) throw new ApiError(messages().common.errors.aiConsent, 0, null, 'ai_consent')
}

const key = (userId: string) => `clip_ai_consent_${userId}`

/** La date de l'accord de cette personne sur cet appareil, ou null. */
export function consentDate(userId: string): string | null {
  try {
    return localStorage.getItem(key(userId))
  } catch {
    return null
  }
}

export function saveConsent(userId: string, at: string | null) {
  try {
    if (at) localStorage.setItem(key(userId), at)
    else localStorage.removeItem(key(userId))
  } catch {
    /* sans stockage, on redemandera */
  }
}
