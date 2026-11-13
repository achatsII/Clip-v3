/**
 * Fichiers : envoi (URL présignée, sinon envoi direct), transcription, téléversement chez Gemini,
 * traitement vidéo, captures d'images, conversion Word → PDF, page de PDF en image.
 * Specs : skill api-plateforme-ii, références 09 (§2.7.10) et 10 (§2.8).
 */
import { requireAiConsent } from '../ai/consent'
import { APP_DATA_IDENTIFIER, GATEWAY_URL } from '../config'
import { ApiError, GatewayClient } from './client'
import { messages } from '@/lib/i18n'

export interface UploadedFile {
  url: string
  path: string
  sizeBytes: number
  mimeType: string
  name: string
}

export type ProgressFn = (sent: number, total: number) => void

export function folderPath(folder: string) {
  return `${APP_DATA_IDENTIFIER}/${folder}`
}

/**
 * Les en-têtes d'un PUT sur une URL présignée de la Gateway. L'URL signe `Content-Disposition`
 * (sans lui, Spaces répond 400 « Missing one or more required signed header ») et porte l'ACL
 * `public-read`, qui ne s'applique que si elle est aussi envoyée en en-tête (sinon le fichier
 * reste privé et l'IA ne peut pas le lire). Vérifié sur la QA le 2026-11-11.
 */
export function presignedPutHeaders(uploadUrl: string, contentType: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': contentType }
  try {
    const query = new URL(uploadUrl).searchParams
    const signed = (query.get('X-Amz-SignedHeaders') ?? '').toLowerCase().split(';')
    if (signed.includes('content-disposition')) headers['Content-Disposition'] = 'inline'
    const acl = query.get('x-amz-acl')
    if (acl) headers['x-amz-acl'] = acl
  } catch {
    /* URL illisible : le PUT échouera et l'envoi repassera par la Gateway */
  }
  return headers
}

/** L'envoi direct par la Gateway (repli quand le PUT présigné échoue). */
export const DIRECT_UPLOAD_URL = `${GATEWAY_URL}/api/v1/files/upload/direct`

function safeName(name: string) {
  const base = name.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-80) || 'fichier'
}

function xhrSend(
  method: 'PUT' | 'POST',
  url: string,
  body: Blob | FormData,
  headers: Record<string, string>,
  onProgress?: ProgressFn,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))
    if (onProgress) xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded, e.total)
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText })
    xhr.onerror = () => reject(new ApiError(messages().common.errors.uploadNetwork, 0, null, 'network'))
    xhr.ontimeout = () => reject(new ApiError("L'envoi a pris trop de temps", 0, null, 'timeout'))
    xhr.send(body)
  })
}

/** Le premier fichier rendu par `POST /api/v1/files/upload/direct`. */
export function parseDirectUpload(text: string): { url: string; path: string; size?: number; type?: string } {
  let json: { files?: Array<{ url?: string; path?: string; size?: number; type?: string }> } | null = null
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  const f = json?.files?.[0]
  if (!f?.url) throw new ApiError(messages().common.errors.uploadUnconfirmed, 500, json ?? text)
  return { url: f.url, path: f.path ?? '', size: f.size, type: f.type }
}

export interface PresignedTarget {
  uploadUrl: string
  publicUrl: string
  path: string
  contentType: string
}

