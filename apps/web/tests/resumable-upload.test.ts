// @vitest-environment node
/**
 * L'envoi par morceaux (TUS) contre une fausse Gateway qui se comporte comme la vraie :
 * `Location` vers l'adresse interne du service (`host.docker.internal`), identifiant avec un `+`
 * (session S3), `X-Public-Url` au dernier morceau ou seulement au statut, session fermée une fois
 * le fichier rangé (404), et une coupure en plein morceau qui laisse arriver une partie des octets.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GatewayClient } from '@/lib/gateway/client'
import { filesApi, setResumableUploads } from '@/lib/gateway/files'
import { CHUNK_BYTES, RESUMABLE_MIN_BYTES, sessionUrl, TUS_URL, tusMetadata, uploadResumable, type ChunkRequest, type ChunkResponse, type ResumableDeps } from '@/lib/gateway/resumable'

const MB = 1024 * 1024

type Failure = 'network' | 500 | { partial: number } | 'ackLost'

class FakeTus {
  sessions = new Map<string, { length: number; data: number; done: boolean; meta: string }>()
  /** Où la Gateway donne l'adresse publique : au dernier morceau, au statut, ou seulement à la création. */
  publicUrlOn: 'lastPatch' | 'status' | 'createOnly' = 'lastPatch'
  /** Une fois le fichier rangé, la session répond 404. */
  closeWhenDone = false
  createStatus = 201
  failures: Failure[] = []
  tokens = new Set(['tok1'])
  received = 0
  creates = 0
  statusCalls = 0

  private id(url: string) {
    return url.slice(TUS_URL.length + 1)
  }

  private allowed(headers: Record<string, string> | undefined) {
    const auth = headers?.Authorization ?? ''
    return this.tokens.has(auth.replace(/^Bearer /, ''))
  }

  fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const headers = (init?.headers ?? {}) as Record<string, string>
    if (!this.allowed(headers)) return new Response(null, { status: 401 })
    if (init?.method === 'POST' && url === TUS_URL) {
      if (this.createStatus !== 201) return new Response(null, { status: this.createStatus })
      this.creates++
      const id = `up${this.creates}+mpXYZ`
      this.sessions.set(id, { length: Number(headers['Upload-Length']), data: 0, done: false, meta: headers['Upload-Metadata'] })
      return new Response(null, {
        status: 201,
        headers: { Location: `http://host.docker.internal:1080/files/${id}`, 'Upload-Offset': '0', 'X-Public-Url': `https://cdn.test/${id}.mp4`, 'X-S3-Key': `html/g/clip-v3/captures/${id}.mp4` },
      })
    }
    if (init?.method === 'GET') {
      this.statusCalls++
      const s = this.sessions.get(this.id(url))
      if (!s || (s.done && this.closeWhenDone)) return new Response(null, { status: 404 })
      const out: Record<string, string> = { 'Upload-Offset': String(s.data), 'Upload-Length': String(s.length) }
      if (s.done && this.publicUrlOn !== 'createOnly') {
        out['X-Public-Url'] = `https://cdn.test/${this.id(url)}.mp4`
        out['X-S3-Key'] = `html/g/clip-v3/captures/${this.id(url)}.mp4`
      }
      return new Response(null, { status: 200, headers: out })
    }
    return new Response(null, { status: 405 })
  }) as typeof fetch

  patch = async (req: ChunkRequest): Promise<ChunkResponse> => {
    const reply = (status: number, headers: Record<string, string> = {}): ChunkResponse => ({ status, header: (n) => headers[n] ?? null })
    if (!this.allowed(req.headers)) return reply(401)
    const id = this.id(req.url)
    const s = this.sessions.get(id)
    if (!s) return reply(404)
    if (Number(req.headers['Upload-Offset']) !== s.data) return reply(409, { 'Upload-Offset': String(s.data) })
    const size = req.body.size
    const failure = this.failures.shift()
    if (failure === 'network') throw new Error('network')
    if (failure === 500) return reply(500)
    if (failure && typeof failure === 'object') {
      s.data += failure.partial
      this.received += failure.partial
      throw new Error('network')
    }
    req.onProgress?.(size)
    s.data += size
    this.received += size
    if (failure === 'ackLost') throw new Error('network')
    const out: Record<string, string> = { 'Upload-Offset': String(s.data) }
    if (s.data >= s.length) {
      s.done = true
      if (this.publicUrlOn === 'lastPatch') {
        out['X-Public-Url'] = `https://cdn.test/${id}.mp4`
        out['X-S3-Key'] = `html/g/clip-v3/captures/${id}.mp4`
      }
    }
    return reply(204, out)
  }
}

function memoryStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), size: () => m.size }
}

const target = { name: 'geste.mp4', type: 'video/mp4', path: 'clip-v3/captures', fingerprint: 'clip-v3/captures|geste.mp4|1' }

function setup(server: FakeTus, extra: Partial<ResumableDeps> = {}) {
  let token = 'tok1'
  const sleeps: number[] = []
  const deps: ResumableDeps = {
    getToken: () => token,
    refresh: vi.fn(async () => {
      token = 'tok2'
      server.tokens.add('tok2')
      return true
    }),
    fetch: server.fetch,
    sendChunk: server.patch,
    storage: null,
    sleep: async (ms) => void sleeps.push(ms),
    isOnline: () => true,
    waitOnline: async () => true,
    ...extra,
  }
  return { deps, sleeps, setToken: (t: string) => (token = t) }
}

const blob = (bytes: number) => new Blob([new Uint8Array(bytes)], { type: 'video/mp4' })

describe('envoi par morceaux (TUS)', () => {
  it('envoie par morceaux de 4 Mo et rend l’adresse publique jointe au dernier morceau', async () => {
    const server = new FakeTus()
    const { deps } = setup(server)
    const progress: number[] = []
    const file = blob(10 * MB)
    const r = await uploadResumable(file, target, deps, { onProgress: (sent) => progress.push(sent) })
    expect(r.url).toBe('https://cdn.test/up1+mpXYZ.mp4')
    expect(r.key).toBe('html/g/clip-v3/captures/up1+mpXYZ.mp4')
    expect(server.received).toBe(file.size)
    expect(progress.at(-1)).toBe(file.size)
    // Les métadonnées en base64 : le nom, le type (sous les deux clés), le dossier.
    const meta = [...server.sessions.values()][0].meta
    expect(meta).toBe(tusMetadata(target))
    expect(meta).toContain(`filename ${btoa('geste.mp4')}`)
    expect(meta).toContain(`path ${btoa('clip-v3/captures')}`)
    expect(CHUNK_BYTES).toBe(4 * MB)
  })

  it('remet l’adresse interne du service sous la Gateway, identifiant tel quel', () => {
    expect(sessionUrl('http://host.docker.internal:1080/files/abc+def')).toBe(`${TUS_URL}/abc+def`)
    expect(sessionUrl('/api/v1/files/upload/multipart/abc123')).toBe(`${TUS_URL}/abc123`)
    expect(sessionUrl('')).toBeNull()
  })

  it('une coupure en plein morceau : reprend où la Gateway en est, sans renvoyer un octet déjà arrivé', async () => {
    const server = new FakeTus()
    server.failures = [{ partial: 0 }, { partial: 1 * MB }, 'ackLost']
    const { deps, sleeps } = setup(server)
    const file = blob(13 * MB)
    const r = await uploadResumable(file, target, deps)
    expect(r.url).toContain('cdn.test')
    expect(server.received).toBe(file.size)
    expect(server.creates).toBe(1)
    // Deux pannes sans progrès : des délais qui grandissent ; après un progrès, le délai repart du début.
    expect(sleeps).toEqual([1000, 2000, 1000])
  })

  it('réseau coupé : attend son retour (et le dit), sans compter d’échec', async () => {
    const server = new FakeTus()
    server.failures = ['network', 'network']
    let online = false
    const waits: boolean[] = []
    const { deps, sleeps } = setup(server, {
      isOnline: () => online,
      waitOnline: async () => {
        online = true
        return true
      },
    })
    // Hors ligne d'abord : la première panne attend le réseau ; la deuxième, en ligne, fait un délai.
    const r = await uploadResumable(blob(6 * MB), target, deps, { onWait: (w) => waits.push(w) })
    expect(r.url).toContain('cdn.test')
    expect(waits).toEqual([true, false])
    expect(sleeps).toEqual([1000])
  })

  it('réseau parti trop longtemps : erreur « offline », puis « Réessayer » reprend sans rien renvoyer', async () => {
    const server = new FakeTus()
    const storage = memoryStorage()
    server.failures = [undefined as never, 'network']
    const first = setup(server, { storage, isOnline: () => false, waitOnline: async () => false })
    const file = blob(9 * MB)
    await expect(uploadResumable(file, target, first.deps)).rejects.toMatchObject({ code: 'offline' })
    const sentBefore = server.received
    expect(sentBefore).toBe(4 * MB)
    expect(storage.size()).toBe(1)

    const second = setup(server, { storage })
    const r = await uploadResumable(file, target, second.deps)
    expect(r.url).toBe('https://cdn.test/up1+mpXYZ.mp4')
    expect(server.creates).toBe(1)
    expect(server.received).toBe(file.size)
    expect(storage.size()).toBe(0)
  })

  it('trop de pannes de suite : erreur « network », la session reste pour « Réessayer »', async () => {
    const server = new FakeTus()
    const storage = memoryStorage()
    server.failures = Array.from({ length: 12 }, () => 500 as const)
    const { deps, sleeps } = setup(server, { storage })
    await expect(uploadResumable(blob(5 * MB), target, deps)).rejects.toMatchObject({ code: 'network' })
    expect(sleeps).toEqual([1000, 2000, 4000, 8000, 15_000, 30_000])
    expect(storage.size()).toBe(1)
  })

  it('session expirée en route : un seul rafraîchissement, et l’envoi continue', async () => {
    const server = new FakeTus()
    const { deps, setToken } = setup(server)
    const file = blob(9 * MB)
    let calls = 0
    const patch = deps.sendChunk!
    deps.sendChunk = async (req) => {
      calls++
      // Après le premier morceau, l'ancien jeton ne passe plus.
      if (calls === 2) {
        server.tokens.delete('tok1')
        setToken('tok1')
      }
      return patch({ ...req, headers: { ...req.headers, Authorization: `Bearer ${deps.getToken()}` } })
    }
    const r = await uploadResumable(file, target, deps)
    expect(r.url).toContain('cdn.test')
    expect(deps.refresh).toHaveBeenCalledTimes(1)
    expect(server.received).toBe(file.size)
  })

  it('session morte (rafraîchissement refusé) : erreur 401, rien d’autre', async () => {
    const server = new FakeTus()
    server.tokens.clear()
    const { deps } = setup(server, { refresh: vi.fn(async () => false) })
    await expect(uploadResumable(blob(5 * MB), target, deps)).rejects.toMatchObject({ status: 401 })
  })

  it('adresse seulement au statut, après le rangement du fichier', async () => {
    const server = new FakeTus()
    server.publicUrlOn = 'status'
    const { deps } = setup(server)
    const r = await uploadResumable(blob(5 * MB), target, deps)
    expect(r.url).toBe('https://cdn.test/up1+mpXYZ.mp4')
    expect(r.key).toBe('html/g/clip-v3/captures/up1+mpXYZ.mp4')
  })

  it('session fermée sans adresse une fois le fichier rangé : l’adresse annoncée à la création', async () => {
    const server = new FakeTus()
    server.publicUrlOn = 'createOnly'
    server.closeWhenDone = true
    const { deps } = setup(server)
    const r = await uploadResumable(blob(5 * MB), target, deps)
    expect(r.url).toBe('https://cdn.test/up1+mpXYZ.mp4')
  })

  it('la session a disparu en route : on recommence une fois, d’une session neuve', async () => {
    const server = new FakeTus()
    const { deps } = setup(server)
    let calls = 0
    const patch = deps.sendChunk!
    deps.sendChunk = async (req) => {
      calls++
      if (calls === 2) server.sessions.clear()
      return patch(req)
    }
    const file = blob(9 * MB)
    const r = await uploadResumable(file, target, deps)
    expect(r.url).toBe('https://cdn.test/up2+mpXYZ.mp4')
    expect(server.creates).toBe(2)
  })

  it('la Gateway refuse ce mode (route absente, morceau refusé) : « tus_unavailable »', async () => {
    const absent = new FakeTus()
    absent.createStatus = 404
    await expect(uploadResumable(blob(5 * MB), target, setup(absent).deps)).rejects.toMatchObject({ code: 'tus_unavailable' })

    const refused = new FakeTus()
    const { deps } = setup(refused)
    deps.sendChunk = async () => ({ status: 413, header: () => null })
    await expect(uploadResumable(blob(5 * MB), target, deps)).rejects.toMatchObject({ code: 'tus_unavailable' })
  })
})

