/**
 * Le renouvellement des jetons de la session Découvrir, côté serveur (référence 16 du skill
 * api-plateforme-ii : le refresh token est tourné à chaque renouvellement) :
 *  1. les nouveaux jetons repartent vers le navigateur dans la même réponse (Set-Cookie, `route.ts`) ;
 *  2. un seul renouvellement en vol par refresh token, partagé, et son résultat gardé 30 s pour une requête
 *     arrivée juste après avec l'ancien jeton ;
 *  3. toujours avec l'application qui a émis les jetons (`sandboxes` pour un prospect) : un jeton
 *     `sandboxes` renouvelé avec une autre application échoue, et la personne serait sortie sans raison.
 * Serveur seulement.
 */

export interface TokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

const inflight = new Map<string, Promise<TokenResponse | null>>()
const recent = new Map<string, { at: number; value: TokenResponse | null }>()

export function refreshTokens(refresh: string, app: string, gateway: string, fetcher: typeof fetch = fetch): Promise<TokenResponse | null> {
  const key = `${gateway} ${app} ${refresh}`
  const cached = recent.get(key)
  if (cached && Date.now() - cached.at < 30_000) return Promise.resolve(cached.value)
  const running = inflight.get(key)
  if (running) return running
  const p = (async () => {
    try {
      const res = await fetcher(`${gateway}/api/v1/auth/token/refresh?app_identifier=${encodeURIComponent(app)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) return null
      const body = (await res.json()) as TokenResponse
      return body.access_token ? body : null
    } catch {
      return null
    } finally {
      setTimeout(() => inflight.delete(key), 0)
    }
  })()
  inflight.set(key, p)
  void p.then((value) => {
    recent.set(key, { at: Date.now(), value })
    if (recent.size > 500) recent.clear()
  })
  return p
}

/** La session avec ses nouveaux jetons (le refresh token change à chaque renouvellement). */
export function withTokens<S extends { access: string; refresh: string; exp: number }>(s: S, t: TokenResponse, now = Date.now()): S {
  return { ...s, access: t.access_token!, refresh: t.refresh_token || s.refresh, exp: now + Math.max(60, Number(t.expires_in ?? 3600)) * 1000 }
}