export function filesApi(client: GatewayClient) {
  async function presign(fileName: string, contentType: string, folder: string): Promise<PresignedTarget> {
    const res = await client.call<{ url?: string; publicUrl?: string; filePath?: string }>(
      '/api/v1/files/upload/generate/presigned-url',
      {
        method: 'POST',
        body: { fileName: safeName(fileName), contentType, path: folderPath(folder), expiresIn: 3600 },
      },
    )
    if (!res.url || !res.publicUrl) throw new ApiError(messages().common.errors.uploadPrepare, 500, res)
    return { uploadUrl: res.url, publicUrl: res.publicUrl, path: res.filePath ?? '', contentType }
  }

  async function uploadDirect(file: Blob, name: string, folder: string, onProgress?: ProgressFn): Promise<UploadedFile> {
    const form = new FormData()
    form.append('files', file, safeName(name))
    form.append('path', folderPath(folder))
    const token = client.source.getToken()
    const { status, text } = await xhrSend('POST', DIRECT_UPLOAD_URL, form, token ? { Authorization: `Bearer ${token}` } : {}, onProgress)
    if (status < 200 || status >= 300) throw new ApiError(messages().common.errors.uploadFailed, status, text)
    const f = parseDirectUpload(text)
    return { url: f.url, path: f.path, sizeBytes: f.size ?? file.size, mimeType: f.type || file.type, name }
  }

  return {
    presign,

    /** Envoie un fichier et rend son URL publique. URL présignée d'abord, envoi direct sinon. */
    async upload(file: Blob, name: string, folder: string, onProgress?: ProgressFn): Promise<UploadedFile> {
      const type = file.type || 'application/octet-stream'
      try {
        const target = await presign(name, type, folder)
        const { status } = await xhrSend('PUT', target.uploadUrl, file, presignedPutHeaders(target.uploadUrl, type), onProgress)
        if (status >= 200 && status < 300) {
          return { url: target.publicUrl, path: target.path, sizeBytes: file.size, mimeType: type, name }
        }
        throw new ApiError(messages().common.errors.uploadRefused, status)
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) throw e
        // CORS du stockage ou URL refusée : on repasse par la Gateway.
        return uploadDirect(file, name, folder, onProgress)
      }
    },

    async transcribe(audio: Blob, fileName: string): Promise<string> {
      await requireAiConsent()
      const form = new FormData()
      form.append('file', audio, safeName(fileName))
      const res = await client.call<{ success?: boolean; text?: string }>('/api/v1/files/audio/transcribe', {
        method: 'POST',
        form,
        timeoutMs: 90_000,
      })
      return (res.text ?? '').trim()
    },

    /** Téléverse chez Gemini un fichier déjà en ligne (≤ 100 Mo). URI valable ~48 h. */
    async geminiUpload(url: string, mimeType: string, sizeBytes: number, filename: string): Promise<{ uri: string; expiresAt: string | null }> {
      await requireAiConsent()
      const res = await client.call<{ results?: Array<{ geminiFileUri?: string; expirationTime?: string }> }>(
        '/api/v1/ai/gemini/upload/direct',
        { method: 'POST', body: { url, mimeType, fileSize: sizeBytes, filename: safeName(filename) }, timeoutMs: 180_000 },
      )
      const r = res.results?.[0]
      if (!r?.geminiFileUri) throw new ApiError(messages().common.errors.videoForAi, 500, res)
      return { uri: r.geminiFileUri, expiresAt: r.expirationTime ?? null }
    },

    /** Réduit une vidéo (720p par défaut) et la normalise en MP4 H.264. Synchrone : peut prendre quelques minutes. */
    async processVideo(url: string, resolution: '720p' | '480p' = '720p'): Promise<{ url: string; sizeBytes: number | null; durationSec: number | null }> {
      const res = await client.call<{ url?: string; metadata?: { processedSize?: number; duration?: number } }>(
        '/api/v1/files/video/process',
        { method: 'POST', body: { url, resolution, preset: 'veryfast', normalize: true }, timeoutMs: 30 * 60_000 },
      )
      if (!res.url) throw new ApiError(messages().common.errors.videoOptimize, 500, res)
      return { url: res.url, sizeBytes: res.metadata?.processedSize ?? null, durationSec: res.metadata?.duration ?? null }
    },

    /**
     * Une vidéo montée à partir d'extraits, dans l'ordre (spec §2.8.15, route au pluriel) : la
     * vidéo des étapes. Synchrone ; `mute` retire le son (une source sans piste son peut faire
     * échouer le montage).
     */
    async composeVideo(segments: Array<{ videoUrl: string; start: number; end: number }>, opts: { mute?: boolean } = {}): Promise<string> {
      const res = await client.call<{ success?: boolean; result?: { url?: string } }>('/api/v1/files/videos/compose', {
        method: 'POST',
        body: { segments: segments.map((s) => ({ videoUrl: s.videoUrl, startTime: s.start, endTime: s.end, ...(opts.mute ? { mute: true } : {}) })), options: { resolution: '720p' } },
        timeoutMs: 15 * 60_000,
      })
      if (!res.result?.url) throw new ApiError(messages().common.errors.videoOptimize, 500, res)
      return res.result.url
    },

    /** Captures d'images d'une vidéo à des instants donnés (secondes). */
    async screenshots(videoUrl: string, shots: Array<{ name: string; atSec: number }>): Promise<Record<string, string>> {
      if (!shots.length) return {}
      const hms = (s: number, tenths: boolean) => {
        const t = Math.max(0, tenths ? Math.round(s * 10) / 10 : Math.round(s))
        const h = Math.floor(t / 3600)
        const m = Math.floor((t % 3600) / 60)
        const sec = t - h * 3600 - m * 60
        const secText = tenths && !Number.isInteger(sec) ? sec.toFixed(1).padStart(4, '0') : String(Math.round(sec)).padStart(2, '0')
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${secText}`
      }
      const call = (tenths: boolean) =>
        client.call<{ results?: Array<{ name?: string; url?: string; uploadSuccess?: boolean }> }>('/api/v1/files/gifs/generate', {
          method: 'POST',
          body: {
            videoUrl,
            timestamps: shots.map((s) => ({ start: hms(s.atSec, tenths), type: 'screenshot', name: s.name })),
            options: { uploadPath: folderPath('frames'), resolution: '720p' },
          },
          timeoutMs: 5 * 60_000,
        })
      const res = await call(true).catch((e) => {
        // Le format HH:MM:SS.s n'est pas garanti par la spec : on retombe sur la seconde ronde.
        if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401) return call(false)
        throw e
      })
      const out: Record<string, string> = {}
      for (const r of res.results ?? []) if (r.name && r.url) out[r.name] = r.url
      return out
    },

    /** Word (DOCX, DOC, ODT) → PDF. La réponse est le PDF lui-même. */
    async convertToPdf(file: Blob, name: string): Promise<Blob> {
      const form = new FormData()
      form.append('file', file, safeName(name))
      return client.call<Blob>('/api/v1/files/document/convert-to-pdf', { method: 'POST', form, expect: 'blob', timeoutMs: 180_000 })
    },

    /** Rend une page d'un PDF déjà en ligne (bucket CLIP) en PNG. */
    async pdfPageImage(documentUrl: string, page: number, dpi = 150): Promise<{ png: Blob; pageCount: number | null }> {
      const res = await client.call<Response>('/api/v1/files/pdf/to-image', {
        method: 'POST',
        body: { documentUrl, page, dpi },
        expect: 'response',
        timeoutMs: 120_000,
      })
      const count = Number(res.headers.get('X-PDF-Page-Count'))
      return { png: await res.blob(), pageCount: Number.isFinite(count) && count > 0 ? count : null }
    },

    async remove(paths: string[]): Promise<void> {
      const list = paths.filter(Boolean).slice(0, 100)
      if (!list.length) return
      await client.call('/api/v1/files/upload', { method: 'DELETE', body: { files: list } }).catch(() => undefined)
    },
  }
}

export type FilesApi = ReturnType<typeof filesApi>