/** Un XMLHttpRequest minimal : la fausse Gateway répond aux PATCH, le stockage aux PUT présignés. */
class FakeXHR {
  static handle: (method: string, url: string, headers: Record<string, string>, body: Blob) => Promise<{ status: number; headers?: Record<string, string>; text?: string } | 'error'>
  method = ''
  url = ''
  headers: Record<string, string> = {}
  status = 0
  responseText = ''
  timeout = 0
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  ontimeout: (() => void) | null = null
  private out: Record<string, string> = {}
  open(method: string, url: string) {
    this.method = method
    this.url = url
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v
  }
  getResponseHeader(name: string) {
    const k = Object.keys(this.out).find((h) => h.toLowerCase() === name.toLowerCase())
    return k ? this.out[k] : null
  }
  send(body: Blob) {
    void FakeXHR.handle(this.method, this.url, this.headers, body).then((r) => {
      if (r === 'error') return this.onerror?.()
      this.status = r.status
      this.responseText = r.text ?? ''
      this.out = r.headers ?? {}
      this.upload.onprogress?.({ lengthComputable: true, loaded: body?.size ?? 0, total: body?.size ?? 0 })
      this.onload?.()
    })
  }
}

function fakeClient(): GatewayClient {
  return {
    call: vi.fn(async (endpoint: string) => {
      if (endpoint === '/api/v1/files/upload/generate/presigned-url') return { url: 'https://spaces.test/put?X-Amz-SignedHeaders=host', publicUrl: 'https://cdn.test/bloc.mp4', filePath: 'html/g/clip-v3/captures/bloc.mp4' }
      throw new Error(`inattendu : ${endpoint}`)
    }),
    source: { getToken: () => 'tok1', refresh: async () => true, onAuthFailure: () => undefined },
  } as unknown as GatewayClient
}

