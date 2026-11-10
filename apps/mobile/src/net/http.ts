/**
 * Requêtes HTTP de la coquille : un délai par requête et une seule nouvelle tentative sur
 * coupure réseau ou erreur 5xx. Jamais de boucle : un réseau d'usine instable ne doit pas
 * multiplier les appels.
 */
export interface FetchOptions {
  method?: string
  headers?: Record<string, string>
  body?: string
  timeoutMs?: number
  /** Nombre de nouvelles tentatives (0 ou 1). */
  retries?: 0 | 1
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

async function once(url: string, opts: FetchOptions, fetchImpl: FetchLike): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000)
  try {
    return await fetchImpl(url, {
      method: opts.method ?? 'GET',
      headers: opts.headers,
      body: opts.body,
      signal: controller.signal,
    })
  } catch (e) {
    throw new NetworkError(e instanceof Error ? e.message : String(e))
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchWithRetry(
  url: string,
  opts: FetchOptions = {},
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  const retries = opts.retries ?? 1
  try {
    const res = await once(url, opts, fetchImpl)
    if (res.status >= 500 && retries > 0) return await once(url, opts, fetchImpl)
    return res
  } catch (e) {
    if (e instanceof NetworkError && retries > 0) return once(url, opts, fetchImpl)
    throw e
  }
}
