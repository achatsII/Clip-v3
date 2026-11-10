import { describe, expect, it, vi } from 'vitest'
import { generationTier, prepareForAi } from '@/lib/ai/generate'
import type { FilesApi } from '@/lib/gateway/files'
import type { Source } from '@/lib/model/types'

const t = new Date().toISOString()
const video = (sec: number, extra: Partial<Source> = {}): Source => ({ id: `v${sec}`, kind: 'video', url: 'https://x/v.mp4', durationSec: sec, sizeBytes: 10_000_000, createdAt: t, ...extra })
const photo = (i: number): Source => ({ id: `p${i}`, kind: 'photo', url: `https://x/${i}.jpg`, createdAt: t })

describe('generationTier', () => {
  it('choisit l’opération selon la taille réelle des sources', () => {
    expect(generationTier([video(120), photo(1)]).op).toBe('generate_s')
    expect(generationTier([video(400)]).op).toBe('generate_m')
    expect(generationTier([video(900)]).op).toBe('generate_l')
    expect(generationTier(Array.from({ length: 30 }, (_, i) => photo(i))).op).toBe('generate_m')
  })
  it('refuse une seule instruction trop longue', () => {
    expect(generationTier([video(2400)]).tooBig).toBe(true)
  })
})

describe('prepareForAi', () => {
  function fakeFiles(): FilesApi {
    return {
      geminiUpload: vi.fn(async () => ({ uri: 'gemini://file', expiresAt: new Date(Date.now() + 40 * 3600_000).toISOString() })),
      processVideo: vi.fn(async () => ({ url: 'https://x/small.mp4', sizeBytes: 20_000_000, durationSec: 60 })),
    } as unknown as FilesApi
  }

  it('téléverse la vidéo chez Gemini, numérote les sources et joint les fichiers dans l’ordre', async () => {
    const files = fakeFiles()
    const r = await prepareForAi([video(60), photo(1), { id: 'n', kind: 'note', text: 'Serrer à 25 N·m', createdAt: t }, { id: 'a', kind: 'audio', url: 'https://x/a.m4a', text: 'Toujours vérifier l’huile', createdAt: t }], files)
    expect(files.geminiUpload).toHaveBeenCalledTimes(1)
    expect(r.askFiles).toHaveLength(2)
    expect(r.askFiles[0].geminiFileUri).toBe('gemini://file')
    expect(r.lines.map((l) => l.id)).toEqual(['S1', 'S2', 'S3', 'S4'])
    expect(r.lines[2].line).toContain('Serrer à 25 N·m')
    expect(r.lines[3].line).toContain('transcription')
  })

  it('réutilise une URI Gemini encore valide', async () => {
    const files = fakeFiles()
    await prepareForAi([video(60, { geminiFileUri: 'gemini://old', geminiExpiresAt: new Date(Date.now() + 20 * 3600_000).toISOString() })], files)
    expect(files.geminiUpload).not.toHaveBeenCalled()
  })

  it('réduit d’abord une vidéo de plus de 100 Mo, et nomme le .mov comme Gemini l’attend', async () => {
    const files = fakeFiles()
    const r = await prepareForAi([video(60, { sizeBytes: 300_000_000, mimeType: 'video/quicktime' })], files)
    expect(files.processVideo).toHaveBeenCalled()
    expect(r.askFiles[0].mimeType).toBe('video/mov')
  })
})
