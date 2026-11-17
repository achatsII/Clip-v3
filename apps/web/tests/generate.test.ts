import { describe, expect, it, vi } from 'vitest'
import { generationTier, MAX_SHOTS_FOR_AI, plannedAskFiles, prepareForAi, shotsToAttach } from '@/lib/ai/generate'
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

describe('les images nettes d’un enregistrement d’écran', () => {
  const screen: Source = { id: 'scr', kind: 'video', url: 'https://x/ecran.mp4', screen: true, durationSec: 55, sizeBytes: 8_000_000, createdAt: t }
  const shots = Array.from({ length: 25 }, (_, i): Source => ({ id: `s${i}`, kind: 'photo', url: `https://x/s${i}.jpg`, shot: { sourceId: 'scr', at: 1 + i * 2 }, createdAt: t }))
  const files = () =>
    ({ geminiUpload: vi.fn(async () => ({ uri: 'gemini://ecran', expiresAt: new Date(Date.now() + 40 * 3600_000).toISOString() })) }) as unknown as FilesApi

  it('au plus 6 en fichier, réparties sur l’enregistrement, la première et la dernière comprises', () => {
    const picked = shotsToAttach([screen, ...shots])
    expect(picked.size).toBe(MAX_SHOTS_FOR_AI)
    expect(picked.has('s0')).toBe(true)
    expect(picked.has('s24')).toBe(true)
    expect(shotsToAttach([screen, ...shots.slice(0, 4)]).size).toBe(4)
    // Sans sa vidéo, une image nette n'est pas comptée : elle part en fichier comme une photo.
    expect(shotsToAttach(shots).size).toBe(0)
  })

  it('la vidéo et 6 images partent (7 fichiers, sous la limite de 10) ; toutes restent nommées par leur instant', async () => {
    const r = await prepareForAi([screen, ...shots], files())
    expect(r.askFiles).toHaveLength(1 + MAX_SHOTS_FOR_AI)
    expect(r.lines).toHaveLength(26)
    const kept = r.lines.filter((l) => l.line.includes('pas jointe'))
    expect(kept).toHaveLength(25 - MAX_SHOTS_FOR_AI)
    expect(kept[0].line).toMatch(/image nette de l’écran, à \d+:\d\d de S1/)
  })

  it('le compte d’avance (au serveur au-delà de 10) est celui de prepareForAi, pour chaque sorte de source', async () => {
    const audio: Source = { id: 'a', kind: 'audio', url: 'https://x/a.m4a', createdAt: t }
    const said: Source = { id: 'a2', kind: 'audio', url: 'https://x/a2.m4a', text: 'transcrit', createdAt: t }
    const doc: Source = { id: 'd', kind: 'document', url: 'https://x/d.pdf', createdAt: t }
    const note: Source = { id: 'n', kind: 'note', text: 'note', createdAt: t }
    const orphan: Source = { id: 'o', kind: 'photo', url: 'https://x/o.jpg', shot: { sourceId: 'absente', at: 3 }, createdAt: t }
    for (const set of [[screen, ...shots], [screen, ...shots.slice(0, 3), audio, said, doc, note], [orphan, photo(1), photo(2)], Array.from({ length: 12 }, (_, i) => photo(i))]) {
      const r = await prepareForAi(set, files())
      expect(plannedAskFiles(set)).toBe(r.askFiles.length)
    }
  })
})
