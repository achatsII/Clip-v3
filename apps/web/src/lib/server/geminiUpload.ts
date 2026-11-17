/**
 * L'envoi d'un fichier du stockage chez Gemini par la voie n8n de la Gateway, quand la route directe
 * (`/api/v1/ai/gemini/upload/direct`, service d'envoi de la plateforme) n'est pas servie : en prod,
 * novembre 2026, elle répondait 404 (« Cannot POST /gemini/upload »). La même voie que Clip V1
 * (`app/api/bridge-upload`) : la Gateway (`/api/v1/ai/gemini/upload`, flux n8n
 * `Route_Gemini_File_Upload`) ouvre un envoi en plusieurs temps chez Google avec la clé du serveur
 * et rend son adresse ; ce serveur y verse le fichier, lu en flux depuis le stockage, sans le garder.
 *
 * Toujours avec le jeton de la personne (jamais un jeton du serveur, il n'en a pas), et seulement
 * pour un fichier de notre stockage (DigitalOcean Spaces) : jamais une adresse quelconque (SSRF).
 */
import { GATEWAY_URL } from './gateway'

/** La plus grosse vidéo que l'IA reçoit (`GEMINI_MAX_BYTES` de l'app, 100 Mo), avec de la marge. */
export const BRIDGE_MAX_BYTES = 110 * 1024 * 1024

/** Les lectures du fichier source : un fichier tout juste envoyé peut ne pas être lisible tout de suite. */
const SOURCE_DELAYS_MS = [0, 1500, 3000]

const MIME = /^(video|audio)\/[\w.+-]+$|^application\/pdf$|^image\/[\w.+-]+$/

/** Vrai pour un fichier de notre stockage (https, DigitalOcean Spaces), jamais une autre adresse. */
export function isStorageUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  const host = u.hostname.toLowerCase()
  return u.protocol === 'https:' && (host === 'digitaloceanspaces.com' || host.endsWith('.digitaloceanspaces.com'))
}

export interface BridgeResult {
  status: number
  body: { uri: string; expiresAt: string | null } | { error: string; detail?: unknown }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function bridgeToGemini(input: {
  url: unknown
  mimeType: unknown
  token: string
  fetchImpl?: typeof fetch
  gatewayUrl?: string
  delays?: number[]
}): Promise<BridgeResult> {
  const doFetch = input.fetchImpl ?? fetch
  const gateway = input.gatewayUrl ?? GATEWAY_URL
  if (!isStorageUrl(input.url)) return { status: 400, body: { error: 'url' } }
  const mimeType = typeof input.mimeType === 'string' ? input.mimeType.trim().toLowerCase() : ''
  if (!MIME.test(mimeType)) return { status: 400, body: { error: 'mimeType' } }

  // 1. Le fichier, en flux.
  let source: Response | null = null
  for (const ms of input.delays ?? SOURCE_DELAYS_MS) {
    if (ms) await wait(ms)
    if (source) await source.body?.cancel().catch(() => undefined)
    source = await doFetch(input.url, { cache: 'no-store' }).catch(() => null)
    if (source?.ok) break
  }
  if (!source?.ok || !source.body) return { status: 502, body: { error: 'source' } }
  let size = Number(source.headers.get('content-length') || 0)
  let payload: BodyInit = source.body
  if (!size) {
    // Sans taille annoncée, Google ne peut pas ouvrir l'envoi : on lit le fichier (100 Mo au plus).
    const buf = await source.arrayBuffer()
    size = buf.byteLength
    payload = buf
  }
  if (size > BRIDGE_MAX_BYTES) {
    await source.body?.cancel().catch(() => undefined)
    return { status: 413, body: { error: 'size' } }
  }

  // 2. L'adresse d'envoi, par la Gateway, avec le jeton de la personne.
  const init = await doFetch(`${gateway}/api/v1/ai/gemini/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'GEMINI_FILE_UPLOAD', fileSize: size, mimeType }),
    cache: 'no-store',
  }).catch(() => null)
  if (!init) return { status: 502, body: { error: 'gateway' } }
  if (init.status === 401 || init.status === 403 || init.status === 402) {
    await source.body?.cancel().catch(() => undefined)
    return { status: init.status, body: { error: 'gateway', detail: await init.json().catch(() => null) } }
  }
  const initJson = (await init.json().catch(() => null)) as { results?: Array<{ upload_url?: string; error?: string }> } | null
  const uploadUrl = initJson?.results?.[0]?.upload_url
  if (!init.ok || !uploadUrl || !uploadUrl.startsWith('https://')) {
    await source.body?.cancel().catch(() => undefined)
    return { status: 502, body: { error: 'gateway', detail: initJson } }
  }

  // 3. Le fichier chez Google, d'un seul envoi qui le termine.
  const up = await doFetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Length': String(size), 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
    body: payload,
    // @ts-expect-error -- Node : un corps en flux exige `duplex`, inconnu des types du navigateur.
    duplex: 'half',
  }).catch(() => null)
  const upJson = (await up?.json().catch(() => null)) as { file?: { uri?: string; expirationTime?: string } } | null
  if (!up?.ok || !upJson?.file?.uri) return { status: 502, body: { error: 'gemini', detail: upJson } }
  return { status: 200, body: { uri: upJson.file.uri, expiresAt: upJson.file.expirationTime ?? null } }
}
