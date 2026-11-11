import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CapturedMedia } from '@clip/bridge'

const calls: Array<{ type: string; payload: Record<string, unknown> }> = []
let answers: Record<string, unknown[]> = {}

vi.mock('@/lib/bridge/native', () => ({
  callNative: vi.fn(async (type: string, payload: Record<string, unknown>) => {
    calls.push({ type, payload })
    const next = answers[type]?.shift()
    if (next instanceof Error) throw next
    return next ?? {}
  }),
  onNativeEvent: vi.fn(() => () => undefined),
}))

import { presignedPutHeaders } from '@/lib/gateway/files'
import type { FilesApi } from '@/lib/gateway/files'
import { ingestNative } from '@/lib/media/ingest'

// Forme réelle d'une URL présignée de la Gateway (QA, 2026-11-11) : Content-Disposition signé, ACL en paramètre.
const PRESIGNED =
  'https://tor1.digitaloceanspaces.com/ii-file/html/g/clip-v3/captures/video_1.mov?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Expires=3600&X-Amz-Signature=abc&X-Amz-SignedHeaders=content-disposition%3Bhost&x-amz-acl=public-read&x-id=PutObject'

const video: CapturedMedia = {
  localId: 'loc1',
  kind: 'video',
  mimeType: 'video/quicktime',
  fileName: 'video-20261110-230301.mov',
  sizeBytes: 12_000_000,
  width: 720,
  height: 1280,
  durationSec: 42,
}

function fakeFiles(): FilesApi {
  return {
    presign: vi.fn(async () => ({ uploadUrl: PRESIGNED, publicUrl: 'https://cdn.test/public/video_1.mov', path: 'html/g/clip-v3/captures/video_1.mov', contentType: 'video/quicktime' })),
    processVideo: vi.fn(),
    upload: vi.fn(async () => ({ url: 'https://cdn.test/thumb.jpg', path: 't', sizeBytes: 1, mimeType: 'image/jpeg', name: 't' })),
  } as unknown as FilesApi
}

beforeEach(() => {
  calls.length = 0
  answers = {}
})

describe('envoi d’un média de la coquille', () => {
  it('envoie les en-têtes que l’URL présignée signe (sans eux, Spaces répond 400)', () => {
    expect(presignedPutHeaders(PRESIGNED, 'video/quicktime')).toEqual({
      'Content-Type': 'video/quicktime',
      'Content-Disposition': 'inline',
      'x-amz-acl': 'public-read',
    })
    expect(presignedPutHeaders('https://exemple.test/f.jpg?X-Amz-SignedHeaders=host', 'image/jpeg')).toEqual({ 'Content-Type': 'image/jpeg' })
  })

  it('PUT présigné accepté : la source pointe vers le fichier public', async () => {
    answers['upload.put'] = [{ status: 200 }]
    const src = await ingestNative(video, fakeFiles())
    const put = calls.find((c) => c.type === 'upload.put')
    expect(put?.payload.headers).toMatchObject({ 'Content-Disposition': 'inline', 'x-amz-acl': 'public-read' })
    expect(src.url).toBe('https://cdn.test/public/video_1.mov')
    expect(calls.some((c) => c.type === 'upload.multipart')).toBe(false)
  })

  it('PUT refusé : repli par l’envoi direct de la Gateway, au lieu d’afficher « refusé »', async () => {
    answers['upload.put'] = [{ status: 400 }]
    answers['upload.multipart'] = [{ status: 200, bodyText: JSON.stringify({ files: [{ url: 'https://cdn.test/direct/video.mov', path: 'html/g/clip-v3/captures/video.mov' }] }) }]
    const src = await ingestNative(video, fakeFiles())
    const direct = calls.find((c) => c.type === 'upload.multipart')
    expect(direct?.payload).toMatchObject({ fieldName: 'files', fields: { path: 'clip-v3/captures' } })
    expect(String(direct?.payload.url)).toMatch(/\/api\/v1\/files\/upload\/direct$/)
    expect(src.url).toBe('https://cdn.test/direct/video.mov')
  })

  it('les deux chemins refusés : une erreur lisible avec les deux codes', async () => {
    answers['upload.put'] = [{ status: 400 }]
    answers['upload.multipart'] = [{ status: 413, bodyText: '' }]
    await expect(ingestNative(video, fakeFiles())).rejects.toThrow(/400 puis 413/)
  })
})