describe('files.upload choisit le bon envoi', () => {
  let server: FakeTus
  let puts: number
  beforeEach(() => {
    server = new FakeTus()
    puts = 0
    FakeXHR.handle = async (method, url, headers, body) => {
      if (method === 'PUT') {
        puts++
        return { status: 200 }
      }
      if (method === 'PATCH') {
        // Le même faux service, par XMLHttpRequest comme dans le navigateur.
        try {
          const r = await server.patch({ url, body, headers })
          const out = Object.fromEntries(['Upload-Offset', 'X-Public-Url', 'X-S3-Key'].map((h) => [h, r.header(h) ?? '']).filter(([, v]) => v))
          return { status: r.status, headers: out }
        } catch {
          return 'error'
        }
      }
      return { status: 405 }
    }
    vi.stubGlobal('XMLHttpRequest', FakeXHR)
    vi.stubGlobal('fetch', server.fetch)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    setResumableUploads(false)
  })

  it('un gros fichier, toggle allumé : par morceaux, l’adresse et la clé de la Gateway', async () => {
    setResumableUploads(true)
    const files = filesApi(fakeClient())
    const file = blob(RESUMABLE_MIN_BYTES + MB)
    const r = await files.upload(file, 'Geste été.mp4', 'captures')
    expect(r.url).toBe('https://cdn.test/up1+mpXYZ.mp4')
    expect(r.path).toBe('html/g/clip-v3/captures/up1+mpXYZ.mp4')
    expect(server.received).toBe(file.size)
    expect(puts).toBe(0)
  })

  it('TUS indisponible : le fichier part d’un bloc, comme avant', async () => {
    setResumableUploads(true)
    server.createStatus = 404
    const files = filesApi(fakeClient())
    const r = await files.upload(blob(RESUMABLE_MIN_BYTES + MB), 'geste.mp4', 'captures')
    expect(r.url).toBe('https://cdn.test/bloc.mp4')
    expect(puts).toBe(1)
  })

  it('toggle éteint, ou petit fichier : un seul envoi, la Gateway TUS n’est pas appelée', async () => {
    const files = filesApi(fakeClient())
    await files.upload(blob(RESUMABLE_MIN_BYTES + MB), 'geste.mp4', 'captures')
    setResumableUploads(true)
    await files.upload(blob(2 * MB), 'photo.jpg', 'captures')
    expect(server.creates).toBe(0)
    expect(puts).toBe(2)
  })
})
