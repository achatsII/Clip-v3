/**
 * La mesure de l'essai et de l'abonnement, pour le moteur marketing (marketing-2.0, plan/experiences.md) :
 * au retour du paiement Stripe, `essai_commence` (un essai avec carte) ou `abonnement` (payé tout de
 * suite) ; puis, quand l'app voit l'essai devenu abonnement actif, `abonnement` (la conversion). Chacun
 * porte le forfait, l'intervalle, la valeur et les bras des tests A/B vus sur le site
 * (`trackEvent`). Comme sur le site : seulement avec l'accord aux témoins et le flux GA4 de la marque,
 * jamais dans l'aperçu ; sans accord, rien ne part, et rien n'est gardé.
 */
import { PRODUCT } from '@/lib/brand/product'
import { loadGoogleAnalytics, readConsent, trackEvent } from '@/lib/site/consent'
import { GA_ID } from '@/lib/site/routes'

/** Le paiement en cours (onglet), lu au retour de Stripe. */
export const CHECKOUT_KEY = 'site_checkout'
/** L'essai commencé (navigateur), jusqu'à ce que l'app le voie converti ou fini. */
export const TRIAL_KEY = 'site_trial'

export interface CheckoutNote {
  plan: string
  interval: 'monthly' | 'yearly'
  /** Un essai : le forfait s'essaie, et c'est le premier abonnement de l'organisation. */
  trial: boolean
  /** Le prix du forfait, en unités de la devise (199 pour 199 $). */
  value: number
  currency: string
}

const isNote = (v: unknown): v is CheckoutNote => {
  const n = v as Partial<CheckoutNote> | null
  return !!n && typeof n.plan === 'string' && (n.interval === 'monthly' || n.interval === 'yearly') && typeof n.trial === 'boolean' && typeof n.value === 'number' && typeof n.currency === 'string'
}

function read(storage: Storage | undefined, key: string): CheckoutNote | null {
  try {
    const raw = storage?.getItem(key)
    const v = raw ? (JSON.parse(raw) as unknown) : null
    return isNote(v) ? v : null
  } catch {
    return null
  }
}

function write(storage: Storage | undefined, key: string, note: CheckoutNote | null): void {
  try {
    if (note) storage?.setItem(key, JSON.stringify(note))
    else storage?.removeItem(key)
  } catch {
    /* stockage bloqué : la mesure se perd, rien d'autre */
  }
}

const session = () => (typeof window === 'undefined' ? undefined : window.sessionStorage)
const local = () => (typeof window === 'undefined' ? undefined : window.localStorage)

/** Avant d'aller payer : ce qu'on achète, pour le dire au retour. Rien sans accord. */
export function rememberCheckout(note: CheckoutNote): void {
  if (readConsent() !== 'granted' || !GA_ID) return
  write(session(), CHECKOUT_KEY, note)
}

/** L'événement qu'un retour de paiement envoie : l'essai, ou l'abonnement payé tout de suite. */
export const checkoutEvent = (note: CheckoutNote) => (note.trial ? 'essai_commence' : 'abonnement')

function send(name: 'essai_commence' | 'abonnement', note: CheckoutNote, lang: string): void {
  loadGoogleAnalytics(GA_ID)
  trackEvent(name, { offre: PRODUCT.id, type_page: 'app', langue: lang, emplacement: 'paiement', forfait: note.plan, intervalle: note.interval, value: note.value, currency: note.currency })
}

/** Au retour de Stripe (`?merci=1`) : l'essai ou l'abonnement, une fois. */
export function measureCheckoutReturn(lang: string): void {
  const note = read(session(), CHECKOUT_KEY)
  write(session(), CHECKOUT_KEY, null)
  if (!note || readConsent() !== 'granted' || !GA_ID) return
  send(checkoutEvent(note), note, lang)
  if (note.trial) write(local(), TRIAL_KEY, note)
}

/**
 * L'état de l'abonnement, lu par l'app : un essai devenu actif est une conversion (`abonnement`, une fois) ;
 * un essai fini autrement (annulé, expiré, rien) s'oublie.
 */
export function measureTrialOutcome(state: string | null | undefined, lang: string): void {
  // Paiement en retard à la fin de l'essai : la conversion peut encore venir.
  if (!state || state === 'trialing' || state === 'grace') return
  const note = read(local(), TRIAL_KEY)
  if (!note) return
  write(local(), TRIAL_KEY, null)
  if (state === 'active' && readConsent() === 'granted' && GA_ID) send('abonnement', note, lang)
}
