import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/gateway/client'
import { filesApi, resetGeminiRoute } from '@/lib/gateway/files'
import { messages } from '@/lib/i18n'
import { bridgeToGemini, isStorageUrl } from '@/lib/server/geminiUpload'
import { fakeGateway } from './fakeClient'

/**
 * L'envoi d'une vidéo chez Gemini. Novembre 2026 : la Gateway prod connaissait la route directe, mais
 * son service d'envoi répondait 404 (« Cannot POST /gemini/upload ») ; aucune vidéo ne partait à l'IA.
 * La voie n8n de la Gateway (celle de Clip V1), elle, marchait : l'app y passe par son serveur.
 */
const VIDEO = 'https://ii-file.tor1.digitaloceanspaces.com/clip-v2/org/v.mp4'
const upload = (err: ApiError) => filesApi(fakeGateway(() => err)).geminiUpload(VIDEO, 'video/mp4', 10, 'v.mp4')

describe('l’envoi chez Gemini', () => {
  const bridge = vi.fn()
  beforeEach(() => {
    resetGeminiRoute()
    bridge.mockReset()
    vi.stubGlobal('fetch', bridge)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('route directe absente : la voie du serveur, puis droit à elle pour la suite de la séance', async () => {
    bridge.mockImplementation(async () => new Response(JSON.stringify({ uri: 'https://generativelanguage.googleapis.com/v1beta/files/abc', expiresAt: '2026-11-19T10:00:00Z' }), { status: 200 }))
    const gw = fakeGateway(() => new ApiError('Cannot POST /gemini/upload', 404, '<pre>Cannot POST /gemini/upload</pre>'))
    const files = filesApi(gw)
    await expect(files.geminiUpload(VIDEO, 'video/mp4', 10, 'v.mp4')).resolves.toEqual({ uri: 'https://generativelanguage.googleapis.com/v1beta/files/abc', expiresAt: '2026-11-19T10:00:00Z' })
    const [path, init] = bridge.mock.calls[0]
    expect(path).toBe('/api/gemini-upload')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jeton')
    expect(JSON.parse(init.body)).toMatchObject({ url: VIDEO, mimeType: 'video/mp4' })
    await files.geminiUpload(VIDEO, 'video/mp4', 10, 'v.mp4')
    // La route directe n'est essayée qu'une fois.
    expect(gw.calls.filter((c) => c.endpoint.includes('gemini/upload/direct'))).toHaveLength(1)
  })

  it('les deux voies en échec : « la vidéo n’a pas pu être préparée pour l’IA »', async () => {
    bridge.mockImplementation(async () => new Response(JSON.stringify({ error: 'gemini' }), { status: 502 }))
    for (const status of [404, 500, 502]) {
      resetGeminiRoute()
      await expect(upload(new ApiError('Cannot POST /gemini/upload', status, '<pre>Cannot POST /gemini/upload</pre>'))).rejects.toMatchObject({
        message: messages().common.errors.videoForAi,
        code: 'gemini_upload',
      })
    }
  })

  it('une session expirée ou un refus de droit reste tel quel, sans autre voie', async () => {
    await expect(upload(new ApiError('expirée', 401))).rejects.toMatchObject({ status: 401, message: 'expirée' })
    await expect(upload(new ApiError('crédits', 402))).rejects.toMatchObject({ status: 402, message: 'crédits' })
    await expect(upload(new ApiError('droit', 403))).rejects.toMatchObject({ status: 403, message: 'droit' })
    expect(bridge).not.toHaveBeenCalled()
  })
})

describe('la voie du serveur (/api/gemini-upload)', () => {
  it('ne lit que notre stockage, jamais une autre adresse', () => {
    expect(isStorageUrl(VIDEO)).toBe(true)
    for (const bad of ['http://ii-file.tor1.digitaloceanspaces.com/v.mp4', 'https://evil.com/?x=digitaloceanspaces.com', 'https://digitaloceanspaces.com.evil.com/v.mp4', 'https://169.254.169.254/latest', 42, null]) {
      expect(isStorageUrl(bad), String(bad)).toBe(false)
    }
  })

  it('ouvre l’envoi par la Gateway avec le jeton de la personne, puis verse le fichier chez Google', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      if (String(url) === VIDEO) return new Response(new Uint8Array(10), { status: 200, headers: { 'content-length': '10' } })
      if (String(url).endsWith('/api/v1/ai/gemini/upload')) return new Response(JSON.stringify({ success: true, results: [{ upload_url: 'https://generativelanguage.googleapis.com/upload/v1beta/files?upload_id=u1' }] }), { status: 200 })
      return new Response(JSON.stringify({ file: { uri: 'https://generativelanguage.googleapis.com/v1beta/files/f1', expirationTime: '2026-11-19T10:00:00Z' } }), { status: 200 })
    }) as unknown as typeof fetch
    const r = await bridgeToGemini({ url: VIDEO, mimeType: 'video/mp4', token: 'jeton-personne', fetchImpl, gatewayUrl: 'https://gw.test', delays: [0] })
    expect(r).toEqual({ status: 200, body: { uri: 'https://generativelanguage.googleapis.com/v1beta/files/f1', expiresAt: '2026-11-19T10:00:00Z' } })
    const init = calls[1]
    expect(init.url).toBe('https://gw.test/api/v1/ai/gemini/upload')
    expect((init.init?.headers as Record<string, string>).Authorization).toBe('Bearer jeton-personne')
    expect(JSON.parse(String(init.init?.body))).toEqual({ action: 'GEMINI_FILE_UPLOAD', fileSize: 10, mimeType: 'video/mp4' })
    const up = calls[2]
    expect((up.init?.headers as Record<string, string>)['X-Goog-Upload-Command']).toBe('upload, finalize')
    expect((up.init?.headers as Record<string, string>)['Content-Length']).toBe('10')
  })

  it('refuse une adresse étrangère, un type inconnu, et rend le refus de la Gateway tel quel', async () => {
    const never = vi.fn() as unknown as typeof fetch
    expect((await bridgeToGemini({ url: 'https://evil.com/v.mp4', mimeType: 'video/mp4', token: 't', fetchImpl: never })).status).toBe(400)
    expect((await bridgeToGemini({ url: VIDEO, mimeType: 'text/html', token: 't', fetchImpl: never })).status).toBe(400)
    expect(never).not.toHaveBeenCalled()
    const denied = vi.fn(async (url: string | URL | Request) =>
      String(url) === VIDEO ? new Response(new Uint8Array(4), { status: 200, headers: { 'content-length': '4' } }) : new Response('{}', { status: 401 }),
    ) as unknown as typeof fetch
    expect((await bridgeToGemini({ url: VIDEO, mimeType: 'video/mp4', token: 't', fetchImpl: denied, gatewayUrl: 'https://gw.test', delays: [0] })).status).toBe(401)
  })
})
