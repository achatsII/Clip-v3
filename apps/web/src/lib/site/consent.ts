/**
 * Le consentement aux témoins du site (Loi 25 du Québec) et le suivi HubSpot.
 *
 * - Rien n'est chargé avant un « Accepter » explicite : le script de HubSpot ne s'ajoute qu'ensuite.
 * - Le choix se garde dans ce navigateur (`localStorage`, `clip_site_consent`) avec sa version ; une
 *   nouvelle version du texte redemande le choix.
 * - « Refuser » (même après avoir accepté) retire le script et efface les témoins de HubSpot
 *   (`__hstc`, `hubspotutk`, `__hssc`, `__hssrc`) sur ce domaine et son domaine parent.
 * - Une réservation confirmée compte comme conversion seulement avec le consentement.
 * Navigateur seulement : chaque fonction se contente de ne rien faire au serveur.
 */

export type ConsentChoice = 'granted' | 'denied'

export const CONSENT_KEY = 'clip_site_consent'
export const CONSENT_VERSION = 1
/** L'événement qui rouvre la bannière (lien « Témoins » du pied de page). */
export const CONSENT_OPEN_EVENT = 'clip-site:consent-open'
export const HUBSPOT_COOKIES = ['__hstc', 'hubspotutk', '__hssc', '__hssrc'] as const
const LOADER_ID = 'hs-script-loader'

declare global {
  interface Window {
    _hsq?: unknown[][]
  }
}

export function readConsent(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as { choice?: unknown; version?: unknown }
    if (v.version !== CONSENT_VERSION) return null
    return v.choice === 'granted' || v.choice === 'denied' ? v.choice : null
  } catch {
    return null
  }
}

export function saveConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, version: CONSENT_VERSION, at: new Date().toISOString() }))
  } catch {
    /* stockage bloqué : le choix vaut pour cette page seulement */
  }
}

/** Ajoute le script de suivi HubSpot (une fois). Sans identifiant, rien. */
export function loadHubSpot(hubId: string): void {
  if (typeof document === 'undefined' || !hubId || document.getElementById(LOADER_ID)) return
  window._hsq = window._hsq || []
  const script = document.createElement('script')
  script.id = LOADER_ID
  script.async = true
  script.defer = true
  script.src = `https://js-na1.hs-scripts.com/${encodeURIComponent(hubId)}.js`
  document.head.appendChild(script)
}

/** Efface un témoin sur ce domaine et sur son domaine parent (HubSpot pose les deux). */
export function deleteCookie(name: string, hostname = window.location.hostname): void {
  const parts = hostname.split('.')
  const domains = new Set<string>(['', hostname, `.${hostname}`])
  if (parts.length >= 2) {
    const root = parts.slice(-2).join('.')
    domains.add(root)
    domains.add(`.${root}`)
  }
  for (const domain of domains) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ''}; SameSite=Lax`
}

/** Le refus : HubSpot cesse de suivre, son script part, ses témoins sont effacés. */
export function revokeHubSpot(): void {
  if (typeof document === 'undefined') return
  try {
    window._hsq?.push(['revokeCookieConsent'])
  } catch {
    /* le script n'était pas chargé */
  }
  document.getElementById(LOADER_ID)?.remove()
  for (const name of HUBSPOT_COOKIES) deleteCookie(name)
}

/**
 * Une conversion (réservation confirmée) : une page vue virtuelle chez HubSpot, seulement avec le
 * consentement et le script chargé. Sans consentement, rien ne part, même plus tard.
 */
export function trackConversion(path: string): void {
  if (typeof window === 'undefined' || readConsent() !== 'granted' || !window._hsq) return
  window._hsq.push(['setPath', path])
  window._hsq.push(['trackPageView'])
}
