/**
 * Le consentement aux témoins du site (Loi 25 du Québec, RGPD) et la mesure d'audience : Google
 * Analytics 4 (Consent Mode v2, mode de base) et, pour CLIP, HubSpot.
 *
 * - Rien n'est chargé avant un « Accepter » explicite : ni gtag.js, ni le script de HubSpot. Après
 *   l'accord, seule la mesure d'audience est accordée (`analytics_storage`) ; publicité refusée.
 * - Le choix se garde dans ce navigateur (`localStorage`, `clip_site_consent`) avec sa version ; une
 *   nouvelle version du texte redemande le choix.
 * - « Refuser » (même après avoir accepté) retire le script et efface les témoins de HubSpot
 *   (`__hstc`, `hubspotutk`, `__hssc`, `__hssrc`) sur ce domaine et son domaine parent.
 * - Une réservation confirmée compte comme conversion seulement avec le consentement.
 * Navigateur seulement : chaque fonction se contente de ne rien faire au serveur.
 */

export type ConsentChoice = 'granted' | 'denied'

export const CONSENT_KEY = 'clip_site_consent'
/** 2 : Google Analytics s'ajoute à HubSpot (le texte change : on redemande le choix). */
export const CONSENT_VERSION = 2
/** L'événement qui rouvre la bannière (lien « Témoins » du pied de page). */
export const CONSENT_OPEN_EVENT = 'clip-site:consent-open'
export const HUBSPOT_COOKIES = ['__hstc', 'hubspotutk', '__hssc', '__hssrc'] as const
const LOADER_ID = 'hs-script-loader'

declare global {
  interface Window {
    _hsq?: unknown[][]
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

const GA_LOADER_ID = 'ga4-loader'

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

/* ───────────────────────── Google Analytics 4 ───────────────────────── */

/**
 * Charge Google Analytics 4 après l'accord (une fois). Consent Mode v2 : la mesure d'audience accordée,
 * la publicité refusée (ni remarketing, ni données publicitaires). Sans identifiant (`G-…`), rien.
 */
export function loadGoogleAnalytics(gaId: string): void {
  if (typeof document === 'undefined' || !gaId || document.getElementById(GA_LOADER_ID)) return
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  ;(window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = false
  window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
  window.gtag('js', new Date())
  window.gtag('config', gaId, { allow_google_signals: false, allow_ad_personalization_signals: false })
  const script = document.createElement('script')
  script.id = GA_LOADER_ID
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`
  document.head.appendChild(script)
}

/** Le refus : Google Analytics cesse de mesurer, ses témoins (`_ga`, `_ga_<flux>`) sont effacés. */
export function revokeGoogleAnalytics(gaId: string): void {
  if (typeof document === 'undefined' || !gaId) return
  ;(window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = true
  try {
    window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
  } catch {
    /* gtag n'était pas chargé */
  }
  document.getElementById(GA_LOADER_ID)?.remove()
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim()
    if (name && (name === '_ga' || name.startsWith('_ga_'))) deleteCookie(name)
  }
}

/**
 * Les événements du site, aux noms du moteur marketing (plan/marquage-ga4.md de Marketing 2.0) :
 * `vue_prix` (la page des tarifs), `clic_essai` (un bouton d'essai), `clic_demo` (une démo avec
 * l'équipe), `video_start` (le film). Chacun porte `offre`, `type_page`, `langue` et `emplacement`.
 * Seulement avec l'accord et gtag chargé : sans accord, rien ne part, même plus tard.
 */
export type SiteEvent = 'vue_prix' | 'clic_essai' | 'clic_demo' | 'video_start'
export function trackEvent(name: SiteEvent, params: { offre: string; type_page: string; langue: string; emplacement: string } & Record<string, string | number>): void {
  if (typeof window === 'undefined' || readConsent() !== 'granted' || !window.gtag) return
  window.gtag('event', name, params)
}

