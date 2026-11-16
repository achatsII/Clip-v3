/**
 * L'accord avant d'envoyer quoi que ce soit à l'IA (exigence d'Apple, règle 5.1.2(i), et la bonne
 * chose à faire) : photos, vidéos, notes vocales et textes partent vers l'IA de Google, et une photo
 * vers celle d'OpenAI quand on lui demande une image, par la plateforme d'Intelligence Industrielle.
 *
 * Toggle `aiConsentAtSignIn` (le défaut) : l'accord se donne à la connexion, par une ligne sous le
 * bouton ; aucune fenêtre ensuite. Il se retire et se redonne dans Réglages › Données, et un accord
 * retiré ferme l'IA sur l'appareil. Sinon (toggle `aiConsent`) : une fenêtre le demande au premier
 * usage, par personne et par appareil.
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
/** Un accord retiré se garde : sans lui, la connexion vaudrait accord de nouveau. */
const WITHDRAWN = 'withdrawn'

function read(userId: string): string | null {
  try {
    return localStorage.getItem(key(userId))
  } catch {
    return null
  }
}

/** La date de l'accord de cette personne sur cet appareil, ou null (jamais noté, ou retiré). */
export function consentDate(userId: string): string | null {
  const v = read(userId)
  return v && v !== WITHDRAWN ? v : null
}

/** La personne a-t-elle retiré son accord sur cet appareil ? */
export function consentWithdrawn(userId: string): boolean {
  return read(userId) === WITHDRAWN
}

/** Note l'accord (une date) ou son retrait (null). */
export function saveConsent(userId: string, at: string | null) {
  try {
    localStorage.setItem(key(userId), at ?? WITHDRAWN)
  } catch {
    /* sans stockage : avec la fenêtre, on redemandera ; à la connexion, rien ne change */
  }
}

/**
 * Au prochain envoi à l'IA : le laisser partir, le bloquer, ou ouvrir la fenêtre (modèle d'avant).
 * À la connexion, seul un retrait bloque ; avec la fenêtre, il faut une date.
 */
export function consentDecision(o: { atSignIn: boolean; modal: boolean; date: string | null; withdrawn: boolean }): 'allow' | 'block' | 'ask' {
  if (o.atSignIn) return o.withdrawn ? 'block' : 'allow'
  if (!o.modal || o.date) return 'allow'
  return 'ask'
}
